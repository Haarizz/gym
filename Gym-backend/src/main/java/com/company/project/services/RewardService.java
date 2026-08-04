package com.company.project.services;

import com.company.project.dto.PaginationDTO;
import com.company.project.dto.ReferralRewardResponseDTO;
import com.company.project.dto.RewardAuditLogResponseDTO;
import com.company.project.dto.RewardStatsDTO;
import com.company.project.entities.Coupon;
import com.company.project.entities.ReferralReward;
import com.company.project.enums.RewardStatus;
import com.company.project.enums.RewardType;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.CouponRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReferralRewardRepository;
import com.company.project.repositories.RewardAuditLogRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Backing service for RewardController — read/filter access plus the thin
 * dispatch layer over RewardEngineService/RewardRedemptionService. No reward
 * business logic lives here beyond DTO shaping and filtering.
 */
@Service
@Transactional
public class RewardService {

    private final ReferralRewardRepository rewardRepository;
    private final RewardAuditLogRepository auditLogRepository;
    private final CouponRepository couponRepository;
    private final MemberRepository memberRepository;
    private final RewardRedemptionService redemptionService;

    public RewardService(ReferralRewardRepository rewardRepository,
                          RewardAuditLogRepository auditLogRepository,
                          CouponRepository couponRepository,
                          MemberRepository memberRepository,
                          RewardRedemptionService redemptionService) {
        this.rewardRepository = rewardRepository;
        this.auditLogRepository = auditLogRepository;
        this.couponRepository = couponRepository;
        this.memberRepository = memberRepository;
        this.redemptionService = redemptionService;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getRewards(int page, int size, String status, String rewardType,
                                           String memberId, String search) {
        Pageable pageable = PageRequest.of(Math.max(page - 1, 0), size, Sort.by("generatedDate").descending());

        Specification<ReferralReward> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), RewardStatus.valueOf(status.toUpperCase())));
            }
            if (rewardType != null && !rewardType.isBlank()) {
                predicates.add(cb.equal(root.get("rewardType"), RewardType.valueOf(rewardType.toUpperCase())));
            }
            if (memberId != null && !memberId.isBlank()) {
                predicates.add(cb.equal(root.get("memberId"), memberId));
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("rewardCode")), like),
                        cb.like(cb.lower(root.get("memberId")), like),
                        cb.like(cb.lower(root.get("rewardName")), like)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<ReferralReward> result = rewardRepository.findAll(spec, pageable);
        List<ReferralRewardResponseDTO> dtos = result.getContent().stream()
                .map(this::toDTO).collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO();
        pagination.setPage(page);
        pagination.setTotalPages(result.getTotalPages());
        pagination.setTotal(result.getTotalElements());
        pagination.setLimit(size);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("rewards", dtos);
        response.put("pagination", pagination);
        return response;
    }

    @Transactional(readOnly = true)
    public ReferralRewardResponseDTO getById(Long id) {
        return toDTO(rewardRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Reward not found: " + id)));
    }

    @Transactional(readOnly = true)
    public List<ReferralRewardResponseDTO> getByMember(String memberId) {
        return rewardRepository.findByMemberIdOrderByGeneratedDateDesc(memberId).stream()
                .map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RewardAuditLogResponseDTO> getAuditTrail(Long rewardId) {
        return auditLogRepository.findByRewardIdOrderByCreatedAtDesc(rewardId).stream()
                .map(RewardAuditLogResponseDTO::fromEntity).collect(Collectors.toList());
    }

    public ReferralRewardResponseDTO claim(Long id) {
        return toDTO(redemptionService.claim(id));
    }

    public ReferralRewardResponseDTO redeem(Long id) {
        return toDTO(redemptionService.redeem(id));
    }

    public ReferralRewardResponseDTO approve(Long id, String remarks) {
        return toDTO(redemptionService.approve(id, remarks));
    }

    public ReferralRewardResponseDTO reject(Long id, String remarks) {
        return toDTO(redemptionService.reject(id, remarks));
    }

    public ReferralRewardResponseDTO cancel(Long id, String remarks) {
        return toDTO(redemptionService.cancel(id, remarks));
    }

    @Transactional(readOnly = true)
    public RewardStatsDTO getStats() {
        List<ReferralReward> all = rewardRepository.findAll();

        RewardStatsDTO stats = new RewardStatsDTO();
        stats.setTotalGenerated(all.size());
        stats.setAvailable(all.stream().filter(r -> r.getStatus() == RewardStatus.AVAILABLE).count());
        stats.setPendingApproval(all.stream().filter(r -> r.getStatus() == RewardStatus.PENDING).count());
        stats.setRedeemed(all.stream().filter(r -> r.getStatus() == RewardStatus.REDEEMED).count());
        stats.setExpired(all.stream().filter(r -> r.getStatus() == RewardStatus.EXPIRED).count());
        stats.setCancelled(all.stream().filter(r -> r.getStatus() == RewardStatus.CANCELLED).count());

        BigDecimal walletIssued = all.stream()
                .filter(r -> r.getRewardType() == RewardType.WALLET_CREDIT && r.getStatus() == RewardStatus.REDEEMED)
                .map(r -> r.getRewardValue() != null ? r.getRewardValue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.setWalletCreditsIssued(walletIssued);

        stats.setCouponsUsed(couponRepository.findAll().stream()
                .filter(c -> "USED".equals(c.getStatus())).count());

        Map<RewardType, Long> byType = all.stream()
                .filter(r -> r.getRewardType() != null)
                .collect(Collectors.groupingBy(ReferralReward::getRewardType, Collectors.counting()));
        stats.setTopRewardType(byType.entrySet().stream()
                .max(Comparator.comparingLong(Map.Entry::getValue))
                .map(e -> e.getKey().name()).orElse(null));
        stats.setRewardTypeDistribution(byType.entrySet().stream()
                .collect(Collectors.toMap(e -> e.getKey().name(), Map.Entry::getValue, (a, b) -> a, LinkedHashMap::new)));

        Map<String, Long> byReferrer = all.stream()
                .filter(r -> r.getMemberType() == com.company.project.enums.RewardMemberType.REFERRER)
                .collect(Collectors.groupingBy(ReferralReward::getMemberId, Collectors.counting()));
        stats.setMostActiveReferrer(byReferrer.entrySet().stream()
                .max(Comparator.comparingLong(Map.Entry::getValue))
                .map(Map.Entry::getKey).orElse(null));

        stats.setHighestRewardEarned(all.stream()
                .map(r -> r.getRewardValue() != null ? r.getRewardValue() : BigDecimal.ZERO)
                .max(BigDecimal::compareTo).orElse(BigDecimal.ZERO));

        DateTimeFormatter monthFmt = DateTimeFormatter.ofPattern("yyyy-MM");
        Map<String, Long> monthly = all.stream()
                .filter(r -> r.getGeneratedDate() != null)
                .collect(Collectors.groupingBy(r -> r.getGeneratedDate().format(monthFmt), Collectors.counting()));
        stats.setMonthlyRewards(monthly.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> new RewardStatsDTO.MonthlyCount(e.getKey(), e.getValue()))
                .collect(Collectors.toList()));

        return stats;
    }

    private ReferralRewardResponseDTO toDTO(ReferralReward reward) {
        ReferralRewardResponseDTO dto = ReferralRewardResponseDTO.fromEntity(reward);
        if (reward.getRewardType() == RewardType.COUPON) {
            couponRepository.findByRewardId(reward.getId())
                    .map(Coupon::getCode)
                    .ifPresent(dto::setCouponCode);
        }
        return dto;
    }
}
