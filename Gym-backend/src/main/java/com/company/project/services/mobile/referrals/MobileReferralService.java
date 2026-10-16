package com.company.project.services.mobile.referrals;

import com.company.project.dto.MyReferralClaimDTO;
import com.company.project.entities.Member;
import com.company.project.entities.MobileReferralAttribution;
import com.company.project.entities.MobileReferralProfile;
import com.company.project.entities.MobileReferralStatus;
import com.company.project.entities.UserProfile;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.mobile.referrals.MobileReferralAttributionRepository;
import com.company.project.repositories.mobile.referrals.MobileReferralProfileRepository;
import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.security.TenantContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import com.company.project.services.GlobalUserService;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class MobileReferralService {

    private static final Logger log = LoggerFactory.getLogger(MobileReferralService.class);

    private final MobileReferralProfileRepository profileRepository;
    private final MobileReferralAttributionRepository attributionRepository;
    private final TenantDataSourceRegistry tenantDataSourceRegistry;
    private final TenantRepository tenantRepository;
    private final GlobalUserService globalUserService;
    private final MobileReferralResolutionService resolutionService;
    private final MemberRepository memberRepository;

    // With routing on, each gym has its own database and a request with no tenant means
    // "not in any gym"; with routing off everything lives in one database.
    @Value("${tenant.routing.enabled:false}")
    private boolean tenantRoutingEnabled;

    private static final String ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    private static final int CODE_LENGTH = 8;
    private final SecureRandom secureRandom = new SecureRandom();

    public MobileReferralService(MobileReferralProfileRepository profileRepository,
                                 MobileReferralAttributionRepository attributionRepository,
                                 TenantDataSourceRegistry tenantDataSourceRegistry,
                                 TenantRepository tenantRepository,
                                 GlobalUserService globalUserService,
                                 MobileReferralResolutionService resolutionService,
                                 MemberRepository memberRepository) {
        this.profileRepository = profileRepository;
        this.attributionRepository = attributionRepository;
        this.tenantDataSourceRegistry = tenantDataSourceRegistry;
        this.tenantRepository = tenantRepository;
        this.globalUserService = globalUserService;
        this.resolutionService = resolutionService;
        this.memberRepository = memberRepository;
    }

    /** Why a user can't have a referral code, as returned to the app. */
    public enum CodeBlocker { NO_GYM, MEMBERSHIP_INACTIVE }

    /**
     * Referral codes only exist for active members, inside their gym's database — the
     * only place claimCode() looks codes up. A code created with no gym selected used to
     * land in the main database, where no claim could ever find it (400 "Invalid referral
     * code"). Returns null when the user may have a code.
     */
    public CodeBlocker referralCodeBlocker(Long userId, boolean globalUser) {
        if (tenantRoutingEnabled && TenantContextHolder.getCurrentTenant() == null) {
            return CodeBlocker.NO_GYM;
        }
        return blockerFor(findCallerMember(userId, globalUser), LocalDateTime.now());
    }

    /**
     * The caller's members row in the current gym. An app-registered (global) login's id
     * is a global user id; a gym-created login's id is this gym's users.id — a different
     * number space, so the two must never be looked up the same way.
     */
    public Member findCallerMember(Long userId, boolean globalUser) {
        return globalUser
                ? resolutionService.findMemberByGlobalUserId(userId)
                : memberRepository.findByUserId(userId).orElse(null);
    }

    /** Same "not active" rule as the reward engine (expired status), plus a lapsed expiry date. */
    static CodeBlocker blockerFor(Member member, LocalDateTime now) {
        if (member == null) return CodeBlocker.NO_GYM;
        boolean expired = "expired".equalsIgnoreCase(member.getMembershipStatus())
                || (member.getExpiryDate() != null && member.getExpiryDate().isBefore(now));
        return expired ? CodeBlocker.MEMBERSHIP_INACTIVE : null;
    }

    /**
     * The member's own code in this gym. globalUserId is the caller's global id for an
     * app-registered member, null for a gym-created login.
     */
    @Transactional
    public MobileReferralProfile getOrCreateProfile(Member member, Long globalUserId) {
        Optional<MobileReferralProfile> owned = profileRepository.findByMemberId(member.getId());
        if (owned.isPresent()) {
            return owned.get();
        }
        if (globalUserId != null) {
            // A code made before V95, or one whose members row was replaced since (a
            // rejected purchase released, then bought again) — keep the same code and
            // re-point it at the member's current row.
            Optional<MobileReferralProfile> legacy = profileRepository.findByGlobalUserId(globalUserId);
            if (legacy.isPresent()) {
                legacy.get().setMemberId(member.getId());
                return profileRepository.save(legacy.get());
            }
        }
        return createProfile(member.getId(), globalUserId);
    }

    private MobileReferralProfile createProfile(Long memberId, Long globalUserId) {
        MobileReferralProfile profile = new MobileReferralProfile();
        profile.setMemberId(memberId);
        profile.setGlobalUserId(globalUserId);

        // Retry logic for unique code generation
        for (int i = 0; i < 3; i++) {
            try {
                profile.setReferralCode(generateRandomCode());
                return profileRepository.save(profile);
            } catch (DataIntegrityViolationException e) {
                if (i == 2) throw new RuntimeException("Failed to generate unique referral code after 3 attempts");
            }
        }
        throw new RuntimeException("Failed to generate unique referral code");
    }

    private String generateRandomCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(ALPHANUMERIC.charAt(secureRandom.nextInt(ALPHANUMERIC.length())));
        }
        return sb.toString();
    }

    /**
     * Searches all tenant databases for the given referral code via plain JDBC.
     * Returns the tenant slug if found, or null if not found.
     * This avoids JPA OSIV issues and runs independently of the current tenant context.
     */
    public String findTenantForReferralCode(String code) {
        for (Tenant tenant : tenantRepository.findAll()) {
            if (!tenantDataSourceRegistry.hasConnection(tenant.getSlug())) {
                continue;
            }
            DataSource ds = tenantDataSourceRegistry.getDataSource(tenant.getSlug());
            try (Connection conn = ds.getConnection();
                 PreparedStatement ps = conn.prepareStatement("SELECT id FROM mobile_referral_profiles WHERE referral_code = ?")) {
                ps.setString(1, code);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        return tenant.getSlug();
                    }
                }
            } catch (SQLException e) {
                log.error("Failed to query referral code in tenant " + tenant.getSlug(), e);
            }
        }
        return null;
    }

    @Transactional
    public MobileReferralAttribution claimCodeInTenant(Long refereeGlobalUserId, String code) {
        Optional<MobileReferralProfile> referrerProfileOpt = profileRepository.findByReferralCode(code);
        if (referrerProfileOpt.isEmpty()) {
            throw new IllegalArgumentException("Invalid referral code");
        }
        
        Long referrerMemberId = referrerProfileOpt.get().getMemberId();
        Long referrerGlobalUserId = referrerProfileOpt.get().getGlobalUserId();
        
        if (refereeGlobalUserId.equals(referrerGlobalUserId)) {
            throw new IllegalArgumentException("Cannot claim your own referral code");
        }
        
        if (attributionRepository.findByRefereeGlobalUserId(refereeGlobalUserId).isPresent()) {
            throw new IllegalStateException("User has already claimed a referral code");
        }
        
        // Insert (and flush) the attribution BEFORE the signup referral below. That runs in its
        // own REQUIRES_NEW transaction and commits immediately, so if the unique
        // referee_global_user_id insert failed after it (a double-submitted or concurrent claim),
        // the referrer would keep a SIGNUP reward for a claim that never happened. Flushing first
        // makes a concurrent claim block on the unique index and fail here instead.
        MobileReferralAttribution attribution = attributionRepository.saveAndFlush(new MobileReferralAttribution(
                referrerMemberId, referrerGlobalUserId, refereeGlobalUserId, MobileReferralStatus.PENDING));

        // Best-effort: fires any SIGNUP-triggered reward for the referrer right now, without
        // waiting for the referee to ever purchase a membership. Runs in its own transaction and
        // never throws — see createSignupReferral()'s javadoc — so it can't block this claim.
        try {
            Long legacyReferralId = resolutionService.createSignupReferral(referrerMemberId, referrerGlobalUserId, refereeGlobalUserId);
            if (legacyReferralId != null) {
                attribution.setLegacyReferralId(legacyReferralId);
            }
        } catch (Exception e) {
            log.warn("Signup-time referral creation threw unexpectedly for referrer member {}: {}", referrerMemberId, e.getMessage());
        }

        return attributionRepository.save(attribution);
    }
    
    /**
     * The referrals made with this member's code in this gym. globalUserId (null for a
     * gym-created login) also picks up ones filed against an earlier members row of the
     * same app-registered member.
     */
    @Transactional(readOnly = true)
    public List<MobileReferralAttribution> getHistory(Member referrer, Long globalUserId) {
        Map<Long, MobileReferralAttribution> byId = new LinkedHashMap<>();
        attributionRepository.findByReferrerMemberId(referrer.getId()).forEach(a -> byId.put(a.getId(), a));
        if (globalUserId != null) {
            attributionRepository.findByReferrerGlobalUserId(globalUserId).forEach(a -> byId.putIfAbsent(a.getId(), a));
        }
        return new ArrayList<>(byId.values());
    }

    /** The code the current user claimed as a referee, if any — for the "referral you used" card. */
    @Transactional(readOnly = true)
    public Optional<MyReferralClaimDTO> getMyClaim(Long refereeGlobalUserId) {
        return attributionRepository.findByRefereeGlobalUserId(refereeGlobalUserId).map(attribution -> {
            String referrerName = resolveReferrerName(attribution);
            return new MyReferralClaimDTO(
                    referrerName,
                    attribution.getStatus(),
                    attribution.getCreatedAt(),
                    attribution.getStatus() == MobileReferralStatus.PENDING);
        });
    }

    // The referrer's name as their gym knows it; a referrer no longer in this gym falls
    // back to their global profile name, when they have one.
    private String resolveReferrerName(MobileReferralAttribution attribution) {
        Member referrer = resolutionService.findReferrer(attribution.getReferrerMemberId(), null);
        if (referrer != null && referrer.getName() != null && !referrer.getName().isBlank()) {
            return referrer.getName();
        }
        if (attribution.getReferrerGlobalUserId() == null) {
            return "A member";
        }
        return resolveGlobalProfileName(attribution.getReferrerGlobalUserId());
    }

    /**
     * UserProfile lives in the primary/global DB, not the tenant DB. This method
     * runs mid-request with TenantContextHolder already pointing at the caller's
     * tenant, so it must clear that (findUserProfileRequiresNew's own REQUIRES_NEW
     * transaction still routes off whatever TenantContextHolder holds at the
     * moment it opens its connection) and restore it afterwards.
     */
    private String resolveGlobalProfileName(Long referrerGlobalUserId) {
        String previousTenant = TenantContextHolder.getCurrentTenant();
        try {
            TenantContextHolder.clear();
            return globalUserService.findUserProfileRequiresNew(referrerGlobalUserId)
                    .map(UserProfile::getFullName)
                    .orElse("A member");
        } finally {
            if (previousTenant != null) {
                TenantContextHolder.setCurrentTenant(previousTenant);
            }
        }
    }
}
