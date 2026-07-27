package com.company.project.services;

import com.company.project.automation.AutomationExecutorService;
import com.company.project.dto.FamilyMemberDTO;
import com.company.project.dto.FreezeRequestDTO;
import com.company.project.dto.MemberRequestDTO;
import com.company.project.dto.MemberResponseDTO;
import com.company.project.dto.MembersPageResponseDTO;
import com.company.project.dto.PaginationDTO;
import com.company.project.dto.RenewalRequestDTO;
import com.company.project.services.NotificationService;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipPlan;
import com.company.project.entities.Role;
import com.company.project.entities.User;
import com.company.project.entities.UserRole;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.repositories.RoleRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.repositories.UserRoleRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class MemberService {

    private final MemberRepository memberRepository;
    private final MembershipPlanRepository planRepository;
    private final ReceiptService receiptService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;
    private final AutomationExecutorService automationExecutorService;
    private final ReceiptVoucherService receiptVoucherService;
    private final FinancialEventService financialEventService;

    public MemberService(MemberRepository memberRepository,
                         MembershipPlanRepository planRepository,
                         @Lazy ReceiptService receiptService,
                         UserRepository userRepository,
                         RoleRepository roleRepository,
                         UserRoleRepository userRoleRepository,
                         PasswordEncoder passwordEncoder,
                         NotificationService notificationService,
                         AutomationExecutorService automationExecutorService,
                         ReceiptVoucherService receiptVoucherService,
                         FinancialEventService financialEventService) {
        this.memberRepository          = memberRepository;
        this.planRepository            = planRepository;
        this.receiptService            = receiptService;
        this.userRepository            = userRepository;
        this.roleRepository            = roleRepository;
        this.userRoleRepository        = userRoleRepository;
        this.passwordEncoder           = passwordEncoder;
        this.notificationService       = notificationService;
        this.automationExecutorService = automationExecutorService;
        this.receiptVoucherService     = receiptVoucherService;
        this.financialEventService     = financialEventService;
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public MembersPageResponseDTO getMembers(String search, String status,
                                             String membershipType, String paymentStatus,
                                             int page, int limit) {
        Specification<Member> spec = buildSpec(search, status, membershipType, paymentStatus);
        Pageable pageable = PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Member> memberPage = memberRepository.findAll(spec, pageable);

        List<MemberResponseDTO> dtos = memberPage.getContent().stream()
                .map(MemberResponseDTO::fromEntity)
                .collect(Collectors.toList());

        resolveFamilyHeadNames(dtos);

        PaginationDTO pagination = new PaginationDTO(
                page, limit,
                memberPage.getTotalElements(),
                memberPage.getTotalPages()
        );

        return new MembersPageResponseDTO(dtos, pagination);
    }

    @Transactional(readOnly = true)
    public MemberResponseDTO getMemberByUserId(Long userId) {
        Member member = memberRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Member not found for userId: " + userId));
        return MemberResponseDTO.fromEntity(member);
    }

    @Transactional(readOnly = true)
    public MemberResponseDTO getMemberById(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found with id: " + id));
        MemberResponseDTO dto = MemberResponseDTO.fromEntity(member);
        if (member.getFamilyHeadId() != null) {
            memberRepository.findByMemberId(member.getFamilyHeadId())
                    .ifPresent(head -> dto.setFamilyHeadName(head.getName()));
        }
        return dto;
    }

    // ── Write ───────────────────────────────────────────────────────────────

    public MemberResponseDTO createMember(MemberRequestDTO request) {
        Member member = new Member();
        applyRequest(request, member);
        if (member.getTotalVisits() == null) member.setTotalVisits(0);

        // Determine family head flag
        boolean hasFamily = request.getFamilyMembers() != null && !request.getFamilyMembers().isEmpty();
        boolean isFamilyType = "Family".equalsIgnoreCase(member.getMembershipType())
                || "family".equalsIgnoreCase(member.getMembershipType());
        if (isFamilyType && hasFamily) {
            member.setIsFamilyHead(true);
        } else if (request.getIsFamilyHead() != null) {
            member.setIsFamilyHead(request.getIsFamilyHead());
        }

        // Calculate expiry date from plan duration (overrides any frontend-sent value)
        if (member.getMembershipStartDate() != null && member.getMembershipPlan() != null) {
            planRepository.findByName(member.getMembershipPlan()).ifPresent(plan -> {
                LocalDateTime expiry = computeExpiry(member.getMembershipStartDate(), plan);
                member.setMembershipEndDate(expiry);
                member.setExpiryDate(expiry);
                member.setNextPaymentDate(expiry);
            });
        }

        // Set last payment date when payment is made at registration
        if (member.getLastPaymentDate() == null && "paid".equalsIgnoreCase(member.getPaymentStatus())) {
            member.setLastPaymentDate(LocalDateTime.now());
        }

        // Recalculate outstanding balance: fee - paid amount
        if (member.getOutstandingBalance() == null && member.getMembershipFee() != null) {
            String ps = member.getPaymentStatus();
            if ("paid".equalsIgnoreCase(ps)) {
                member.setOutstandingBalance(BigDecimal.ZERO);
            } else {
                member.setOutstandingBalance(member.getMembershipFee());
            }
        }

        // First save to get the auto-generated DB id
        Member saved = memberRepository.save(member);

        // Generate the business member ID: MBR-XXXXXXXXXX (zero-padded sequential)
        saved.setMemberId("MBR-" + String.format("%010d", saved.getId()));
        saved = memberRepository.save(saved);

        // Auto-create a receipt for the new member
        com.company.project.entities.Receipt receipt = receiptService.createReceiptForMember(
                saved, "New", saved.getPaymentStatus(), request.getPaymentBreakdown());

        // Post to General Ledger — only when payment was actually made
        if ("paid".equalsIgnoreCase(saved.getPaymentStatus()) && saved.getMembershipFee() != null) {
            financialEventService.onMemberPaymentReceived(receipt);
            receiptVoucherService.createVoucherFromModule(
                    "Member Registration – " + saved.getName(),
                    "Membership",
                    saved.getName(),
                    saved.getId(),
                    saved.getMembershipFee(),
                    saved.getPaymentMethodUsed(),
                    saved.getMemberId(),
                    null,
                    "New member: " + saved.getMembershipPlan(),
                    request.getPaymentBreakdown()
            );
        }

        // Create linked family member records
        if (isFamilyType && hasFamily) {
            for (FamilyMemberDTO fm : request.getFamilyMembers()) {
                if (fm.getName() == null || fm.getName().isBlank()) continue;
                createFamilyMemberRecord(fm, saved);
            }
        }

        // Auto-create app login account if credentials were provided
        if (request.getAppUsername() != null && !request.getAppUsername().isBlank()
                && request.getAppPassword() != null && !request.getAppPassword().isBlank()) {
            if (userRepository.existsByUsername(request.getAppUsername())) {
                throw new RuntimeException("Username already taken: " + request.getAppUsername());
            }
            User user = new User();
            user.setUsername(request.getAppUsername());
            user.setEmail(saved.getEmail());
            user.setPasswordHash(passwordEncoder.encode(request.getAppPassword()));
            user.setEnabled(true);
            user.setUserRoles(new java.util.HashSet<>());
            user = userRepository.save(user);

            Role memberRole = roleRepository.findByRoleName("MEMBER")
                    .orElseThrow(() -> new RuntimeException("MEMBER role not found"));
            userRoleRepository.save(new UserRole(null, user, memberRole));

            saved.setUserId(user.getId());
            saved.setAppUsername(request.getAppUsername());
            saved.setAppAccessEnabled(true);
            saved = memberRepository.save(saved);
        }

        notificationService.notifyRoles(
                List.of("ADMIN", "MANAGER"),
                "New Member Joined",
                saved.getName() + " has joined as a new member.",
                "SUCCESS", "MEDIUM", "MEMBERS",
                saved.getId(), "/members",
                "MEMBER_CREATED_" + saved.getId()
        );

        // Fire new_signup automation workflows (event-driven, non-blocking)
        automationExecutorService.handleEvent("new_signup", saved);

        return MemberResponseDTO.fromEntity(saved);
    }

    public MemberResponseDTO setMemberCredentials(Long id, String appUsername, String appPassword) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found: " + id));

        if (member.getUserId() != null) {
            // Already has an account — just update the password
            User user = userRepository.findById(member.getUserId())
                    .orElseThrow(() -> new RuntimeException("Linked user account not found"));
            user.setPasswordHash(passwordEncoder.encode(appPassword));
            userRepository.save(user);
        } else {
            // No account yet — create one
            if (userRepository.existsByUsername(appUsername)) {
                throw new RuntimeException("Username already taken: " + appUsername);
            }
            User user = new User();
            user.setUsername(appUsername);
            user.setEmail(member.getEmail());
            user.setPasswordHash(passwordEncoder.encode(appPassword));
            user.setEnabled(true);
            user.setUserRoles(new java.util.HashSet<>());
            user = userRepository.save(user);

            Role memberRole = roleRepository.findByRoleName("MEMBER")
                    .orElseThrow(() -> new RuntimeException("MEMBER role not found"));
            userRoleRepository.save(new UserRole(null, user, memberRole));

            member.setUserId(user.getId());
            member.setAppUsername(appUsername);
            member.setAppAccessEnabled(true);
            memberRepository.save(member);
        }

        return MemberResponseDTO.fromEntity(memberRepository.findById(id).orElseThrow());
    }

    public MemberResponseDTO toggleMemberAccess(Long id, boolean enabled) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found: " + id));
        if (member.getUserId() == null) {
            throw new RuntimeException("This member has no linked app account");
        }
        User user = userRepository.findById(member.getUserId())
                .orElseThrow(() -> new RuntimeException("Linked user account not found"));
        user.setEnabled(enabled);
        userRepository.save(user);
        member.setAppAccessEnabled(enabled);
        return MemberResponseDTO.fromEntity(memberRepository.save(member));
    }

    /**
     * Create a family member record linked to the given head member.
     * Inherits plan, dates, and financial info from the head.
     */
    private void createFamilyMemberRecord(FamilyMemberDTO fm, Member head) {
        Member dep = new Member();
        dep.setName(fm.getName());
        // Auto-generate a unique placeholder email so the NOT NULL / UNIQUE constraint is satisfied
        String safeEmail = "family_" + head.getMemberId() + "_"
                + fm.getName().trim().toLowerCase().replaceAll("[^a-z0-9]", "_")
                + "_" + System.currentTimeMillis() + "@family.local";
        dep.setEmail(safeEmail);
        dep.setMembershipType(head.getMembershipType());
        dep.setMembershipStatus(head.getMembershipStatus());
        dep.setMembershipPlan(head.getMembershipPlan());
        dep.setMembershipStartDate(head.getMembershipStartDate());
        dep.setMembershipEndDate(head.getMembershipEndDate());
        dep.setExpiryDate(head.getExpiryDate());
        dep.setJoinDate(head.getJoinDate());
        dep.setMonthlyFee(head.getMonthlyFee());
        dep.setMembershipFee(head.getMembershipFee());
        dep.setPaymentStatus(head.getPaymentStatus());
        dep.setTotalVisits(0);
        dep.setIsFamilyHead(false);
        dep.setFamilyHeadId(head.getMemberId());
        dep.setRelationshipToHead(fm.getRelationship());

        Member savedDep = memberRepository.save(dep);
        savedDep.setMemberId("MBR-" + String.format("%010d", savedDep.getId()));
        memberRepository.save(savedDep);
    }

    public MemberResponseDTO updateMember(Long id, MemberRequestDTO request) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found with id: " + id));
        applyRequest(request, member);
        return MemberResponseDTO.fromEntity(memberRepository.save(member));
    }

    public void deleteMember(Long id) {
        if (!memberRepository.existsById(id)) {
            throw new RuntimeException("Member not found with id: " + id);
        }
        memberRepository.deleteById(id);
    }

    public MemberResponseDTO renewMember(Long id, RenewalRequestDTO request) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found with id: " + id));
        if (request.getPlanName()        != null) member.setMembershipPlan(request.getPlanName());
        if (request.getMembershipFee()   != null) member.setMembershipFee(request.getMembershipFee());
        if (request.getPaymentStatus()   != null) member.setPaymentStatus(request.getPaymentStatus());
        if (request.getMembershipType()  != null) member.setMembershipType(request.getMembershipType());
        if (request.getMembershipStatus() != null) member.setMembershipStatus(request.getMembershipStatus());

        // Compute new expiry from plan duration, extending from current expiry (or today)
        if (member.getMembershipPlan() != null) {
            Optional<MembershipPlan> planOpt = planRepository.findByName(member.getMembershipPlan());
            if (planOpt.isPresent()) {
                LocalDateTime base = member.getExpiryDate() != null
                        ? member.getExpiryDate() : LocalDateTime.now();
                LocalDateTime newExpiry = computeExpiry(base, planOpt.get());
                member.setMembershipEndDate(newExpiry);
                member.setExpiryDate(newExpiry);
                member.setNextPaymentDate(newExpiry);
            }
        } else if (request.getMembershipEndDate() != null) {
            // Fallback: use frontend-supplied date if no plan name
            LocalDateTime endDate = parseDateTime(request.getMembershipEndDate());
            member.setMembershipEndDate(endDate);
            member.setExpiryDate(endDate);
            member.setNextPaymentDate(endDate);
        }

        // Record payment date on renewal only when payment was actually made
        boolean renewalPaid = "paid".equalsIgnoreCase(member.getPaymentStatus());
        if (renewalPaid) {
            member.setLastPaymentDate(LocalDateTime.now());
            member.setOutstandingBalance(BigDecimal.ZERO);
        } else if (member.getMembershipFee() != null) {
            member.setOutstandingBalance(member.getMembershipFee());
        }

        Member saved = memberRepository.save(member);

        // Auto-create a receipt for the renewal, reflecting the actual payment status
        com.company.project.entities.Receipt receipt =
                receiptService.createReceiptForMember(saved, "Renewal", saved.getPaymentStatus());

        // Post to General Ledger — only when payment was actually made
        if (renewalPaid && saved.getMembershipFee() != null) {
            financialEventService.onMemberPaymentReceived(receipt);
            receiptVoucherService.createVoucherFromModule(
                    "Membership Renewal – " + saved.getName(),
                    "Membership",
                    saved.getName(),
                    saved.getId(),
                    saved.getMembershipFee(),
                    saved.getPaymentMethodUsed(),
                    saved.getMemberId(),
                    null,
                    "Renewal: " + saved.getMembershipPlan(),
                    null
            );
        }

        return MemberResponseDTO.fromEntity(saved);
    }

    public MemberResponseDTO freezeMember(Long id, FreezeRequestDTO request) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found with id: " + id));
        LocalDateTime freezeUntil = parseDateTime(request.getFreezeUntil());
        member.setMembershipStatus("frozen");
        member.setFreezeStartDate(LocalDateTime.now());
        member.setFreezeEndDate(freezeUntil);
        if (request.getReason() != null) member.setFreezeReason(request.getReason());
        Member saved = memberRepository.save(member);

        notificationService.notifyRoles(
                List.of("ADMIN", "MANAGER"),
                "Membership Frozen",
                saved.getName() + "'s membership has been frozen.",
                "WARNING", "MEDIUM", "MEMBERS",
                saved.getId(), "/members",
                "MEMBER_FROZEN_" + saved.getId()
        );
        if (saved.getUserId() != null) {
            notificationService.notifyUser(
                    saved.getUserId(),
                    "Your Membership is Frozen",
                    "Your membership has been temporarily frozen" +
                    (request.getReason() != null ? ": " + request.getReason() : "."),
                    "WARNING", "MEDIUM", "MEMBERS",
                    saved.getId(), "/member-hub",
                    "MEMBER_FROZEN_USER_" + saved.getId()
            );
        }
        return MemberResponseDTO.fromEntity(saved);
    }

    public MemberResponseDTO unfreezeMember(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found with id: " + id));
        member.setMembershipStatus("active");
        member.setFreezeStartDate(null);
        member.setFreezeEndDate(null);
        member.setFreezeReason(null);
        Member saved = memberRepository.save(member);

        notificationService.notifyRoles(
                List.of("ADMIN", "MANAGER"),
                "Membership Unfrozen",
                saved.getName() + "'s membership has been reactivated.",
                "SUCCESS", "LOW", "MEMBERS",
                saved.getId(), "/members",
                "MEMBER_UNFROZEN_" + saved.getId()
        );
        if (saved.getUserId() != null) {
            notificationService.notifyUser(
                    saved.getUserId(),
                    "Your Membership is Active",
                    "Your membership has been reactivated. Welcome back!",
                    "SUCCESS", "MEDIUM", "MEMBERS",
                    saved.getId(), "/member-hub",
                    "MEMBER_UNFROZEN_USER_" + saved.getId()
            );
        }
        return MemberResponseDTO.fromEntity(saved);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Apply non-null fields from the request DTO onto the entity.
     * Null fields are skipped so partial updates (PUT) work correctly.
     */
    private void applyRequest(MemberRequestDTO r, Member m) {
        if (r.getName()                != null) m.setName(r.getName());
        if (r.getEmail()               != null) m.setEmail(r.getEmail());
        if (r.getPhone()               != null) m.setPhone(r.getPhone());
        if (r.getMembershipType()      != null) m.setMembershipType(r.getMembershipType());
        if (r.getMembershipStatus()    != null) m.setMembershipStatus(r.getMembershipStatus());
        if (r.getMembershipPlan()      != null) m.setMembershipPlan(r.getMembershipPlan());
        if (r.getJoinDate()            != null) m.setJoinDate(parseDateTime(r.getJoinDate()));
        if (r.getMembershipStartDate() != null) m.setMembershipStartDate(parseDateTime(r.getMembershipStartDate()));
        if (r.getMembershipEndDate()   != null) m.setMembershipEndDate(parseDateTime(r.getMembershipEndDate()));
        if (r.getExpiryDate()          != null) m.setExpiryDate(parseDateTime(r.getExpiryDate()));
        if (r.getMonthlyFee()          != null) m.setMonthlyFee(r.getMonthlyFee());
        if (r.getMembershipFee()       != null) m.setMembershipFee(r.getMembershipFee());
        if (r.getTotalVisits()         != null) m.setTotalVisits(r.getTotalVisits());
        if (r.getPaymentStatus()       != null) m.setPaymentStatus(r.getPaymentStatus());
        if (r.getEmergencyContact()    != null) m.setEmergencyContact(r.getEmergencyContact());
        if (r.getEmergencyPhone()      != null) m.setEmergencyPhone(r.getEmergencyPhone());
        if (r.getEmergencyContactName()!= null) m.setEmergencyContactName(r.getEmergencyContactName());
        if (r.getEmergencyContactPhone()!= null) m.setEmergencyContactPhone(r.getEmergencyContactPhone());
        if (r.getDateOfBirth()         != null) m.setDateOfBirth(parseDate(r.getDateOfBirth()));
        if (r.getBloodType()           != null) m.setBloodType(r.getBloodType());
        if (r.getMedicalConditions()   != null) m.setMedicalConditions(r.getMedicalConditions());
        if (r.getAllergies()           != null) m.setAllergies(r.getAllergies());
        if (r.getCurrentMedications()  != null) m.setCurrentMedications(r.getCurrentMedications());
        if (r.getHealthNotes()         != null) m.setHealthNotes(r.getHealthNotes());
        if (r.getGender()              != null) m.setGender(r.getGender());
        if (r.getNationality()         != null) m.setNationality(r.getNationality());
        if (r.getAddress()             != null) m.setAddress(r.getAddress());
        if (r.getPhotoUrl()            != null) m.setPhotoUrl(r.getPhotoUrl());
        if (r.getChronicIllnesses()    != null) m.setChronicIllnesses(r.getChronicIllnesses());
        if (r.getHeight()              != null) m.setHeight(r.getHeight());
        if (r.getWeight()              != null) m.setWeight(r.getWeight());
        if (r.getRegDocNumber()        != null) m.setRegDocNumber(r.getRegDocNumber());
        if (r.getRegDocDate()          != null) m.setRegDocDate(parseDateTime(r.getRegDocDate()));
        if (r.getOutstandingBalance()  != null) m.setOutstandingBalance(r.getOutstandingBalance());
        if (r.getLastPaymentDate()     != null) m.setLastPaymentDate(parseDateTime(r.getLastPaymentDate()));
        if (r.getNextPaymentDate()     != null) m.setNextPaymentDate(parseDateTime(r.getNextPaymentDate()));
        if (r.getPaymentMethodUsed()   != null) m.setPaymentMethodUsed(r.getPaymentMethodUsed());
        if (r.getDiscountApplied()     != null) m.setDiscountApplied(r.getDiscountApplied());
        if (r.getIsFamilyHead()        != null) m.setIsFamilyHead(r.getIsFamilyHead());
        if (r.getFamilyHeadId()        != null) m.setFamilyHeadId(r.getFamilyHeadId());
        if (r.getRelationshipToHead()  != null) m.setRelationshipToHead(r.getRelationshipToHead());
    }

    /**
     * Build a JPA Specification from optional filter parameters.
     * Only non-blank filters are added as predicates.
     */
    private Specification<Member> buildSpec(String search, String status,
                                            String membershipType, String paymentStatus) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("email")), pattern),
                        cb.like(cb.lower(root.get("phone")), pattern),
                        cb.like(cb.lower(root.get("memberId")), pattern)
                ));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("membershipStatus"), status));
            }
            if (membershipType != null && !membershipType.isBlank()) {
                predicates.add(cb.equal(root.get("membershipType"), membershipType));
            }
            if (paymentStatus != null && !paymentStatus.isBlank()) {
                predicates.add(cb.equal(root.get("paymentStatus"), paymentStatus));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    // ── Expiry computation ──────────────────────────────────────────────────

    private LocalDateTime computeExpiry(LocalDateTime startDate, MembershipPlan plan) {
        if (plan.getDurationValue() == null || plan.getDurationType() == null) return startDate;
        try {
            long val = Long.parseLong(plan.getDurationValue());
            switch (plan.getDurationType().toLowerCase()) {
                case "monthly":
                case "months":   return startDate.plusMonths(val);
                case "annual":
                case "annually":
                case "years":    return startDate.plusYears(val);
                case "weekly":
                case "weeks":    return startDate.plusWeeks(val);
                case "quarterly": return startDate.plusMonths(val * 3);
                default:         return startDate.plusDays(val);
            }
        } catch (NumberFormatException e) {
            return startDate;
        }
    }

    // ── Family head name resolution ─────────────────────────────────────────

    private void resolveFamilyHeadNames(List<MemberResponseDTO> dtos) {
        List<String> headIds = dtos.stream()
                .map(MemberResponseDTO::getFamilyHeadId)
                .filter(id -> id != null && !id.isBlank())
                .distinct()
                .collect(Collectors.toList());
        if (headIds.isEmpty()) return;
        Map<String, String> idToName = memberRepository.findAllByMemberIdIn(headIds).stream()
                .collect(Collectors.toMap(Member::getMemberId, Member::getName));
        dtos.forEach(dto -> {
            if (dto.getFamilyHeadId() != null) {
                dto.setFamilyHeadName(idToName.get(dto.getFamilyHeadId()));
            }
        });
    }

    // ── Date parsers ────────────────────────────────────────────────────────

    private LocalDateTime parseDateTime(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            // Remove trailing Z and parse as local date-time
            String normalized = raw.endsWith("Z") ? raw.substring(0, raw.length() - 1) : raw;
            return LocalDateTime.parse(normalized, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (DateTimeParseException e) {
            // Try date-only format "YYYY-MM-DD"
            try {
                return LocalDate.parse(raw.substring(0, 10)).atStartOfDay();
            } catch (DateTimeParseException ignored) {
                return null;
            }
        }
    }

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return LocalDate.parse(raw.substring(0, 10));
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }
}
