package com.company.project.services.mobile.referrals;

import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.entities.Member;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.mobile.referrals.MobileReferralAttributionRepository;
import com.company.project.repositories.mobile.referrals.MobileReferralProfileRepository;
import com.company.project.security.TenantContextHolder;
import com.company.project.services.GlobalUserService;
import com.company.project.services.mobile.referrals.MobileReferralService.CodeBlocker;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Only active gym members get a referral code — one created outside a gym could never be claimed. */
class ReferralCodeEligibilityTest {

    @Mock private MobileReferralProfileRepository profileRepository;
    @Mock private MobileReferralAttributionRepository attributionRepository;
    @Mock private TenantDataSourceRegistry tenantDataSourceRegistry;
    @Mock private TenantRepository tenantRepository;
    @Mock private GlobalUserService globalUserService;
    @Mock private MobileReferralResolutionService resolutionService;
    @Mock private MemberRepository memberRepository;

    private MobileReferralService service;
    private final LocalDateTime now = LocalDateTime.now();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new MobileReferralService(profileRepository, attributionRepository, tenantDataSourceRegistry,
                tenantRepository, globalUserService, resolutionService, memberRepository);
        ReflectionTestUtils.setField(service, "tenantRoutingEnabled", true);
    }

    @AfterEach
    void clearTenant() {
        TenantContextHolder.clear();
    }

    private Member member(String status, LocalDateTime expiry) {
        Member m = new Member();
        m.setMembershipStatus(status);
        m.setExpiryDate(expiry);
        return m;
    }

    @Test
    void noGymSelectedMeansNoCode() {
        assertEquals(CodeBlocker.NO_GYM, service.referralCodeBlocker(1L, true));
        verify(resolutionService, never()).findMemberByGlobalUserId(any());
    }

    @Test
    void activeMemberOfTheGymGetsACode() {
        TenantContextHolder.setCurrentTenant("power-gym");
        when(resolutionService.findMemberByGlobalUserId(1L)).thenReturn(member("Active", now.plusDays(30)));
        assertNull(service.referralCodeBlocker(1L, true));
    }

    @Test
    void legacyUserIsLookedUpByTenantUserId() {
        TenantContextHolder.setCurrentTenant("power-gym");
        when(memberRepository.findByUserId(5L)).thenReturn(Optional.of(member("Active", null)));
        assertNull(service.referralCodeBlocker(5L, false));
    }

    @Test
    void notAMemberMeansNoCode() {
        TenantContextHolder.setCurrentTenant("power-gym");
        assertEquals(CodeBlocker.NO_GYM, service.referralCodeBlocker(1L, true));
    }

    @Test
    void routingOffSkipsTheGymCheck() {
        ReflectionTestUtils.setField(service, "tenantRoutingEnabled", false);
        when(resolutionService.findMemberByGlobalUserId(1L)).thenReturn(member("Active", null));
        assertNull(service.referralCodeBlocker(1L, true));
    }

    @Test
    void expiredStatusOrLapsedExpiryBlocksTheCode() {
        assertEquals(CodeBlocker.MEMBERSHIP_INACTIVE, MobileReferralService.blockerFor(member("Expired", null), now));
        assertEquals(CodeBlocker.MEMBERSHIP_INACTIVE, MobileReferralService.blockerFor(member("Active", now.minusDays(1)), now));
        assertNull(MobileReferralService.blockerFor(member("Active", now.plusDays(1)), now));
    }
}
