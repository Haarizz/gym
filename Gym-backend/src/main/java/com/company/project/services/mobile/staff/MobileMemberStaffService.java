package com.company.project.services.mobile.staff;

import com.company.project.dto.CenterTrainerDTO;
import com.company.project.dto.mobile.staff.*;
import com.company.project.entities.Member;
import com.company.project.entities.Staff;
import com.company.project.entities.StaffCertification;
import com.company.project.entities.StaffRating;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.StaffBranchRepository;
import com.company.project.repositories.StaffRatingRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.conversations.ConversationPolicyService;
import com.company.project.services.conversations.ConversationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The member app's Staff & Trainers screens: the active staff of the member's branch,
 * their ratings, and rating them. A member rates each staff member once; rating again
 * replaces it.
 */
@Service
@Transactional(readOnly = true)
public class MobileMemberStaffService {

    private static final int MAX_COMMENT_LENGTH = 300;

    /** "What stood out" keys the app offers. The app translates them; the web shows English labels. */
    private static final Set<String> ALLOWED_TAGS = Set.of(
            // trainers
            "motivating", "knows_form", "punctual", "good_plans", "patient", "fun_sessions",
            // other staff
            "helpful", "quick", "polite", "clear_answers", "friendly", "knowledgeable");

    private final MemberRepository memberRepository;
    private final StaffRepository staffRepository;
    private final StaffBranchRepository staffBranchRepository;
    private final StaffRatingRepository staffRatingRepository;
    private final ConversationService conversationService;

    public MobileMemberStaffService(
            MemberRepository memberRepository,
            StaffRepository staffRepository,
            StaffBranchRepository staffBranchRepository,
            StaffRatingRepository staffRatingRepository,
            ConversationService conversationService) {
        this.memberRepository = memberRepository;
        this.staffRepository = staffRepository;
        this.staffBranchRepository = staffBranchRepository;
        this.staffRatingRepository = staffRatingRepository;
        this.conversationService = conversationService;
    }

    public List<MemberStaffCardDTO> getTeam(UserDetailsImpl principal) {
        Member member = requireMember(principal);
        Long branchId = member.getBranchId();

        Map<Long, long[]> counts = countsByStaff(branchId);
        Map<Long, Integer> myRatings = staffRatingRepository.findByBranchIdAndMemberId(branchId, member.getId()).stream()
                .collect(Collectors.toMap(StaffRating::getStaffId, StaffRating::getRating));

        List<Staff> staff = activeStaff(branchId);
        Map<Long, ConversationPolicyService.Verdict> messaging = conversationService.memberTeamAvailability(member, staff);
        return staff.stream()
                .map(s -> withMessaging(toCard(s, counts.get(s.getId()), myRatings.get(s.getId())), messaging.get(s.getId())))
                .sorted(Comparator.comparing(MemberStaffCardDTO::getName, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());
    }

    /**
     * Public view of a branch's active staff for the center detail screen. Callers must
     * have set the tenant context; no member is required.
     */
    public List<CenterTrainerDTO> getCenterTrainers(Long branchId) {
        Map<Long, long[]> counts = countsByStaff(branchId);
        return activeStaff(branchId).stream()
                .map(s -> {
                    CenterTrainerDTO dto = new CenterTrainerDTO();
                    dto.setId(s.getId());
                    dto.setName(s.getName());
                    dto.setRole(s.getRole());
                    dto.setDepartment(s.getDepartment());
                    dto.setPhotoUrl(s.getPhotoUrl());
                    long[] c = counts.get(s.getId());
                    long total = 0;
                    long sum = 0;
                    if (c != null) {
                        for (int i = 0; i < 5; i++) {
                            total += c[i];
                            sum += c[i] * (i + 1);
                        }
                    }
                    dto.setRatingCount(total);
                    dto.setAverageRating(total == 0 ? null : Math.round(sum * 10.0 / total) / 10.0);
                    return dto;
                })
                .sorted(Comparator.comparing(CenterTrainerDTO::getName, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());
    }

    /** Public-profile extras per active staff member of a branch (for the public join page). */
    public record PublicTrainerExtras(java.time.LocalDate joinDate, List<String> certifications,
                                      List<Long> ratingDistribution, List<String> topTags) {}

    /**
     * Join date, certification names, rating distribution and top review tags for each active
     * staff member of the branch — the same fields the member app's trainer profile shows,
     * minus anything tied to individual reviewers. Caller must have set the tenant context.
     */
    public Map<Long, PublicTrainerExtras> getPublicTrainerExtras(Long branchId) {
        Map<Long, long[]> counts = countsByStaff(branchId);
        Map<Long, PublicTrainerExtras> out = new HashMap<>();
        for (Staff s : activeStaff(branchId)) {
            Map<String, Long> tagCounts = new HashMap<>();
            for (StaffRating r : staffRatingRepository.findByBranchIdAndStaffIdOrderByUpdatedAtDesc(branchId, s.getId())) {
                if (r.getTags() != null) r.getTags().forEach(t -> tagCounts.merge(t, 1L, Long::sum));
            }
            List<String> topTags = tagCounts.entrySet().stream()
                    .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                    .limit(5).map(Map.Entry::getKey).collect(Collectors.toList());
            List<String> certs = s.getCertifications().stream()
                    .map(StaffCertification::getCertName)
                    .filter(n -> n != null && !n.isBlank())
                    .collect(Collectors.toList());
            long[] c = counts.getOrDefault(s.getId(), new long[5]);
            out.put(s.getId(), new PublicTrainerExtras(s.getJoinDate(), certs,
                    Arrays.stream(c).boxed().collect(Collectors.toList()), topTags));
        }
        return out;
    }

    public MemberStaffProfileDTO getProfile(UserDetailsImpl principal, Long staffId) {
        Member member = requireMember(principal);
        Staff staff = requireStaff(member.getBranchId(), staffId);
        MemberStaffProfileDTO dto = buildProfile(member, staff);
        withMessaging(dto.getStaff(), conversationService.memberMessageAvailability(member, staff));
        return dto;
    }

    @Transactional
    public MemberStaffProfileDTO rate(UserDetailsImpl principal, Long staffId, RateStaffRequestDTO request) {
        Member member = requireMember(principal);
        Staff staff = requireStaff(member.getBranchId(), staffId);

        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }
        String comment = request.getComment() == null ? null : request.getComment().trim();
        if (comment != null && comment.length() > MAX_COMMENT_LENGTH) {
            throw new IllegalArgumentException("Review must be at most " + MAX_COMMENT_LENGTH + " characters");
        }
        List<String> tags = request.getTags() == null ? List.of() : request.getTags().stream().distinct().toList();
        if (!ALLOWED_TAGS.containsAll(tags)) {
            throw new IllegalArgumentException("Unknown tag");
        }

        StaffRating rating = staffRatingRepository.findByStaffIdAndMemberId(staff.getId(), member.getId())
                .orElseGet(StaffRating::new);
        rating.setBranchId(member.getBranchId());
        rating.setStaffId(staff.getId());
        rating.setMemberId(member.getId());
        rating.setGlobalUserId(principal.isGlobal() ? principal.getId() : null);
        rating.setRating(request.getRating());
        rating.setTags(new ArrayList<>(tags));
        rating.setComment(comment == null || comment.isEmpty() ? null : comment);
        rating.setAnonymous(request.isAnonymous());
        staffRatingRepository.save(rating);

        MemberStaffProfileDTO dto = buildProfile(member, staff);
        withMessaging(dto.getStaff(), conversationService.memberMessageAvailability(member, staff));
        return dto;
    }

    private MemberStaffProfileDTO buildProfile(Member member, Staff staff) {
        List<StaffRating> ratings = staffRatingRepository
                .findByBranchIdAndStaffIdOrderByUpdatedAtDesc(member.getBranchId(), staff.getId());

        long[] counts = new long[5];
        Map<String, Long> tagCounts = new HashMap<>();
        for (StaffRating r : ratings) {
            counts[r.getRating() - 1]++;
            if (r.getTags() != null) r.getTags().forEach(t -> tagCounts.merge(t, 1L, Long::sum));
        }

        Map<Long, Member> authors = memberRepository.findAllById(
                        ratings.stream().map(StaffRating::getMemberId).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(Member::getId, Function.identity()));

        List<MemberStaffReviewDTO> reviews = ratings.stream()
                .map(r -> toReview(r, authors.get(r.getMemberId()), r.getMemberId().equals(member.getId())))
                .collect(Collectors.toList());

        MemberStaffProfileDTO dto = new MemberStaffProfileDTO();
        dto.setStaff(toCard(staff, counts, reviews.stream().filter(MemberStaffReviewDTO::isMine)
                .map(MemberStaffReviewDTO::getRating).findFirst().orElse(null)));
        dto.setDistribution(Arrays.stream(counts).boxed().collect(Collectors.toList()));
        dto.setTopTags(tagCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (a, b) -> a, LinkedHashMap::new)));
        dto.setReviews(reviews);
        dto.setMyReview(reviews.stream().filter(MemberStaffReviewDTO::isMine).findFirst().orElse(null));
        return dto;
    }

    private static MemberStaffCardDTO withMessaging(MemberStaffCardDTO card, ConversationPolicyService.Verdict verdict) {
        if (verdict == null) return card;
        card.setCanMessage(verdict.allowed());
        card.setMessageUnavailableCode(verdict.code());
        card.setMessageUnavailableReason(verdict.message());
        return card;
    }

    private MemberStaffReviewDTO toReview(StaffRating r, Member author, boolean mine) {
        MemberStaffReviewDTO dto = new MemberStaffReviewDTO();
        dto.setId(r.getId());
        dto.setAnonymous(r.isAnonymous());
        dto.setMine(mine);
        // The member always sees their own name; everyone else gets nothing for anonymous reviews.
        dto.setAuthorName(r.isAnonymous() && !mine ? null : author != null ? author.getName() : null);
        dto.setRating(r.getRating());
        dto.setTags(r.getTags());
        dto.setComment(r.getComment());
        dto.setUpdatedAt(r.getUpdatedAt());
        return dto;
    }

    private MemberStaffCardDTO toCard(Staff staff, long[] counts, Integer myRating) {
        MemberStaffCardDTO dto = new MemberStaffCardDTO();
        dto.setId(staff.getId());
        dto.setName(staff.getName());
        dto.setRole(staff.getRole());
        dto.setDepartment(staff.getDepartment());
        dto.setPhotoUrl(staff.getPhotoUrl());
        dto.setJoinDate(staff.getJoinDate());
        dto.setCertifications(staff.getCertifications().stream()
                .map(StaffCertification::getCertName)
                .filter(n -> n != null && !n.isBlank())
                .collect(Collectors.toList()));
        long total = 0;
        long sum = 0;
        if (counts != null) {
            for (int i = 0; i < 5; i++) {
                total += counts[i];
                sum += counts[i] * (i + 1);
            }
        }
        dto.setRatingCount(total);
        dto.setAverageRating(total == 0 ? null : Math.round(sum * 10.0 / total) / 10.0);
        dto.setMyRating(myRating);
        return dto;
    }

    private Map<Long, long[]> countsByStaff(Long branchId) {
        Map<Long, long[]> counts = new HashMap<>();
        for (Object[] row : staffRatingRepository.countByStaffAndRatingInBranch(branchId)) {
            counts.computeIfAbsent((Long) row[0], k -> new long[5])[(Integer) row[1] - 1] = (Long) row[2];
        }
        return counts;
    }

    private List<Staff> activeStaff(Long branchId) {
        List<Long> ids = staffBranchRepository.findStaffIdsByBranchId(branchId);
        if (ids.isEmpty()) return List.of();
        return staffRepository.findAllById(ids).stream()
                .filter(s -> "active".equalsIgnoreCase(s.getStatus()))
                .collect(Collectors.toList());
    }

    private Staff requireStaff(Long branchId, Long staffId) {
        if (!staffBranchRepository.findStaffIdsByBranchId(branchId).contains(staffId)) {
            throw new EntityNotFoundException("Staff member not found");
        }
        Staff staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new EntityNotFoundException("Staff member not found"));
        if (!"active".equalsIgnoreCase(staff.getStatus())) {
            throw new EntityNotFoundException("Staff member not found");
        }
        return staff;
    }

    private Member requireMember(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }
        Optional<Member> member = principal.isGlobal()
                ? memberRepository.findByGlobalUserId(principal.getId())
                : memberRepository.findByUserId(principal.getId());
        // Stale tokens with IS_GLOBAL_CLAIM=true but no globalUserId record
        if (member.isEmpty() && principal.isGlobal()) {
            member = memberRepository.findByUserId(principal.getId());
        }
        Member m = member.orElseThrow(() -> new EntityNotFoundException("No member profile linked to this user account"));
        if (m.getBranchId() == null) {
            throw new EntityNotFoundException("Member has no branch");
        }
        return m;
    }
}
