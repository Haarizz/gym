package com.company.project.services.mobile.referrals;

import com.company.project.dto.ReferralRequestDTO;
import com.company.project.dto.ReferralResponseDTO;
import com.company.project.entities.Member;
import com.company.project.entities.MobileReferralAttribution;
import com.company.project.entities.MobileReferralStatus;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.mobile.referrals.MobileReferralAttributionRepository;
import com.company.project.security.BranchContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import com.company.project.services.ReferralService;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Optional;

@Service
public class MobileReferralResolutionService {

    private static final Logger log = LoggerFactory.getLogger(MobileReferralResolutionService.class);

    private final MemberRepository memberRepository;
    private final MobileReferralAttributionRepository attributionRepository;
    private final ReferralService referralService;

    public MobileReferralResolutionService(MemberRepository memberRepository,
                                           MobileReferralAttributionRepository attributionRepository,
                                           ReferralService referralService) {
        this.memberRepository = memberRepository;
        this.attributionRepository = attributionRepository;
        this.referralService = referralService;
    }

    /**
     * Finds a global mobile user's Member row anywhere in the current tenant.
     * Deliberately does NOT go through UserBranchRepository/user_branches —
     * that table is only populated for legacy local-login accounts (see
     * MemberService's appUsername/appPassword branch), so it's always empty for
     * a mobile-only member and made every referral conversion for such a member
     * fail with "not found in any branch". Instead this clears
     * BranchContextHolder for the lookup so BranchFilterAspect leaves the
     * Hibernate branch filter disabled and the query searches the whole tenant
     * DB directly — Member.globalUserId is unique per tenant (purchaseMembership
     * 409s on a duplicate), so at most one row can match.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public Member findMemberByGlobalUserId(Long globalUserId) {
        Long previousBranchId = BranchContextHolder.getActiveBranchId();
        try {
            BranchContextHolder.clear();
            return memberRepository.findByGlobalUserId(globalUserId).orElse(null);
        } finally {
            if (previousBranchId != null) {
                BranchContextHolder.setActiveBranchId(previousBranchId);
            }
        }
    }

    /**
     * Best-effort: creates the legacy Referral (status "pending") right when the referee claims
     * the referrer's code, and immediately fires any SIGNUP-triggered rule for it — so a
     * referrer-eligible, "On Signup" rule pays out without waiting for the referee to ever
     * purchase a membership. Runs in its own transaction (REQUIRES_NEW) and swallows every
     * failure, returning null: the referee's code claim (the caller) must always succeed
     * regardless of whether the referrer is resolvable yet or the referral program is enabled
     * for their branch — a Postgres transaction aborts entirely on the first DB-level error, so
     * this can't safely share a transaction with the attribution save.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Long createSignupReferral(Long referrerGlobalUserId, Long refereeGlobalUserId) {
        try {
            Member referrerMember = findMemberByGlobalUserId(referrerGlobalUserId);
            if (referrerMember == null) {
                return null; // referrer isn't a Member anywhere yet — nothing to reward against
            }

            Long previousBranchId = BranchContextHolder.getActiveBranchId();
            try {
                BranchContextHolder.setActiveBranchId(referrerMember.getBranchId());

                ReferralRequestDTO req = new ReferralRequestDTO();
                req.setReferrerMemberId(referrerMember.getMemberId());
                req.setReferrerName(referrerMember.getName());
                req.setStatus("pending");
                req.setDate(LocalDate.now());
                req.setNotes("Created at mobile referral code claim");

                ReferralResponseDTO created = referralService.createReferral(req);
                referralService.generateSignupRewards(created.getId());
                return created.getId();
            } finally {
                if (previousBranchId != null) {
                    BranchContextHolder.setActiveBranchId(previousBranchId);
                } else {
                    BranchContextHolder.clear();
                }
            }
        } catch (Exception e) {
            log.warn("Signup-time referral creation failed for referrer {} / referee {}: {}",
                    referrerGlobalUserId, refereeGlobalUserId, e.getMessage());
            return null;
        }
    }

    @Transactional
    public void convertReferral(Long refereeGlobalUserId, Member newMember) {
        // Lock the pending attribution
        Optional<MobileReferralAttribution> attrOpt = attributionRepository
                .findByRefereeGlobalUserIdAndStatusForUpdate(refereeGlobalUserId, MobileReferralStatus.PENDING);

        if (attrOpt.isEmpty()) {
            return; // Already processed or doesn't exist
        }

        convertAttribution(attrOpt.get(), newMember);
    }

    /**
     * Re-attempts conversion for every attribution still stuck at PENDING in the
     * current tenant — e.g. ones that failed earlier due to the tenant/branch
     * context bug in the real-time post-purchase path. Safe to run repeatedly:
     * each attribution is re-locked with findByRefereeGlobalUserIdAndStatusForUpdate
     * immediately before conversion, so one already converted (by the real-time
     * path or a previous retry) is skipped rather than double-converted.
     */
    @Transactional
    public String retryPendingAttributions() {
        java.util.List<MobileReferralAttribution> pending = attributionRepository.findByStatus(MobileReferralStatus.PENDING);

        int converted = 0;
        int skipped = 0;
        int failed = 0;

        for (MobileReferralAttribution attribution : pending) {
            Long refereeGlobalUserId = attribution.getRefereeGlobalUserId();
            Member refereeMember = findMemberByGlobalUserId(refereeGlobalUserId);

            if (refereeMember == null) {
                skipped++; // referee hasn't completed a purchase yet — leave PENDING
                continue;
            }

            try {
                Optional<MobileReferralAttribution> locked = attributionRepository
                        .findByRefereeGlobalUserIdAndStatusForUpdate(refereeGlobalUserId, MobileReferralStatus.PENDING);
                if (locked.isEmpty()) {
                    skipped++; // converted already by another path since the list was loaded
                    continue;
                }
                convertAttribution(locked.get(), refereeMember);
                converted++;
            } catch (Exception e) {
                failed++;
                System.err.println("Retry conversion failed for referee " + refereeGlobalUserId + ": " + e.getMessage());
            }
        }

        return String.format(
                "Retried %d pending referral(s): %d converted, %d skipped (referee not yet a member), %d failed",
                pending.size(), converted, skipped, failed);
    }

    /**
     * Self-service retry, triggered by the referee themselves from the mobile
     * app's Referrals screen for their own stuck PENDING claim. Unlike
     * {@link #retryPendingAttributions()} this runs inside a normal mobile
     * request, where TenantContextHolder is already set correctly by
     * TenantContextFilter — no tenant juggling needed here.
     */
    @Transactional
    public MobileReferralStatus retryForReferee(Long refereeGlobalUserId) {
        MobileReferralAttribution current = attributionRepository.findByRefereeGlobalUserId(refereeGlobalUserId)
                .orElseThrow(() -> new IllegalStateException("You haven't claimed a referral code"));

        if (current.getStatus() != MobileReferralStatus.PENDING) {
            return current.getStatus();
        }

        // The caller reaching this endpoint at all means TenantContextFilter already
        // found their Member row in the current tenant, so this should always resolve.
        Member refereeMember = findMemberByGlobalUserId(refereeGlobalUserId);

        if (refereeMember == null) {
            throw new IllegalStateException("Complete your membership purchase before retrying");
        }

        Optional<MobileReferralAttribution> locked = attributionRepository
                .findByRefereeGlobalUserIdAndStatusForUpdate(refereeGlobalUserId, MobileReferralStatus.PENDING);
        if (locked.isEmpty()) {
            // Converted (or otherwise resolved) by another path between the two reads above.
            return attributionRepository.findByRefereeGlobalUserId(refereeGlobalUserId)
                    .map(MobileReferralAttribution::getStatus)
                    .orElse(MobileReferralStatus.SUCCESSFUL);
        }

        convertAttribution(locked.get(), refereeMember);
        return MobileReferralStatus.SUCCESSFUL;
    }

    private void convertAttribution(MobileReferralAttribution attribution, Member refereeMember) {
        Long referrerGlobalUserId = attribution.getReferrerGlobalUserId();

        Member referrerMember = findMemberByGlobalUserId(referrerGlobalUserId);

        if (referrerMember == null) {
            // Cannot resolve referrer, mark INVALID or just abort and leave PENDING for retry?
            // Let's leave it PENDING for retry in case it's a temporary issue.
            throw new IllegalStateException("Referrer member not found in any branch");
        }

        // Create/update the legacy referral in the referrer's branch — BranchSecurityListener
        // requires an active branch to persist a BranchAware entity, so it must be set here for
        // the create/update/markSuccessful calls below.
        Long previousBranchId = BranchContextHolder.getActiveBranchId();
        try {
            BranchContextHolder.setActiveBranchId(referrerMember.getBranchId());

            Long legacyReferralId;
            if (attribution.getLegacyReferralId() != null) {
                // Referral row already exists — created at claim time by createSignupReferral(),
                // so any SIGNUP-triggered reward has already fired. Just fill in the referee's
                // now-known details (unknown until now) and proceed to mark it successful below.
                ReferralRequestDTO updateReq = new ReferralRequestDTO();
                updateReq.setRefereeName(refereeMember.getName());
                updateReq.setRefereeEmail(refereeMember.getEmail());
                updateReq.setRefereePhone(refereeMember.getPhone());
                updateReq.setSignupDate(refereeMember.getJoinDate() != null ? refereeMember.getJoinDate().toLocalDate() : LocalDate.now());
                referralService.updateReferral(attribution.getLegacyReferralId(), updateReq);
                legacyReferralId = attribution.getLegacyReferralId();
            } else {
                // Attribution predates claim-time creation, or that best-effort creation was
                // skipped/failed — fall back to the original create-then-mark-successful flow.
                ReferralRequestDTO req = new ReferralRequestDTO();
                req.setReferrerMemberId(referrerMember.getMemberId());
                req.setReferrerName(referrerMember.getName());
                req.setRefereeName(refereeMember.getName());
                req.setRefereeEmail(refereeMember.getEmail());
                req.setRefereePhone(refereeMember.getPhone());
                req.setStatus("pending"); // The create service expects "pending" initially
                req.setDate(LocalDate.now());
                req.setSignupDate(refereeMember.getJoinDate() != null ? refereeMember.getJoinDate().toLocalDate() : LocalDate.now());
                req.setNotes("Converted automatically via Mobile App");
                legacyReferralId = referralService.createReferral(req).getId();
            }

            // Mark successful — fires any PAYMENT-triggered rule; a SIGNUP-triggered reward
            // already generated at claim time is skipped here by the duplicate-reward guard.
            ReferralResponseDTO legacyReferral = referralService.markSuccessful(legacyReferralId);

            // Update attribution
            attribution.setStatus(MobileReferralStatus.SUCCESSFUL);
            attribution.setLegacyReferralId(legacyReferral.getId());
            attributionRepository.save(attribution);
        } finally {
            if (previousBranchId != null) {
                BranchContextHolder.setActiveBranchId(previousBranchId);
            } else {
                BranchContextHolder.clear();
            }
        }
    }
}
