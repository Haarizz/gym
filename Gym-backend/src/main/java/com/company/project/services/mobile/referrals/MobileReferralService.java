package com.company.project.services.mobile.referrals;

import com.company.project.dto.MyReferralClaimDTO;
import com.company.project.entities.MobileReferralAttribution;
import com.company.project.entities.MobileReferralProfile;
import com.company.project.entities.MobileReferralStatus;
import com.company.project.entities.UserProfile;
import com.company.project.repositories.mobile.referrals.MobileReferralAttributionRepository;
import com.company.project.repositories.mobile.referrals.MobileReferralProfileRepository;
import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.security.TenantContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import java.util.List;
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

    private static final String ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    private static final int CODE_LENGTH = 8;
    private final SecureRandom secureRandom = new SecureRandom();

    public MobileReferralService(MobileReferralProfileRepository profileRepository,
                                 MobileReferralAttributionRepository attributionRepository,
                                 TenantDataSourceRegistry tenantDataSourceRegistry,
                                 TenantRepository tenantRepository,
                                 GlobalUserService globalUserService,
                                 MobileReferralResolutionService resolutionService) {
        this.profileRepository = profileRepository;
        this.attributionRepository = attributionRepository;
        this.tenantDataSourceRegistry = tenantDataSourceRegistry;
        this.tenantRepository = tenantRepository;
        this.globalUserService = globalUserService;
        this.resolutionService = resolutionService;
    }

    @Transactional
    public MobileReferralProfile getOrCreateProfile(Long globalUserId) {
        return profileRepository.findByGlobalUserId(globalUserId).orElseGet(() -> {
            MobileReferralProfile profile = new MobileReferralProfile();
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
        });
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
                 PreparedStatement ps = conn.prepareStatement("SELECT global_user_id FROM mobile_referral_profiles WHERE referral_code = ?")) {
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
        
        Long referrerGlobalUserId = referrerProfileOpt.get().getGlobalUserId();
        
        if (referrerGlobalUserId.equals(refereeGlobalUserId)) {
            throw new IllegalArgumentException("Cannot claim your own referral code");
        }
        
        if (attributionRepository.findByRefereeGlobalUserId(refereeGlobalUserId).isPresent()) {
            throw new IllegalStateException("User has already claimed a referral code");
        }
        
        MobileReferralAttribution attribution = new MobileReferralAttribution(
                referrerGlobalUserId, refereeGlobalUserId, MobileReferralStatus.PENDING);

        // Best-effort: fires any SIGNUP-triggered reward for the referrer right now, without
        // waiting for the referee to ever purchase a membership. Runs in its own transaction and
        // never throws — see createSignupReferral()'s javadoc — so it can't block this claim.
        try {
            Long legacyReferralId = resolutionService.createSignupReferral(referrerGlobalUserId, refereeGlobalUserId);
            if (legacyReferralId != null) {
                attribution.setLegacyReferralId(legacyReferralId);
            }
        } catch (Exception e) {
            log.warn("Signup-time referral creation threw unexpectedly for referrer {}: {}", referrerGlobalUserId, e.getMessage());
        }

        return attributionRepository.save(attribution);
    }
    
    @Transactional(readOnly = true)
    public List<MobileReferralAttribution> getHistory(Long referrerGlobalUserId) {
        return attributionRepository.findByReferrerGlobalUserId(referrerGlobalUserId);
    }

    /** The code the current user claimed as a referee, if any — for the "referral you used" card. */
    @Transactional(readOnly = true)
    public Optional<MyReferralClaimDTO> getMyClaim(Long refereeGlobalUserId) {
        return attributionRepository.findByRefereeGlobalUserId(refereeGlobalUserId).map(attribution -> {
            String referrerName = resolveReferrerName(attribution.getReferrerGlobalUserId());
            return new MyReferralClaimDTO(
                    referrerName,
                    attribution.getStatus(),
                    attribution.getCreatedAt(),
                    attribution.getStatus() == MobileReferralStatus.PENDING);
        });
    }

    /**
     * UserProfile lives in the primary/global DB, not the tenant DB. This method
     * runs mid-request with TenantContextHolder already pointing at the caller's
     * tenant, so it must clear that (findUserProfileRequiresNew's own REQUIRES_NEW
     * transaction still routes off whatever TenantContextHolder holds at the
     * moment it opens its connection) and restore it afterwards.
     */
    private String resolveReferrerName(Long referrerGlobalUserId) {
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
