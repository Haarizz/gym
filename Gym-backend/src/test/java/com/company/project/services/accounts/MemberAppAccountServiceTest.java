package com.company.project.services.accounts;

import com.company.project.community.global.identity.TenantDataSources;
import com.company.project.controlplane.entities.AccountLinkRequest;
import com.company.project.controlplane.repositories.AccountLinkRequestRepository;
import com.company.project.entities.Member;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.controlplane.entities.UserDirectoryEntry;
import com.company.project.controlplane.repositories.UserDirectoryRepository;
import com.company.project.entities.User;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.security.TenantContextHolder;
import com.company.project.services.EmailService;
import com.company.project.services.GlobalMembershipService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MemberAppAccountServiceTest {

    @Mock private MemberRepository memberRepository;
    @Mock private GlobalAccountService accounts;
    @Mock private GlobalMembershipService globalMembershipService;
    @Mock private AccountLinkRequestRepository linkRequestRepository;
    @Mock private TenantDataSources tenantDataSources;
    @Mock private EmailService emailService;
    @Mock private UserRepository userRepository;
    @Mock private UserDirectoryRepository userDirectoryRepository;

    @InjectMocks private MemberAppAccountService service;

    private Member member;

    @BeforeEach
    void setUp() {
        TenantContextHolder.setCurrentTenant("gym-a");
        member = new Member();
        member.setId(7L);
        member.setName("Grace Hopper");
        member.setEmail("grace@example.com");
        member.setPhone("+100");
    }

    @AfterEach
    void tearDown() {
        TenantContextHolder.clear();
    }

    @Test
    void desk_sign_up_creates_a_global_account_and_links_it() {
        when(accounts.findClash("grace_h", "grace@example.com")).thenReturn(Optional.empty());
        when(accounts.createDeskAccount(eq("Grace Hopper"), eq("grace_h"), eq("grace@example.com"), eq("+100"),
                eq("secret1"), any())).thenReturn(55L);
        when(memberRepository.save(any(Member.class))).thenAnswer(inv -> inv.getArgument(0));

        Member saved = service.createForMember(member, "grace_h", "secret1", null);

        assertEquals(55L, saved.getGlobalUserId());
        assertNull(saved.getUserId(), "no gym-only login is created any more");
        assertEquals("grace_h", saved.getAppUsername());
        verify(globalMembershipService).recordLink(55L, 7L);
        verify(accounts).writeProfile(eq(55L), any(), eq(EnumSet.allOf(IdentityField.class)));
    }

    @Test
    void desk_sign_up_refuses_an_email_that_already_has_an_account() {
        when(accounts.findClash("grace_h", "grace@example.com"))
                .thenReturn(Optional.of(GlobalAccountService.Clash.EMAIL));

        BusinessRuleViolationException e = assertThrows(BusinessRuleViolationException.class,
                () -> service.createForMember(member, "grace_h", "secret1", null));

        assertTrue(e.getMessage().contains("Link existing account"));
        verify(accounts, never()).createDeskAccount(any(), any(), any(), any(), any(), any());
    }

    @Test
    void desk_sign_up_never_uses_a_family_placeholder_email() {
        member.setEmail("dep-3@family.local");
        when(accounts.findClash("grace_h", null)).thenReturn(Optional.empty());
        when(accounts.createDeskAccount(any(), any(), isNull(), any(), any(), any())).thenReturn(56L);
        when(memberRepository.save(any(Member.class))).thenAnswer(inv -> inv.getArgument(0));

        service.createForMember(member, "grace_h", "secret1", null);

        verify(accounts).createDeskAccount(eq("Grace Hopper"), eq("grace_h"), isNull(), eq("+100"), eq("secret1"), any());
    }

    @Test
    void a_member_with_an_account_cant_get_another() {
        member.setGlobalUserId(9L);
        assertThrows(BusinessRuleViolationException.class,
                () -> service.createForMember(member, "grace_h", "secret1", null));
    }

    @Test
    void link_request_waits_for_the_owner_and_links_nothing_yet() {
        when(memberRepository.findById(7L)).thenReturn(Optional.of(member));
        when(accounts.findMemberAccount("grace@example.com")).thenReturn(Optional.of(
                new GlobalAccountService.Account(55L, "grace", "grace@example.com", true, "Grace")));
        when(memberRepository.findByGlobalUserId(55L)).thenReturn(Optional.empty());
        when(tenantDataSources.gymName("gym-a")).thenReturn(Optional.of("Iron Gym"));
        when(linkRequestRepository.findByTenantSlugAndMemberIdAndStatus("gym-a", 7L, AccountLinkRequest.PENDING))
                .thenReturn(List.of());

        service.requestLink(7L, "grace@example.com");

        ArgumentCaptor<AccountLinkRequest> saved = ArgumentCaptor.forClass(AccountLinkRequest.class);
        verify(linkRequestRepository).save(saved.capture());
        assertEquals(55L, saved.getValue().getGlobalUserId());
        assertEquals("gym-a", saved.getValue().getTenantSlug());
        assertEquals("Iron Gym", saved.getValue().getGymName());
        assertNull(member.getGlobalUserId(), "linked only when the owner accepts");
        verify(memberRepository, never()).save(any());
    }

    @Test
    void link_request_for_an_unknown_account_is_refused() {
        when(memberRepository.findById(7L)).thenReturn(Optional.of(member));
        when(accounts.findMemberAccount("nobody")).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> service.requestLink(7L, "nobody"));
        verify(linkRequestRepository, never()).save(any());
    }

    @Test
    void link_request_refused_when_the_account_is_already_another_member_here() {
        Member other = new Member();
        other.setId(8L);
        other.setName("Someone Else");
        when(memberRepository.findById(7L)).thenReturn(Optional.of(member));
        when(accounts.findMemberAccount("grace")).thenReturn(Optional.of(
                new GlobalAccountService.Account(55L, "grace", null, false, "Grace")));
        when(memberRepository.findByGlobalUserId(55L)).thenReturn(Optional.of(other));

        assertThrows(BusinessRuleViolationException.class, () -> service.requestLink(7L, "grace"));
    }

    @Test
    void staff_edit_is_copied_to_the_linked_account_outside_a_transaction_immediately() {
        member.setGlobalUserId(55L);
        member.setAllergies("Peanuts");

        service.copyToAccountAfterCommit(member, EnumSet.of(IdentityField.ALLERGIES));

        verify(accounts).writeProfile(eq(55L), argThat(v -> "Peanuts".equals(v.get(IdentityField.ALLERGIES))),
                eq(EnumSet.of(IdentityField.ALLERGIES)));
    }

    @Test
    void staff_edit_of_an_unlinked_member_touches_no_account() {
        service.copyToAccountAfterCommit(member, EnumSet.of(IdentityField.ALLERGIES));
        verifyNoInteractions(accounts);
    }

    @Test
    void creating_an_account_retires_an_old_gym_login() {
        member.setUserId(70L);
        User oldLogin = new User();
        oldLogin.setId(70L);
        oldLogin.setUsername("grace_old");
        oldLogin.setEnabled(true);
        UserDirectoryEntry entry = new UserDirectoryEntry("grace_old", "grace@example.com", "gym-a");
        when(userRepository.findById(70L)).thenReturn(Optional.of(oldLogin));
        when(userDirectoryRepository.findByUsername("grace_old")).thenReturn(Optional.of(entry));
        when(accounts.findClash("grace_h", "grace@example.com")).thenReturn(Optional.empty());
        when(accounts.createDeskAccount(any(), any(), any(), any(), any(), any())).thenReturn(55L);
        when(memberRepository.save(any(Member.class))).thenAnswer(inv -> inv.getArgument(0));

        Member saved = service.createForMember(member, "grace_h", "secret1", null);

        assertEquals(55L, saved.getGlobalUserId());
        assertNull(saved.getUserId());
        assertFalse(oldLogin.isEnabled(), "old gym login disabled, not deleted");
        verify(userDirectoryRepository).delete(entry);
    }
}
