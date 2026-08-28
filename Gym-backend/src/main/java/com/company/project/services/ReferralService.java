package com.company.project.services;

import com.company.project.dto.MarkSuccessfulRequestDTO;
import com.company.project.dto.PaginationDTO;
import com.company.project.dto.ReferralPageResponseDTO;
import com.company.project.dto.ReferralRequestDTO;
import com.company.project.dto.ReferralResponseDTO;
import com.company.project.dto.ReferralSettingsDTO;
import com.company.project.dto.ReferralStatsDTO;
import com.company.project.dto.ReferralValidationResponseDTO;
import com.company.project.dto.RewardRuleRequestDTO;
import com.company.project.dto.RewardRuleResponseDTO;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.entities.Referral;
import com.company.project.entities.ReferralRewardRule;
import com.company.project.entities.ReferralSettings;
import com.company.project.repositories.ReferralRepository;
import com.company.project.repositories.ReferralRewardRuleRepository;
import com.company.project.repositories.ReferralSettingsRepository;
import com.company.project.repositories.ReferralRewardRepository;
import com.company.project.repositories.RewardAuditLogRepository;
import com.company.project.entities.ReferralReward;
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

import org.springframework.jdbc.core.JdbcTemplate;

@Service
@Transactional
public class ReferralService {

    private final ReferralRepository referralRepository;
    private final ReferralRewardRuleRepository ruleRepository;
    private final ReferralSettingsRepository settingsRepository;
    private final RewardEngineService rewardEngineService;
    private final ReferralRewardRepository rewardRepository;
    private final RewardAuditLogRepository auditLogRepository;
    private final JdbcTemplate jdbcTemplate;
    private final BranchSettingsResolver branchSettingsResolver;

    public ReferralService(ReferralRepository referralRepository,
                           ReferralRewardRuleRepository ruleRepository,
                           ReferralSettingsRepository settingsRepository,
                           RewardEngineService rewardEngineService,
                           ReferralRewardRepository rewardRepository,
                           RewardAuditLogRepository auditLogRepository,
                           JdbcTemplate jdbcTemplate,
                           BranchSettingsResolver branchSettingsResolver) {
        this.referralRepository = referralRepository;
        this.ruleRepository = ruleRepository;
        this.settingsRepository = settingsRepository;
        this.rewardEngineService = rewardEngineService;
        this.rewardRepository = rewardRepository;
        this.auditLogRepository = auditLogRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.branchSettingsResolver = branchSettingsResolver;
    }

    // ── Settings (one row per branch — each branch can run its own referral ────
    //    program/rules) ──────────────────────────────────────────────────────

    // Not readOnly: loadOrCreateSettings() below saves a fresh row on first access
    // for a branch, which Postgres rejects inside a read-only transaction.
    @Transactional
    public ReferralSettingsDTO getSettings() {
        Long branchId = branchSettingsResolver.resolveForRead();
        ReferralSettings settings = branchId != null ? loadOrCreateSettings(branchId) : new ReferralSettings();
        return ReferralSettingsDTO.fromEntity(settings);
    }

    // The frontend always PUTs the complete settings object (not a partial patch),
    // so every field is applied as-is — including null, which is how maxRewardsPerMember
    // and minPurchaseAmount represent "unlimited"/"no minimum". Null-guarding those
    // two used to make it impossible to clear them back to unlimited once set.
    public ReferralSettingsDTO updateSettings(ReferralSettingsDTO req) {
        Long branchId = branchSettingsResolver.resolveForWrite();
        ReferralSettings s = loadOrCreateSettings(branchId);
        s.setProgramEnabled(req.getProgramEnabled());
        s.setAutoGenerateCodes(req.getAutoGenerateCodes());
        s.setEmailNotifications(req.getEmailNotifications());
        s.setAutoProcessRewards(req.getAutoProcessRewards());
        s.setCodePrefix(req.getCodePrefix());
        s.setLinkDomain(req.getLinkDomain());
        s.setMaxRewardsPerMember(req.getMaxRewardsPerMember());
        s.setExpiryDays(req.getExpiryDays());
        s.setMinPurchaseAmount(req.getMinPurchaseAmount());
        return ReferralSettingsDTO.fromEntity(settingsRepository.save(s));
    }

    /** Read-only lookup used mid-business-logic (e.g. createReferral) — falls back to the default branch in "All Branches" mode. */
    private ReferralSettings loadOrCreateSettings() {
        Long branchId = branchSettingsResolver.resolveForRead();
        return branchId != null ? loadOrCreateSettings(branchId) : new ReferralSettings();
    }

    private ReferralSettings loadOrCreateSettings(Long branchId) {
        return settingsRepository.findByBranchId(branchId).orElseGet(() -> {
            // branchId is set explicitly before save (rather than left for BranchSecurityListener
            // to fill in from BranchContextHolder) because this path also runs for the "All
            // Branches" read-only fallback, where BranchContextHolder's active branch is null but
            // branchId here is already resolved to the default branch.
            ReferralSettings fresh = new ReferralSettings();
            fresh.setBranchId(branchId);
            return settingsRepository.save(fresh);
        });
    }

    // ── Referrals ─────────────────────────────────────────────────────────────

    public ReferralResponseDTO createReferral(ReferralRequestDTO req) {
        ReferralSettings settings = loadOrCreateSettings();
        if (Boolean.FALSE.equals(settings.getProgramEnabled())) {
            throw new IllegalStateException("The referral program is currently disabled. Enable it under Referrals → Settings to log new referrals.");
        }

        Referral ref = new Referral();
        mapRequestToEntity(req, ref);
        ref.setDate(req.getDate() != null ? req.getDate() : LocalDate.now());
        ref.setStatus(req.getStatus() != null ? req.getStatus() : "pending");

        if (Boolean.FALSE.equals(settings.getAutoGenerateCodes()) && req.getReferralCode() != null && !req.getReferralCode().isBlank()) {
            // Manual code entry — used verbatim (still uppercased for consistency with the auto-generated format).
            ref.setReferralCode(req.getReferralCode().trim().toUpperCase());
        } else {
            String prefix = settings.getCodePrefix() != null && !settings.getCodePrefix().isBlank()
                    ? settings.getCodePrefix().trim().toUpperCase()
                    : (req.getReferrerName() != null ? req.getReferrerName().replaceAll("\\s+", "").toUpperCase() : "REF");
            ref.setReferralCode(prefix + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        }

        // Apply rule if provided, otherwise auto-assign an active one
        if (req.getRuleId() != null) {
            ruleRepository.findById(req.getRuleId()).ifPresent(rule -> {
                ref.setRuleId(rule.getId());
                ref.setRuleName(rule.getName());
                if (req.getRewardAmount() == null) {
                    ref.setRewardAmount(rule.getValue());
                }
            });
        } else {
            ruleRepository.findByIsActiveTrue().stream()
                .filter(r -> "referrer".equalsIgnoreCase(r.getEligibility()) || "both".equalsIgnoreCase(r.getEligibility()))
                .findFirst()
                .ifPresent(rule -> {
                    ref.setRuleId(rule.getId());
                    ref.setRuleName(rule.getName());
                    ref.setRewardAmount(rule.getValue());
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
                .orElseThrow(() -> new EntityNotFoundException("Referral not found: " + id));
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
                .orElseThrow(() -> new EntityNotFoundException("Referral not found: " + id)));
    }

    public void deleteReferral(Long id) {
        Referral ref = referralRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Referral not found: " + id));
        
        // Delete associated rewards first to prevent foreign key constraint violations
        List<ReferralReward> rewards = rewardRepository.findByReferralId(id);
        for (ReferralReward r : rewards) {
            auditLogRepository.deleteAll(auditLogRepository.findByRewardIdOrderByCreatedAtDesc(r.getId()));
        }
        rewardRepository.deleteAll(rewards);
        
        referralRepository.delete(ref);
    }

    public ReferralResponseDTO markSuccessful(Long id) {
        return markSuccessful(id, null);
    }

    public ReferralResponseDTO markSuccessful(Long id, MarkSuccessfulRequestDTO req) {
        Referral ref = referralRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Referral not found: " + id));

        if (ref.getRewardAmount() == null || ref.getRewardAmount().compareTo(BigDecimal.ZERO) <= 0) {
            ruleRepository.findByIsActiveTrue().stream()
                .filter(r -> "referrer".equalsIgnoreCase(r.getEligibility()) || "both".equalsIgnoreCase(r.getEligibility()))
                .findFirst()
                .ifPresent(rule -> {
                    ref.setRuleId(rule.getId());
                    ref.setRuleName(rule.getName());
                    ref.setRewardAmount(rule.getValue());
                });
        }

        if (!"pending".equals(ref.getStatus())) {
            // It's already successful or expired, so this is a reused code!
            // Create a new referral for this new signup so the referrer gets another reward
            Referral clone = new Referral();
            clone.setReferrerMemberId(ref.getReferrerMemberId());
            clone.setReferrerName(ref.getReferrerName());
            clone.setRefereeName("Referred Member (Reused Code)");
            clone.setReferralCode(ref.getReferralCode() + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase());
            clone.setStatus("successful");
            clone.setSignupDate(LocalDate.now());
            clone.setRewardAmount(ref.getRewardAmount());
            clone.setRuleId(ref.getRuleId());
            clone.setRuleName(ref.getRuleName());
            clone.setDate(LocalDate.now());
            applyMarkSuccessfulRequest(clone, req);
            clone = referralRepository.save(clone);
            clone.setReferralId("REF-" + String.format("%010d", clone.getId()));
            clone = referralRepository.save(clone);
            rewardEngineService.generateRewardsForReferral(clone);
            return toDTO(clone);
        }

        ref.setStatus("successful");
        ref.setSignupDate(LocalDate.now());
        applyMarkSuccessfulRequest(ref, req);
        Referral saved = referralRepository.save(ref);
        rewardEngineService.generateRewardsForReferral(saved);
        return toDTO(saved);
    }

    private void applyMarkSuccessfulRequest(Referral ref, MarkSuccessfulRequestDTO req) {
        if (req == null) return;
        if (req.getPurchaseAmount() != null) ref.setPurchaseAmount(req.getPurchaseAmount());
        if (req.getMembershipPlanId() != null) ref.setMembershipPlanId(req.getMembershipPlanId());
        if (req.getRefereeMemberId() != null) ref.setRefereeMemberId(req.getRefereeMemberId());
    }

    public ReferralResponseDTO markExpired(Long id) {
        Referral ref = referralRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Referral not found: " + id));
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

    @Transactional
    public String fixRetroactiveRewards() {
        try {
            StringBuilder debug = new StringBuilder();
            debug.append("== DIAGNOSTIC FIX ==\n");
        List<Referral> all = referralRepository.findAll();
        for (Referral ref : all) {
            if (ref.getRewardAmount() == null || ref.getRewardAmount().compareTo(BigDecimal.ZERO) <= 0) {
                ruleRepository.findByIsActiveTrue().stream()
                    .filter(r -> "referrer".equalsIgnoreCase(r.getEligibility()) || "both".equalsIgnoreCase(r.getEligibility()))
                    .findFirst()
                    .ifPresent(rule -> {
                        ref.setRuleId(rule.getId());
                        ref.setRuleName(rule.getName());
                        ref.setRewardAmount(rule.getValue());
                        referralRepository.save(ref);
                    });
            }
            if ("successful".equalsIgnoreCase(ref.getStatus())) {
                List<ReferralReward> existing = rewardRepository.findByReferralId(ref.getId());
                debug.append("Ref ").append(ref.getId()).append(" (Amt: ").append(ref.getRewardAmount()).append(") has ").append(existing.size()).append(" rewards.\n");
                
                debug.append("-> Checking for missing reward generations...\n");
                rewardEngineService.generateRewardsForReferral(ref);
                
                if (ref.getRewardAmount() != null) {
                    for (ReferralReward r : existing) {
                        debug.append("  -> Reward ").append(r.getId()).append(": Value=").append(r.getRewardValue()).append(", Status=").append(r.getStatus()).append("\n");
                        if (r.getRewardValue() != null && r.getRewardValue().compareTo(ref.getRewardAmount()) != 0) {
                            debug.append("    -> UPDATING value to ").append(ref.getRewardAmount()).append("\n");
                            r.setRewardValue(ref.getRewardAmount());
                            rewardRepository.save(r);
                        }
                    }
                }
            }
        }
        
        // Ensure JPA changes are written to the database before native SQL runs
        rewardRepository.flush();
        
        // Fully recalculate wallet balances based on updated rewards
        jdbcTemplate.execute(
            "UPDATE members m SET wallet_balance = (" +
            "  COALESCE((SELECT SUM(reward_value) FROM referral_rewards WHERE member_id = m.member_id AND status = 'REDEEMED' AND reward_type = 'WALLET_CREDIT'), 0) - " +
            "  COALESCE((SELECT SUM(amount) FROM wallet_transactions WHERE member_id = m.member_id AND type = 'DEBIT'), 0) + " +
            "  COALESCE((SELECT SUM(amount) FROM wallet_transactions WHERE member_id = m.member_id AND type = 'CREDIT' AND source_type != 'REFERRAL_REWARD'), 0)" +
            ")"
        );
        
            // Dump member wallet balances
            jdbcTemplate.query("SELECT member_id, wallet_balance FROM members", (rs, rowNum) -> {
                debug.append("Member ").append(rs.getString("member_id")).append(" Wallet: ").append(rs.getBigDecimal("wallet_balance")).append("\n");
                return null;
            });

            return debug.toString();
        } catch (Exception e) {
            StringBuilder sb = new StringBuilder();
            sb.append("ERROR: ").append(e.getMessage()).append("\n");
            for (StackTraceElement el : e.getStackTrace()) {
                sb.append("  ").append(el.toString()).append("\n");
            }
            return sb.toString();
        }
    }

    // ── Reward Rules ───────────────────────────────────────────────────────────

    public RewardRuleResponseDTO createRule(RewardRuleRequestDTO req) {
        ReferralRewardRule rule = new ReferralRewardRule();
        mapRuleRequest(req, rule);
        return toRuleDTO(ruleRepository.save(rule));
    }

    public RewardRuleResponseDTO updateRule(Long id, RewardRuleRequestDTO req) {
        ReferralRewardRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rule not found: " + id));
        mapRuleRequest(req, rule);
        return toRuleDTO(ruleRepository.save(rule));
    }

    public void deleteRule(Long id) {
        ruleRepository.deleteById(id);
    }

    public RewardRuleResponseDTO toggleRule(Long id) {
        ReferralRewardRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rule not found: " + id));
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
        if (req.getRefereePhoto() != null) ref.setRefereePhoto(req.getRefereePhoto());
        if (req.getStatus() != null) ref.setStatus(req.getStatus());
        if (req.getRewardAmount() != null) ref.setRewardAmount(req.getRewardAmount());
        if (req.getDate() != null) ref.setDate(req.getDate());
        if (req.getVisitDate() != null) ref.setVisitDate(req.getVisitDate());
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
        dto.setRefereePhoto(ref.getRefereePhoto());
        dto.setReferralCode(ref.getReferralCode());
        String linkDomain = loadOrCreateSettings().getLinkDomain();
        dto.setReferralLink((linkDomain != null && !linkDomain.isBlank() ? linkDomain : "gymbios.app/ref") + "/" + ref.getReferralCode());
        dto.setStatus(ref.getStatus());
        dto.setRewardAmount(ref.getRewardAmount());
        dto.setDate(ref.getDate());
        dto.setVisitDate(ref.getVisitDate());
        dto.setSignupDate(ref.getSignupDate());
        dto.setPaymentDate(ref.getPaymentDate());
        dto.setNotes(ref.getNotes());
        dto.setRuleId(ref.getRuleId());
        dto.setRuleName(ref.getRuleName());
        dto.setRewardRedeemed(ref.getRewardRedeemed());
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

    // ── Reward redemption (member-addons checkout) ────────────────────────────

    /**
     * The referrer's oldest unredeemed reward from a successful referral, if any
     * — offered as a discount at checkout (e.g. an add-on purchase).
     */
    @Transactional(readOnly = true)
    public ReferralResponseDTO getUnredeemedReward(String referrerMemberId) {
        return referralRepository
                .findByReferrerMemberIdAndStatusAndRewardRedeemedFalseOrderByDateAsc(referrerMemberId, "successful")
                .stream()
                .filter(r -> r.getRewardAmount() != null && r.getRewardAmount().signum() > 0)
                .findFirst()
                .map(this::toDTO)
                .orElse(null);
    }

    public ReferralResponseDTO redeemReward(Long id) {
        Referral ref = referralRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Referral not found: " + id));
        if (Boolean.TRUE.equals(ref.getRewardRedeemed())) {
            throw new IllegalStateException("This referral's reward has already been redeemed");
        }
        ref.setRewardRedeemed(true);
        return toDTO(referralRepository.save(ref));
    }

    // ── Expiry enforcement ────────────────────────────────────────────────────
    // Called by NotificationScheduler. A pending referral whose reward rule
    // carries an expiryDays window (days since the referral was logged) and
    // that window has elapsed without the referee signing up is auto-expired,
    // since ReferralRewardRule.expiryDays was otherwise stored/displayed but
    // never actually enforced.
    public void expirePendingReferralsPastDeadline() {
        LocalDate today = LocalDate.now();
        List<Referral> pending = referralRepository.findByStatus("pending");
        List<Referral> toExpire = new ArrayList<>();
        for (Referral ref : pending) {
            if (ref.getRuleId() == null || ref.getDate() == null) continue;
            ruleRepository.findById(ref.getRuleId()).ifPresent(rule -> {
                if (rule.getExpiryDays() != null
                        && ref.getDate().plusDays(rule.getExpiryDays()).isBefore(today)) {
                    toExpire.add(ref);
                }
            });
        }
        toExpire.forEach(ref -> ref.setStatus("expired"));
        referralRepository.saveAll(toExpire);
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
                .orElseThrow(() -> new EntityNotFoundException("Invalid referral code"));

        // Allow reused codes by not strictly checking for "pending" status here.
        // If it's already successful, markSuccessful() will clone the referral to reward the referrer again.

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

