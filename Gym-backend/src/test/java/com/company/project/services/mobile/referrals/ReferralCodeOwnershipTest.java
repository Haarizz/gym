package com.company.project.services.mobile.referrals;

import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.entities.Member;
import com.company.project.entities.MobileReferralAttribution;
import com.company.project.entities.MobileReferralProfile;
import com.company.project.entities.MobileReferralStatus;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.mobile.referrals.MobileReferralAttributionRepository;
import com.company.project.repositories.mobile.referrals.MobileReferralProfileRepository;
import com.company.project.services.GlobalUserService;
import com.company.project.services.ReferralService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * A referral code belongs to the referrer's members row, never to a raw user id: a
 * gym-created login's id is the gym's users.id, which can equal some app-registered
 * member's global user id.
 */
class ReferralCodeOwnershipTest {

    @Mock private MobileReferralProfileRepository profileRepository;
    @Mock private MobileReferralAttributionRepository attributionRepository;
    @Mock private TenantDataSourceRegistry tenantDataSourceRegistry;
    @Mock private TenantRepository tenantRepository;
    @Mock private GlobalUserService globalUserService;
    @Mock private MobileReferralResolutionService resolutionService;
    @Mock private MemberRepository memberRepository;
    @Mock private ReferralService referralService;

    private MobileReferralService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new MobileReferralService(profileRepository, attributionRepository, tenantDataSourceRegistry,
                tenantRepository, globalUserService, resolutionService, memberRepository);
        when(profileRepository.save(any(MobileReferralProfile.class))).thenAnswer(i -> i.getArguments()[0]);
        when(attributionRepository.saveAndFlush(any(MobileReferralAttribution.class))).thenAnswer(i -> i.getArguments()[0]);
        when(attributionRepository.save(any(MobileReferralAttribution.class))).thenAnswer(i -> i.getArguments()[0]);
    }

    private static Member member(long id) {
        Member m = new Member();
        m.setId(id);
        return m;
    }

    private static MobileReferralProfile profile(Long memberId, Long globalUserId, String code) {
        MobileReferralProfile p = new MobileReferralProfile();
        p.setMemberId(memberId);
        p.setGlobalUserId(globalUserId);
        p.setReferralCode(code);
        return p;
    }

    @Test
    void gymCreatedLoginGetsItsOwnCodeWithNoGlobalId() {
        when(profileRepository.findByMemberId(26L)).thenReturn(Optional.empty());

        MobileReferralProfile created = service.getOrCreateProfile(member(26L), null);

        assertEquals(26L, created.getMemberId());
        assertNull(created.getGlobalUserId());
        // Never looked up by its id as if it were a global id.
        verify(profileRepository, never()).findByGlobalUserId(anyLong());
    }

    @Test
    void gymCreatedLoginDoesNotPickUpTheCodeOfAGlobalUserWithTheSameNumber() {
        when(profileRepository.findByMemberId(26L)).thenReturn(Optional.empty());
        when(profileRepository.findByGlobalUserId(7L)).thenReturn(Optional.of(profile(40L, 7L, "STRANGER")));

        MobileReferralProfile created = service.getOrCreateProfile(member(26L), null);

        assertEquals(26L, created.getMemberId());
        assertEquals(8, created.getReferralCode().length());
    }

    @Test
    void appMembersExistingCodeIsKeptAndMovedToTheirMemberRow() {
        MobileReferralProfile legacy = profile(null, 30L, "PdVaqmHH");
        when(profileRepository.findByMemberId(12L)).thenReturn(Optional.empty());
        when(profileRepository.findByGlobalUserId(30L)).thenReturn(Optional.of(legacy));

        MobileReferralProfile result = service.getOrCreateProfile(member(12L), 30L);

        assertSame(legacy, result);
        assertEquals("PdVaqmHH", result.getReferralCode());
        assertEquals(12L, result.getMemberId());
    }

    @Test
    void claimingAGymMembersCodeCreditsTheirMemberRow() {
        when(profileRepository.findByReferralCode("TINUCODE")).thenReturn(Optional.of(profile(26L, null, "TINUCODE")));
        when(attributionRepository.findByRefereeGlobalUserId(99L)).thenReturn(Optional.empty());

        MobileReferralAttribution attribution = service.claimCodeInTenant(99L, "TINUCODE");

        assertEquals(26L, attribution.getReferrerMemberId());
        assertNull(attribution.getReferrerGlobalUserId());
        assertEquals(MobileReferralStatus.PENDING, attribution.getStatus());
        verify(resolutionService).createSignupReferral(26L, null, 99L);
    }

    @Test
    void historyIncludesRowsFiledAgainstAnEarlierMemberRow() {
        MobileReferralAttribution current = new MobileReferralAttribution(12L, 30L, 101L, MobileReferralStatus.PENDING);
        current.setId(1L);
        MobileReferralAttribution earlier = new MobileReferralAttribution(5L, 30L, 102L, MobileReferralStatus.SUCCESSFUL);
        earlier.setId(2L);
        when(attributionRepository.findByReferrerMemberId(12L)).thenReturn(List.of(current));
        when(attributionRepository.findByReferrerGlobalUserId(30L)).thenReturn(List.of(current, earlier));

        assertEquals(List.of(current, earlier), service.getHistory(member(12L), 30L));
    }

    @Test
    void gymMembersHistoryNeverReadsByGlobalId() {
        when(attributionRepository.findByReferrerMemberId(26L)).thenReturn(List.of());

        service.getHistory(member(26L), null);

        verify(attributionRepository, never()).findByReferrerGlobalUserId(any());
    }

    @Test
    void referrerIsFoundByMemberRowBeforeGlobalId() {
        MobileReferralResolutionService resolution =
                new MobileReferralResolutionService(memberRepository, attributionRepository, referralService);
        Member owner = member(26L);
        when(memberRepository.findById(26L)).thenReturn(Optional.of(owner));

        assertSame(owner, resolution.findReferrer(26L, 7L));
        verify(memberRepository, never()).findByGlobalUserId(any());
    }

    @Test
    void referrerFallsBackToGlobalIdWhenTheirMemberRowIsGone() {
        MobileReferralResolutionService resolution =
                new MobileReferralResolutionService(memberRepository, attributionRepository, referralService);
        Member current = member(12L);
        when(memberRepository.findById(5L)).thenReturn(Optional.empty());
        when(memberRepository.findByGlobalUserId(30L)).thenReturn(Optional.of(current));

        assertSame(current, resolution.findReferrer(5L, 30L));
    }
}
