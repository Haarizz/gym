package com.company.project.services.mobile.family;

import com.company.project.dto.FamilyMemberDTO;
import com.company.project.dto.MemberRequestDTO;
import com.company.project.dto.MemberResponseDTO;
import com.company.project.dto.RenewalRequestDTO;
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
import com.company.project.services.MembershipFreezeService;
import com.company.project.services.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
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
    @Mock private MembershipFreezeService freezeService;

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
                memberService, memberRepository, notificationService, freezeService, new ObjectMapper());

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

    private Member existingMember() {
        Member m = new Member();
        m.setId(42L);
        m.setMemberId("MBR-42");
        m.setName("John Doe");
        m.setEmail("john@example.com");
        return m;
    }

    @Test
    @DisplayName("Convert, individual billing: head renewal covers own fee + minor, adult priced on their own receipt")
    void convertIndividualBilling() {
        when(idempotencyService.acquireOrRenewLease(key, "fp")).thenReturn(lease);
        when(planRepository.findById(1L)).thenReturn(Optional.of(plan));
        Member head = existingMember();
        when(memberRepository.findById(42L)).thenReturn(Optional.of(head));
        Member spouse = new Member();
        spouse.setMemberId("MBR-43");
        spouse.setName("Jane");
        spouse.setEmail("jane@example.com");
        when(memberRepository.findByFamilyHeadId("MBR-42")).thenReturn(List.of(spouse));

        String response = purchaseService.convert(key, "fp", request("2300",
                connected("Jane", "jane@example.com", false),
                connected("Kid", null, true)), 42L, "acme", "Acme Gym").responseJson();

        ArgumentCaptor<RenewalRequestDTO> renewal = ArgumentCaptor.forClass(RenewalRequestDTO.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<FamilyMemberDTO>> members = ArgumentCaptor.forClass(List.class);
        InOrder order = inOrder(freezeService, memberService);
        order.verify(freezeService).endFreezeForRenewal(42L);
        order.verify(memberService).convertToFamilyHead(eq(42L), eq(plan), renewal.capture(), members.capture());
        RenewalRequestDTO r = renewal.getValue();
        assertEquals(bd("1000"), r.getMembershipFee());
        assertEquals(bd("300"), r.getBilledToHeadFeeTotal());
        // head's 1000 + the child's 300 are funded before the spouse's own receipt
        assertEquals(0, bd("1300").compareTo(r.getAmountReceived()));
        assertEquals(1, r.getMinorCharges().size());
        assertTrue(r.getMinorCharges().get(0).getPaid());

        FamilyMemberDTO spouseDto = members.getValue().get(0);
        assertEquals(bd("1000"), spouseDto.getMembershipFee());
        assertEquals("paid", spouseDto.getPaymentStatus());

        verify(memberService, never()).createMember(any());
        verify(invitationService).createInvitation(eq(head), eq(spouse), eq("acme"), eq("Acme Gym"), eq("Family Gold"));
        verify(idempotencyService).completeRequest(eq(key), eq(lease.getLeaseId()), eq(response));
        assertTrue(response.contains("\"approvalPending\":false"));
    }

    @Test
    @DisplayName("Convert, family_head billing: one invoice on the head, every member itemized on it")
    void convertFamilyHeadBilling() {
        plan.setFamilyBillingMode("family_head");
        when(memberService.memberPriceForIndex(eq(plan), anyInt())).thenReturn(bd("300"));
        when(idempotencyService.acquireOrRenewLease(key, "fp")).thenReturn(lease);
        when(planRepository.findById(1L)).thenReturn(Optional.of(plan));
        when(memberRepository.findById(42L)).thenReturn(Optional.of(existingMember()));

        purchaseService.convert(key, "fp", request("600", connected("Jane", null, false)), 42L, "acme", null);

        ArgumentCaptor<RenewalRequestDTO> renewal = ArgumentCaptor.forClass(RenewalRequestDTO.class);
        verify(memberService).convertToFamilyHead(eq(42L), eq(plan), renewal.capture(), anyList());
        RenewalRequestDTO r = renewal.getValue();
        assertEquals(bd("600"), r.getMembershipFee());
        assertEquals(0, r.getBilledToHeadFeeTotal().signum());
        assertEquals(bd("300"), r.getMinorCharges().get(0).getAmount());
        assertTrue(r.getMinorCharges().get(0).getPaid());
    }

    @Test
    @DisplayName("Convert: a family member can't reuse the head's own email")
    void convertRejectsHeadEmail() {
        when(idempotencyService.acquireOrRenewLease(key, "fp")).thenReturn(lease);
        when(planRepository.findById(1L)).thenReturn(Optional.of(plan));
        when(memberRepository.findById(42L)).thenReturn(Optional.of(existingMember()));

        assertThrows(IllegalArgumentException.class, () -> purchaseService.convert(key, "fp",
                request("2000", connected("Jane", "John@Example.com", false)), 42L, "acme", null));
        verify(idempotencyService).failRequest(key, lease.getLeaseId());
        verify(memberService, never()).convertToFamilyHead(any(), any(), any(), any());
    }

    @Test
    @DisplayName("Quote checks the plan's member caps before any price is shown")
    void quoteEnforcesFamilyCaps() {
        MobileFamilyPricingService pricing = new MobileFamilyPricingService(planRepository, memberService);
        doThrow(new IllegalArgumentException("This family plan allows a maximum of 2 adult member(s)."))
                .when(memberService).enforceFamilyMemberCaps(plan, 3, 1);

        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> pricing.quote(plan, List.of(false, false, true), null));
        assertTrue(e.getMessage().contains("2 adult"));
    }

    @Test
    @DisplayName("Couple quote: exactly one adult partner")
    void coupleQuoteRules() {
        MobileFamilyPricingService pricing = new MobileFamilyPricingService(planRepository, memberService);
        plan.setPlanType("Couple");

        assertThrows(IllegalArgumentException.class, () -> pricing.quote(plan, List.of(false, false), null));
        assertThrows(IllegalArgumentException.class, () -> pricing.quote(plan, List.of(true), null));
        assertEquals(bd("2000"), pricing.quote(plan, List.of(false), null).getTotal());
    }

    @Test
    @DisplayName("family_head billing without price-per-member: the plan price is the whole family's invoice")
    void familyHeadFlatPrice() {
        MobileFamilyPricingService pricing = new MobileFamilyPricingService(planRepository, memberService);
        plan.setFamilyBillingMode("family_head");
        plan.setPricePerMember(null);

        // 1000 plan + a sister: one invoice of 1000, not 2000 as under individual billing
        assertEquals(bd("1000"), pricing.quote(plan, List.of(false), null).getTotal());
        plan.setFamilyBillingMode("individual");
        assertEquals(bd("2000"), pricing.quote(plan, List.of(false), null).getTotal());
    }
}
