package com.company.project.services.mobile.family;

import com.company.project.controlplane.repositories.FamilyInvitationDirectoryRepository;
import com.company.project.entities.Member;
import com.company.project.entities.MobileFamilyInvitation;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.mobile.family.MobileFamilyInvitationRepository;
import com.company.project.services.EmailService;
import com.company.project.services.GlobalMembershipService;
import com.company.project.services.mobile.family.MobileFamilyInvitationService.ClaimStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MobileFamilyInvitationServiceTest {

    @Mock private MobileFamilyInvitationRepository invitationRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private FamilyInvitationDirectoryRepository directoryRepository;
    @Mock private EmailService emailService;
    @Mock private GlobalMembershipService globalMembershipService;

    @InjectMocks
    private MobileFamilyInvitationService invitationService;

    private MobileFamilyInvitation invitation;
    private Member dependent;

    @BeforeEach
    void setUp() {
        invitation = new MobileFamilyInvitation();
        invitation.setId(5L);
        invitation.setPrimaryMemberId("MBR-42");
        invitation.setDependentMemberId("MBR-43");
        invitation.setRecipientEmail("jane@example.com");
        invitation.setStatus("PENDING");
        invitation.setExpiresAt(LocalDateTime.now().plusMonths(1));

        dependent = new Member();
        dependent.setId(43L);
        dependent.setMemberId("MBR-43");
        dependent.setEmail("jane@example.com");
    }

    @Test
    @DisplayName("Matching email, no membership of their own: family seat is linked to the account")
    void claimLinksAccount() {
        when(invitationRepository.findById(5L)).thenReturn(Optional.of(invitation));
        when(memberRepository.findByMemberId("MBR-43")).thenReturn(Optional.of(dependent));
        when(invitationRepository.transitionFromPending(eq(5L), eq("CLAIMED"), any())).thenReturn(1);

        assertEquals(ClaimStatus.CLAIMED, invitationService.claimInTenant(5L, "jane@example.com", 200L));
        assertEquals(200L, dependent.getGlobalUserId());
        verify(memberRepository).saveAndFlush(dependent);
        verify(globalMembershipService).recordLink(200L, 43L);
    }

    @Test
    @DisplayName("Invitee already has their own membership in this gym: it stays, the invitation is skipped")
    void existingMembershipWins() {
        when(invitationRepository.findById(5L)).thenReturn(Optional.of(invitation));
        when(memberRepository.findByMemberId("MBR-43")).thenReturn(Optional.of(dependent));
        when(memberRepository.existsByGlobalUserId(200L)).thenReturn(true);

        assertEquals(ClaimStatus.SKIPPED_EXISTING_MEMBERSHIP, invitationService.claimInTenant(5L, "jane@example.com", 200L));
        verify(invitationRepository).transitionFromPending(eq(5L), eq("SKIPPED"), any());
        assertNull(dependent.getGlobalUserId());
        verify(memberRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Own membership registered at the desk (same email, not linked to the app) also wins")
    void deskMembershipWins() {
        when(invitationRepository.findById(5L)).thenReturn(Optional.of(invitation));
        when(memberRepository.findByMemberId("MBR-43")).thenReturn(Optional.of(dependent));
        when(memberRepository.existsOwnMembershipByEmail("jane@example.com", "MBR-43")).thenReturn(true);

        assertEquals(ClaimStatus.SKIPPED_EXISTING_MEMBERSHIP, invitationService.claimInTenant(5L, "jane@example.com", 200L));
        verify(memberRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Different email: not claimable")
    void wrongEmail() {
        when(invitationRepository.findById(5L)).thenReturn(Optional.of(invitation));

        assertEquals(ClaimStatus.INVALID, invitationService.claimInTenant(5L, "someone@else.com", 200L));
        verify(memberRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Revoked invitation: not claimable")
    void revoked() {
        invitation.setStatus("REVOKED");
        when(invitationRepository.findById(5L)).thenReturn(Optional.of(invitation));
        when(memberRepository.findByMemberId("MBR-43")).thenReturn(Optional.of(dependent));

        assertEquals(ClaimStatus.REVOKED, invitationService.claimInTenant(5L, "jane@example.com", 200L));
    }

    @Test
    @DisplayName("Index row left behind by a rolled-back purchase: reported invalid")
    void orphanedIndexRow() {
        when(invitationRepository.findById(5L)).thenReturn(Optional.empty());

        assertEquals(ClaimStatus.INVALID, invitationService.claimInTenant(5L, "jane@example.com", 200L));
    }
}
