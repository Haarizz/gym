package com.company.project.services;

import com.company.project.dto.PaginationDTO;
import com.company.project.dto.ReferralPageResponseDTO;
import com.company.project.dto.ReferralRequestDTO;
import com.company.project.dto.ReferralResponseDTO;
import com.company.project.dto.ReferralStatsDTO;
import com.company.project.dto.ReferralValidationResponseDTO;
import com.company.project.dto.RewardRuleRequestDTO;
import com.company.project.dto.RewardRuleResponseDTO;
import com.company.project.entities.Referral;
import com.company.project.entities.ReferralRewardRule;
import com.company.project.repositories.ReferralRepository;
import com.company.project.repositories.ReferralRewardRuleRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class ReferralService {

    private final ReferralRepository referralRepository;
    private final ReferralRewardRuleRepository ruleRepository;

    public ReferralService(ReferralRepository referralRepository,
                           ReferralRewardRuleRepository ruleRepository) {
        this.referralRepository = referralRepository;
        this.ruleRepository = ruleRepository;
    }

    // ── Referrals ─────────────────────────────────────────────────────────────

    public ReferralResponseDTO createReferral(ReferralRequestDTO req) {
        Referral ref = new Referral();
        mapRequestToEntity(req, ref);
        ref.setDate(req.getDate() != null ? req.getDate() : LocalDate.now());
        ref.setStatus(req.getStatus() != null ? req.getStatus() : "pending");

        // Generate unique referral code: first name + random 6 chars
        String baseCode = (req.getReferrerName() != null ? req.getReferrerName().replaceAll("\\s+", "").toUpperCase() : "REF")
                + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        ref.setReferralCode(baseCode);

        // Apply rule if provided
        if (req.getRuleId() != null) {
            ruleRepository.findById(req.getRuleId()).ifPresent(rule -> {
                ref.setRuleId(rule.getId());
                ref.setRuleName(rule.getName());
                if (req.getRewardAmount() == null) {
                    ref.setRewardAmount(rule.getValue());
                }
            });
        }

        Referral saved = referralRepository.save(ref);

        // Generate business ID
        String referralId = "REF-" + String.format("%010d", saved.getId());
        saved.setReferralId(referralId);
        saved = referralRepository.save(saved);

        return toDTO(saved);
    }

    public ReferralResponseDTO updateReferral(Long id, ReferralRequestDTO req) {
        Referral ref = referralRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Referral not found: " + id));
        mapRequestToEntity(req, ref);

        if (req.getRuleId() != null) {
            ruleRepository.findById(req.getRuleId()).ifPresent(rule -> {
                ref.setRuleId(rule.getId());
                ref.setRuleName(rule.getName());
            });
        }

        return toDTO(referralRepository.save(ref));
    }

    public ReferralResponseDTO getById(Long id) {
        return toDTO(referralRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Referral not found: " + id)));
    }

    public void deleteReferral(Long id) {
        Referral ref = referralRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Referral not found: " + id));
        referralRepository.delete(ref);
    }

    public ReferralResponseDTO markSuccessful(Long id) {
        Referral ref = referralRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Referral not found: " + id));
        ref.setStatus("successful");
        ref.setSignupDate(LocalDate.now());
        return toDTO(referralRepository.save(ref));
    }

    public ReferralResponseDTO markExpired(Long id) {
        Referral ref = referralRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Referral not found: " + id));
        ref.setStatus("expired");
        return toDTO(referralRepository.save(ref));
    }

    @Transactional(readOnly = true)
    public ReferralPageResponseDTO getReferrals(int page, int size, String status, String search) {
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("createdAt").descending());

        Specification<Referral> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("referrerName")), like),
                        cb.like(cb.lower(root.get("refereeName")), like),
                        cb.like(cb.lower(root.get("refereeEmail")), like),
                        cb.like(cb.lower(root.get("referralCode")), like),
                        cb.like(cb.lower(root.get("referralId")), like)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Referral> result = referralRepository.findAll(spec, pageable);
        List<ReferralResponseDTO> dtos = result.getContent().stream().map(this::toDTO).collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO();
        pagination.setPage(page);
        pagination.setTotalPages(result.getTotalPages());
        pagination.setTotal(result.getTotalElements());
        pagination.setLimit(size);

        return new ReferralPageResponseDTO(dtos, pagination);
    }

    @Transactional(readOnly = true)
    public ReferralStatsDTO getStats() {
        long total = referralRepository.count();
        long successful = referralRepository.countByStatus("successful");
        long pending = referralRepository.countByStatus("pending");
        long expired = referralRepository.countByStatus("expired");
        BigDecimal totalRewards = referralRepository.sumRewardsEarned();
        long activeRules = ruleRepository.findByIsActiveTrue().size();

        ReferralStatsDTO stats = new ReferralStatsDTO();
        stats.setTotalReferrals(total);
        stats.setSuccessfulReferrals(successful);
        stats.setPendingReferrals(pending);
        stats.setExpiredReferrals(expired);
        stats.setConversionRate(total > 0
                ? BigDecimal.valueOf((double) successful / total * 100).setScale(1, RoundingMode.HALF_UP).doubleValue()
                : 0.0);
        stats.setTotalRewards(totalRewards != null ? totalRewards : BigDecimal.ZERO);
        stats.setActiveRules(activeRules);
        return stats;
    }

    // ── Reward Rules ───────────────────────────────────────────────────────────

    public RewardRuleResponseDTO createRule(RewardRuleRequestDTO req) {
        ReferralRewardRule rule = new ReferralRewardRule();
        mapRuleRequest(req, rule);
        return toRuleDTO(ruleRepository.save(rule));
    }

    public RewardRuleResponseDTO updateRule(Long id, RewardRuleRequestDTO req) {
        ReferralRewardRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rule not found: " + id));
        mapRuleRequest(req, rule);
        return toRuleDTO(ruleRepository.save(rule));
    }

    public void deleteRule(Long id) {
        ruleRepository.deleteById(id);
    }

    public RewardRuleResponseDTO toggleRule(Long id) {
        ReferralRewardRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rule not found: " + id));
        rule.setIsActive(!Boolean.TRUE.equals(rule.getIsActive()));
        return toRuleDTO(ruleRepository.save(rule));
    }

    @Transactional(readOnly = true)
    public List<RewardRuleResponseDTO> getAllRules() {
        return ruleRepository.findAll().stream().map(this::toRuleDTO).collect(Collectors.toList());
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private void mapRequestToEntity(ReferralRequestDTO req, Referral ref) {
        if (req.getReferrerMemberId() != null) ref.setReferrerMemberId(req.getReferrerMemberId());
        if (req.getReferrerName() != null) ref.setReferrerName(req.getReferrerName());
        if (req.getRefereeName() != null) ref.setRefereeName(req.getRefereeName());
        if (req.getRefereeEmail() != null) ref.setRefereeEmail(req.getRefereeEmail());
        if (req.getRefereePhone() != null) ref.setRefereePhone(req.getRefereePhone());
        if (req.getStatus() != null) ref.setStatus(req.getStatus());
        if (req.getRewardAmount() != null) ref.setRewardAmount(req.getRewardAmount());
        if (req.getDate() != null) ref.setDate(req.getDate());
        if (req.getSignupDate() != null) ref.setSignupDate(req.getSignupDate());
        if (req.getPaymentDate() != null) ref.setPaymentDate(req.getPaymentDate());
        if (req.getNotes() != null) ref.setNotes(req.getNotes());
    }

    private void mapRuleRequest(RewardRuleRequestDTO req, ReferralRewardRule rule) {
        if (req.getName() != null) rule.setName(req.getName());
        if (req.getType() != null) rule.setType(req.getType());
        if (req.getValue() != null) rule.setValue(req.getValue());
        if (req.getUnit() != null) rule.setUnit(req.getUnit());
        if (req.getEligibility() != null) rule.setEligibility(req.getEligibility());
        if (req.getConditionTrigger() != null) rule.setConditionTrigger(req.getConditionTrigger());
        if (req.getIsActive() != null) rule.setIsActive(req.getIsActive());
        if (req.getExpiryDays() != null) rule.setExpiryDays(req.getExpiryDays());
    }

    private ReferralResponseDTO toDTO(Referral ref) {
        ReferralResponseDTO dto = new ReferralResponseDTO();
        dto.setId(ref.getId());
        dto.setReferralId(ref.getReferralId());
        dto.setReferrerMemberId(ref.getReferrerMemberId());
        dto.setReferrerName(ref.getReferrerName());
        dto.setRefereeName(ref.getRefereeName());
        dto.setRefereeEmail(ref.getRefereeEmail());
        dto.setRefereePhone(ref.getRefereePhone());
        dto.setReferralCode(ref.getReferralCode());
        dto.setReferralLink("gymbios.app/ref/" + ref.getReferralCode());
        dto.setStatus(ref.getStatus());
        dto.setRewardAmount(ref.getRewardAmount());
        dto.setDate(ref.getDate());
        dto.setSignupDate(ref.getSignupDate());
        dto.setPaymentDate(ref.getPaymentDate());
        dto.setNotes(ref.getNotes());
        dto.setRuleId(ref.getRuleId());
        dto.setRuleName(ref.getRuleName());
        dto.setCreatedAt(ref.getCreatedAt());
        dto.setUpdatedAt(ref.getUpdatedAt());
        return dto;
    }

    private RewardRuleResponseDTO toRuleDTO(ReferralRewardRule rule) {
        RewardRuleResponseDTO dto = new RewardRuleResponseDTO();
        dto.setId(rule.getId());
        dto.setName(rule.getName());
        dto.setType(rule.getType());
        dto.setValue(rule.getValue());
        dto.setUnit(rule.getUnit());
        dto.setEligibility(rule.getEligibility());
        dto.setConditionTrigger(rule.getConditionTrigger());
        dto.setIsActive(rule.getIsActive());
        dto.setExpiryDays(rule.getExpiryDays());
        dto.setCreatedAt(rule.getCreatedAt());
        return dto;
    }

    // ── Referral Code Validation ──────────────────────────────────────────────

    /**
     * Validate a referral code for use during member creation.
     * Checks that the referral exists and is in 'pending' status.
     * Returns the referral details plus active reward rules applicable to the referee (new member).
     */
    @Transactional(readOnly = true)
    public ReferralValidationResponseDTO validateByCode(String code) {
        Referral ref = referralRepository.findByReferralCode(code)
                .orElseThrow(() -> new RuntimeException("Invalid referral code"));

        if (!"pending".equalsIgnoreCase(ref.getStatus())) {
            throw new RuntimeException("Referral code has already been used or expired");
        }

        ReferralResponseDTO referralDto = toDTO(ref);

        // Find active reward rules that apply to the referee (new member) or both
        List<RewardRuleResponseDTO> applicableRules = ruleRepository.findByIsActiveTrue()
                .stream()
                .filter(rule -> "referee".equalsIgnoreCase(rule.getEligibility())
                        || "both".equalsIgnoreCase(rule.getEligibility()))
                .map(this::toRuleDTO)
                .collect(Collectors.toList());

        return new ReferralValidationResponseDTO(referralDto, applicableRules);
    }
}

