package com.company.project.services.mobile.family;

import com.company.project.dto.FamilyMemberDTO;
import com.company.project.dto.MemberRequestDTO;
import com.company.project.dto.MemberResponseDTO;
import com.company.project.dto.mobile.discovery.MobilePurchaseRequestDTO;
import com.company.project.dto.mobile.family.MobileFamilyConnectedMemberDTO;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipPlan;
import com.company.project.entities.MobileIdempotencyRecord;
import com.company.project.entities.UserProfile;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.services.MemberService;
import com.company.project.services.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MobileFamilyPurchaseServiceTest {

    @Mock private MobileIdempotencyService idempotencyService;
    @Mock private MobileFamilyInvitationService invitationService;
    @Mock private MemberService memberService;
    @Mock private MemberRepository memberRepository;
    @Mock private MembershipPlanRepository planRepository;
    @Mock private NotificationService notificationService;

    private MobileFamilyPurchaseService purchaseService;

    private final UUID key = UUID.randomUUID();
    private MobileIdempotencyRecord lease;
    private UserProfile profile;
    private MembershipPlan plan;

    private static BigDecimal bd(String v) { return new BigDecimal(v); }

    @BeforeEach
    void setUp() {
        MobileFamilyPricingService pricing = new MobileFamilyPricingService(planRepository, memberService);
        purchaseService = new MobileFamilyPurchaseService(idempotencyService, pricing, invitationService,
                memberService, memberRepository, notificationService, new ObjectMapper());

        lease = new MobileIdempotencyRecord();
        lease.setIdempotencyKey(key);
        lease.setLeaseId(UUID.randomUUID());
        lease.setStatus("IN_PROGRESS");

        profile = new UserProfile();
        profile.setFullName("John Doe");

        plan = new MembershipPlan();
        plan.setId(1L);
        plan.setName("Family Gold");
        plan.setPlanType("Family");
        plan.setStatus("Active");
        plan.setPrice(bd("1000"));
        plan.setPricePerMember(bd("300"));
        plan.setFamilyBillingMode("individual");
    }

    private static MobileFamilyConnectedMemberDTO connected(String name, String email, boolean minor) {
        MobileFamilyConnectedMemberDTO c = new MobileFamilyConnectedMemberDTO();
        c.setName(name);
        c.setEmail(email);
        c.setRelationship(minor ? "Child" : "Spouse");
        c.setIsMinor(minor);
        return c;
    }

    private MobilePurchaseRequestDTO request(String paid, MobileFamilyConnectedMemberDTO... members) {
        MobilePurchaseRequestDTO r = new MobilePurchaseRequestDTO();
        r.setPlanId(1L);
        r.setPaymentMethodUsed("Card");
        r.setPaidAmount(bd(paid));
        r.setConnectedMembers(List.of(members));
        return r;
    }

    private String purchase(MobilePurchaseRequestDTO r) {
        return purchaseService.purchase(key, "fp", r, 100L, "john@example.com", profile, "acme", "Acme Gym").responseJson();
    }

    @Test
    @DisplayName("Replay of a COMPLETED key returns the cached response without creating anything")
    void replay() {
        lease.setStatus("COMPLETED");
        lease.setResponsePayload("{\"status\":\"SUCCESS\"}");
        when(idempotencyService.acquireOrRenewLease(key, "fp")).thenReturn(lease);

        assertEquals("{\"status\":\"SUCCESS\"}", purchase(request("0", connected("Jane", "jane@example.com", false))));
        verify(memberService, never()).createMember(any());
    }

    @Test
    @DisplayName("Buyer already a member of this gym: rejected and the key released for retry")
    void buyerAlreadyMember() {
        when(idempotencyService.acquireOrRenewLease(key, "fp")).thenReturn(lease);
        when(planRepository.findById(1L)).thenReturn(Optional.of(plan));
        when(memberRepository.existsByGlobalUserId(100L)).thenReturn(true);

        assertThrows(BusinessRuleViolationException.class,
                () -> purchase(request("2300", connected("Jane", "jane@example.com", false))));
        verify(idempotencyService).failRequest(key, lease.getLeaseId());
        verify(memberService, never()).createMember(any());
    }

    @Test
    @DisplayName("Family member email already a member of this gym: rejected before charging for that seat")
    void familyMemberAlreadyMember() {
        when(idempotencyService.acquireOrRenewLease(key, "fp")).thenReturn(lease);
        when(planRepository.findById(1L)).thenReturn(Optional.of(plan));
        when(memberRepository.existsByEmailIgnoreCase(anyString()))
                .thenAnswer(inv -> "jane@example.com".equals(inv.getArgument(0)));

        assertThrows(BusinessRuleViolationException.class,
                () -> purchase(request("2000", connected("Jane", "Jane@Example.com", false))));
        verify(memberService, never()).createMember(any());
    }

    @Test
    @DisplayName("Individual billing: every receipt is priced like the web app and funded from the one payment")
    void individualBillingSuccess() {
        when(idempotencyService.acquireOrRenewLease(key, "fp")).thenReturn(lease);
        when(planRepository.findById(1L)).thenReturn(Optional.of(plan));

        Member head = new Member();
        head.setId(42L);
        head.setMemberId("MBR-42");
        head.setName("John Doe");
        when(memberService.createMember(any())).thenReturn(MemberResponseDTO.fromEntity(head));
        when(memberRepository.findById(42L)).thenReturn(Optional.of(head));

        Member spouse = new Member();
        spouse.setMemberId("MBR-43");
        spouse.setName("Jane");
        spouse.setEmail("jane@example.com");
        Member child = new Member();
        child.setMemberId("MBR-44");
        child.setName("Kid");
        when(memberRepository.findByFamilyHeadId("MBR-42")).thenReturn(List.of(spouse, child));

        // plan 1000 + spouse 1000 + child 300
        String response = purchase(request("2300",
                connected("Jane", "jane@example.com", false),
                connected("Kid", null, true)));

        ArgumentCaptor<MemberRequestDTO> captor = ArgumentCaptor.forClass(MemberRequestDTO.class);
        verify(memberService).createMember(captor.capture());
        MemberRequestDTO req = captor.getValue();
        assertEquals(bd("1000"), req.getMembershipFee());
        assertEquals(0, req.getOutstandingBalance().signum());
        assertEquals("paid", req.getPaymentStatus());

        FamilyMemberDTO spouseDto = req.getFamilyMembers().get(0);
        assertEquals("Family Gold", spouseDto.getMembershipPlan());
        assertEquals(bd("1000"), spouseDto.getMembershipFee());
        assertEquals("paid", spouseDto.getPaymentStatus());

        FamilyMemberDTO childDto = req.getFamilyMembers().get(1);
        assertEquals(bd("300"), childDto.getMinorFee());
        assertEquals(bd("300"), childDto.getMinorPaidAmount());

        verify(memberService).linkGlobalUser(42L, 100L);
        verify(invitationService, times(1)).createInvitation(eq(head), eq(spouse), eq("acme"), eq("Acme Gym"), eq("Family Gold"));
        verify(idempotencyService).completeRequest(eq(key), eq(lease.getLeaseId()), eq(response));
        assertTrue(response.contains("\"invitedEmails\":[\"jane@example.com\"]"));
    }

    @Test
    @DisplayName("A family member can't reuse the buyer's own email")
    void rejectsBuyerEmail() {
        when(idempotencyService.acquireOrRenewLease(key, "fp")).thenReturn(lease);
        when(planRepository.findById(1L)).thenReturn(Optional.of(plan));

        assertThrows(IllegalArgumentException.class,
                () -> purchase(request("2000", connected("Jane", "JOHN@example.com", false))));
    }
}
