package com.company.project.services;

import com.company.project.dto.StaffRatingResponseDTO;
import com.company.project.dto.StaffRatingSummaryDTO;
import com.company.project.entities.Member;
import com.company.project.entities.StaffRating;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.StaffRatingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Read side of member ratings of staff, for the web Staffs & Trainers page.
 * Transactional so the branch filter scopes everything to the active branch.
 */
@Service
@Transactional(readOnly = true)
public class StaffRatingService {

    private final StaffRatingRepository staffRatingRepository;
    private final MemberRepository memberRepository;

    public StaffRatingService(StaffRatingRepository staffRatingRepository, MemberRepository memberRepository) {
        this.staffRatingRepository = staffRatingRepository;
        this.memberRepository = memberRepository;
    }

    /** One summary per staff member that has at least one rating. */
    public List<StaffRatingSummaryDTO> getSummaries() {
        Map<Long, long[]> countsByStaff = new HashMap<>();
        for (Object[] row : staffRatingRepository.countByStaffAndRating()) {
            Long staffId = (Long) row[0];
            int rating = (Integer) row[1];
            long count = (Long) row[2];
            countsByStaff.computeIfAbsent(staffId, k -> new long[5])[rating - 1] = count;
        }

        List<StaffRatingSummaryDTO> summaries = new ArrayList<>();
        countsByStaff.forEach((staffId, counts) -> {
            long total = 0;
            long sum = 0;
            for (int i = 0; i < 5; i++) {
                total += counts[i];
                sum += counts[i] * (i + 1);
            }
            StaffRatingSummaryDTO dto = new StaffRatingSummaryDTO();
            dto.setStaffId(staffId);
            dto.setRatingCount(total);
            dto.setAverageRating(total == 0 ? 0.0 : Math.round(sum * 10.0 / total) / 10.0);
            dto.setDistribution(Arrays.stream(counts).boxed().collect(Collectors.toList()));
            summaries.add(dto);
        });
        return summaries;
    }

    /** All ratings of one staff member, most recently updated first. */
    public List<StaffRatingResponseDTO> getRatings(Long staffId) {
        List<StaffRating> ratings = staffRatingRepository.findByStaffIdOrderByUpdatedAtDesc(staffId);
        Set<Long> memberIds = ratings.stream().map(StaffRating::getMemberId).collect(Collectors.toSet());
        Map<Long, Member> members = memberRepository.findAllById(memberIds).stream()
                .collect(Collectors.toMap(Member::getId, Function.identity()));

        return ratings.stream().map(r -> {
            StaffRatingResponseDTO dto = new StaffRatingResponseDTO();
            dto.setId(r.getId());
            dto.setStaffId(r.getStaffId());
            dto.setMemberId(r.getMemberId());
            Member member = members.get(r.getMemberId());
            dto.setMemberName(member != null ? member.getName() : "Member");
            dto.setRating(r.getRating());
            dto.setComment(r.getComment());
            dto.setTags(r.getTags());
            dto.setAnonymous(r.isAnonymous());
            dto.setCreatedAt(r.getCreatedAt());
            dto.setUpdatedAt(r.getUpdatedAt());
            return dto;
        }).collect(Collectors.toList());
    }
}
