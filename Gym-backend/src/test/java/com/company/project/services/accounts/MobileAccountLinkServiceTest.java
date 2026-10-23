package com.company.project.services.accounts;

import com.company.project.controlplane.entities.AccountLinkRequest;
import com.company.project.controlplane.repositories.AccountLinkRequestRepository;
import com.company.project.entities.Member;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MemberRepository;
import com.company.project.security.TenantContextHolder;
import com.company.project.services.GlobalMembershipService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MobileAccountLinkServiceTest {

    @Mock private AccountLinkRequestRepository linkRequestRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private GlobalMembershipService globalMembershipService;
    @Mock private GlobalAccountService accounts;
    @Mock private MemberAppAccountService memberAppAccountService;

    @InjectMocks private MobileAccountLinkService service;

    private AccountLinkRequest request;
    private Member member;

    @BeforeEach
    void setUp() {
        request = new AccountLinkRequest();
        request.setId(3L);
        request.setGlobalUserId(55L);
        request.setTenantSlug("gym-a");
        request.setMemberId(7L);
        request.setExpiresAt(LocalDateTime.now().plusDays(1));
        member = new Member();
        member.setId(7L);
        lenient().when(linkRequestRepository.findById(3L)).thenReturn(Optional.of(request));
        lenient().when(linkRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void accepting_links_the_member_in_the_requests_gym() {
        String[] tenantDuringLink = new String[1];
        when(memberRepository.findById(7L)).thenAnswer(inv -> {
            tenantDuringLink[0] = TenantContextHolder.getCurrentTenant();
            return Optional.of(member);
        });
        when(memberRepository.findByGlobalUserId(55L)).thenReturn(Optional.empty());
        member.setName("Grace (gym record)");
        member.setAllergies("Peanuts");
        Map<IdentityField, Object> account = new EnumMap<>(IdentityField.class);
        account.put(IdentityField.FULL_NAME, "Grace Hopper");
        account.put(IdentityField.DATE_OF_BIRTH, LocalDate.of(1990, 1, 5));
        when(accounts.readProfile(55L)).thenReturn(account);

        AccountLinkRequest result = service.accept(3L, 55L);

        assertEquals("Grace (gym record)", member.getName(), "linking never overwrites the gym's record");
        assertEquals(LocalDate.of(1990, 1, 5), member.getDateOfBirth(), "fills what the gym didn't have");
        verify(accounts).writeProfile(eq(55L), any(), eq(EnumSet.of(IdentityField.ALLERGIES)));

        assertEquals("gym-a", tenantDuringLink[0]);
        assertEquals(55L, member.getGlobalUserId());
        verify(memberRepository).save(member);
        verify(globalMembershipService).recordLink(55L, 7L);
        assertEquals(AccountLinkRequest.ACCEPTED, result.getStatus());
        assertNull(TenantContextHolder.getCurrentTenant(), "tenant restored afterwards");
    }

    @Test
    void someone_else_cant_accept_the_request() {
        assertThrows(EntityNotFoundException.class, () -> service.accept(3L, 99L));
        verify(memberRepository, never()).save(any());
    }

    @Test
    void an_expired_request_cant_be_accepted() {
        request.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        assertThrows(BusinessRuleViolationException.class, () -> service.accept(3L, 55L));
    }

    @Test
    void declining_links_nothing() {
        AccountLinkRequest result = service.decline(3L, 55L);
        assertEquals(AccountLinkRequest.DECLINED, result.getStatus());
        verifyNoInteractions(memberRepository);
    }
}
