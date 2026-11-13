package com.company.project.services;

import com.company.project.community.global.identity.TenantDataSources;
import com.company.project.dto.MemberRequestDTO;
import com.company.project.dto.MemberResponseDTO;
import com.company.project.dto.MembershipApplicationDTOs.ApplicationView;
import com.company.project.dto.PaymentSplitDTO;
import com.company.project.entities.Branch;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipApplication;
import com.company.project.entities.MembershipPlan;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.dto.FamilyMemberDTO;
import com.company.project.dto.MembershipApplicationDTOs.ApplicationFamilyMember;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.MembershipApplicationRepository;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.TenantContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MembershipApplicationServiceTest {

    @Mock private MembershipApplicationRepository applicationRepository;
    @Mock private MembershipPlanRepository planRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private BranchService branchService;
    @Mock private MemberService memberService;
    @Mock private MemberRepository memberRepository;
    @Mock private EmailService emailService;
    @Mock private TenantDataSources tenantDataSources;
    @Mock private ServicePortfolioService portfolioService;
    @Mock private PlatformTransactionManager transactionManager;

    private MembershipApplicationService service;

    @BeforeEach
    void setUp() {
        service = new MembershipApplicationService(applicationRepository, planRepository, branchRepository,
                branchService, memberService, memberRepository, emailService, tenantDataSources, portfolioService,
                transactionManager);
        BranchContextHolder.setActiveBranchId(1L);
    }

    @AfterEach
    void clear() {
        BranchContextHolder.clear();
        TenantContextHolder.clear();
    }

    private MembershipApplication application(String method, String paymentStatus) {
        MembershipApplication a = new MembershipApplication();
        a.setId(10L);
        a.setBranchId(1L);
        a.setReference("APP-TEST1234");
        a.setFullName("Sara Ahmed");
        a.setPhone("+971501234567");
        a.setEmail("sara@example.com");
        a.setGender("Female");
        a.setPlanId(5L);
        a.setPlanName("Gold Monthly");
        a.setListPrice(new BigDecimal("350"));
        a.setAmount(new BigDecimal("300"));
        a.setOfferLabel("Launch offer");
        a.setPaymentMethod(method);
        a.setPaymentStatus(paymentStatus);
        if (MembershipApplication.PAYMENT_PAID.equals(paymentStatus)) {
            a.setPaymentReference("pi_sim_abc");
            a.setCardBrand("Visa");
            a.setCardLast4("4242");
            a.setPaidAt(LocalDateTime.now());
        }
        when(applicationRepository.findById(10L)).thenReturn(Optional.of(a));
        lenient().when(applicationRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(a));
        return a;
    }

    private void activePlanAndMember() {
        MembershipPlan plan = new MembershipPlan();
        plan.setId(5L);
        plan.setName("Gold Monthly");
        plan.setStatus("Active");
        when(planRepository.findById(5L)).thenReturn(Optional.of(plan));
        Member m = new Member();
        m.setId(77L);
        m.setMemberId("MBR-0000000077");
        when(memberService.createMember(any())).thenReturn(MemberResponseDTO.fromEntity(m));
        when(applicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void cashApplicationNeedsCashConfirmedBeforeApproval() {
        MembershipApplication a = application(MembershipApplication.METHOD_CASH, MembershipApplication.PAYMENT_PENDING);

        assertThrows(BusinessRuleViolationException.class, () -> service.approve(10L, false, "admin"));

        verify(memberService, never()).createMember(any());
        assertEquals(MembershipApplication.APPROVAL_PENDING, a.getApprovalStatus());
    }

    @Test
    void approvingCashCreatesMemberPaidInCash() {
        MembershipApplication a = application(MembershipApplication.METHOD_CASH, MembershipApplication.PAYMENT_PENDING);
        activePlanAndMember();

        ApplicationView view = service.approve(10L, true, "admin");

        ArgumentCaptor<MemberRequestDTO> req = ArgumentCaptor.forClass(MemberRequestDTO.class);
        verify(memberService).createMember(req.capture());
        MemberRequestDTO r = req.getValue();
        assertEquals("Sara Ahmed", r.getName());
        assertEquals(5L, r.getMembershipPlanId());
        assertEquals(0, new BigDecimal("300").compareTo(r.getMembershipFee()));
        assertEquals(0, new BigDecimal("50").compareTo(r.getOfferDiscount()));
        assertEquals(0, BigDecimal.ZERO.compareTo(r.getOutstandingBalance()));
        assertEquals("Cash", r.getPaymentMethodUsed());
        PaymentSplitDTO leg = r.getPaymentBreakdown().get(0);
        assertEquals("Cash", leg.getMethod());
        assertEquals(0, new BigDecimal("300").compareTo(leg.getAmount()));

        assertEquals(MembershipApplication.PAYMENT_PAID, a.getPaymentStatus());
        assertEquals("admin", a.getCashReceivedBy());
        assertEquals(MembershipApplication.APPROVAL_APPROVED, view.approvalStatus());
        assertEquals(77L, view.memberId());
        assertEquals("MBR-0000000077", view.memberCode());
    }

    @Test
    void approvingPaidOnlineApplicationRecordsCardLeg() {
        application(MembershipApplication.METHOD_ONLINE, MembershipApplication.PAYMENT_PAID);
        activePlanAndMember();

        service.approve(10L, false, "admin");

        ArgumentCaptor<MemberRequestDTO> req = ArgumentCaptor.forClass(MemberRequestDTO.class);
        verify(memberService).createMember(req.capture());
        PaymentSplitDTO leg = req.getValue().getPaymentBreakdown().get(0);
        assertEquals("Card", leg.getMethod());
        assertEquals("pi_sim_abc", leg.getReference());
        assertNull(leg.getStripePaymentIntentId(), "simulated charges must never look like real Stripe intents");
    }

    private MembershipPlan familyPlan(String flatPrice) {
        MembershipPlan plan = new MembershipPlan();
        plan.setId(5L);
        plan.setName("Gold Monthly");
        plan.setStatus("Active");
        plan.setPlanType("Family");
        plan.setPrice(new BigDecimal(flatPrice));
        when(planRepository.findById(5L)).thenReturn(Optional.of(plan));
        return plan;
    }

    @Test
    void approvingFamilyApplicationCreatesHeadWithHousehold() {
        MembershipApplication a = application(MembershipApplication.METHOD_ONLINE, MembershipApplication.PAYMENT_PAID);
        a.setListPrice(new BigDecimal("300"));
        a.setOfferLabel(null);
        a.setFamilyMembers(List.of(
                new ApplicationFamilyMember("Omar Ahmed", "Husband", "Male", null, false, "+971500000001", "omar@example.com"),
                new ApplicationFamilyMember("Lina Ahmed", "Daughter", "Female", "2016-04-02", true, null, null)));
        familyPlan("300");
        Member m = new Member();
        m.setId(77L);
        m.setMemberId("MBR-0000000077");
        when(memberService.createMember(any())).thenReturn(MemberResponseDTO.fromEntity(m));
        when(applicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(memberRepository.existsByEmailIgnoreCase("omar@example.com")).thenReturn(true);

        service.approve(10L, false, "admin");

        ArgumentCaptor<MemberRequestDTO> req = ArgumentCaptor.forClass(MemberRequestDTO.class);
        verify(memberService).createMember(req.capture());
        MemberRequestDTO r = req.getValue();
        assertEquals("Family", r.getMembershipType());
        List<FamilyMemberDTO> family = r.getFamilyMembers();
        assertEquals(2, family.size());
        assertEquals("Omar Ahmed", family.get(0).getName());
        assertEquals("Husband", family.get(0).getRelationship());
        assertFalse(family.get(0).getIsMinor());
        assertNull(family.get(0).getEmail(), "an email another member already uses is left off, not a failed approval");
        assertTrue(family.get(1).getIsMinor());
        assertEquals("2016-04-02", family.get(1).getDateOfBirth());
        assertEquals(0, new BigDecimal("300").compareTo(r.getPaymentBreakdown().get(0).getAmount()));
    }

    @Test
    void familyPriceChangeSinceApplyingBlocksApproval() {
        MembershipApplication a = application(MembershipApplication.METHOD_ONLINE, MembershipApplication.PAYMENT_PAID);
        a.setFamilyMembers(List.of(new ApplicationFamilyMember("Omar Ahmed", "Husband", "Male", null, false, null, null)));
        familyPlan("450"); // applicant paid 300

        BusinessRuleViolationException e = assertThrows(BusinessRuleViolationException.class,
                () -> service.approve(10L, false, "admin"));
        assertTrue(e.getMessage().contains("450"));
        verify(memberService, never()).createMember(any());
        assertEquals(MembershipApplication.APPROVAL_PENDING, a.getApprovalStatus());
    }

    @Test
    void inactivePlanBlocksApproval() {
        application(MembershipApplication.METHOD_ONLINE, MembershipApplication.PAYMENT_PAID);
        MembershipPlan plan = new MembershipPlan();
        plan.setStatus("Inactive");
        when(planRepository.findById(5L)).thenReturn(Optional.of(plan));

        assertThrows(BusinessRuleViolationException.class, () -> service.approve(10L, false, "admin"));
        verify(memberService, never()).createMember(any());
    }

    @Test
    void rejectingPaidApplicationMarksPaymentRefunded() {
        MembershipApplication a = application(MembershipApplication.METHOD_ONLINE, MembershipApplication.PAYMENT_PAID);
        when(applicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ApplicationView view = service.reject(10L, "Duplicate application", "admin");

        assertEquals(MembershipApplication.APPROVAL_REJECTED, view.approvalStatus());
        assertEquals(MembershipApplication.PAYMENT_REFUNDED, a.getPaymentStatus());
        assertEquals("Duplicate application", a.getRejectionReason());
        verify(memberService, never()).createMember(any());
    }

    @Test
    void timestampsAreSentAsUtc() throws Exception {
        MembershipApplication a = application(MembershipApplication.METHOD_ONLINE, MembershipApplication.PAYMENT_PAID);
        a.setPaidAt(LocalDateTime.of(2026, 11, 10, 9, 58, 0));
        when(applicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ApplicationView view = service.reject(10L, "test", "admin");
        String json = new com.fasterxml.jackson.databind.ObjectMapper()
                .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule())
                .writeValueAsString(view);

        // A bare local time is read by browsers as their own time zone (showed "5h ago" in India).
        assertTrue(json.contains("2026-11-10T09:58:00Z"), json);
    }

    @Test
    void rejectNeedsReason() {
        assertThrows(IllegalArgumentException.class, () -> service.reject(10L, "  ", "admin"));
    }

    @Test
    void decidedApplicationCannotBeApprovedAgain() {
        MembershipApplication a = application(MembershipApplication.METHOD_ONLINE, MembershipApplication.PAYMENT_PAID);
        a.setApprovalStatus(MembershipApplication.APPROVAL_APPROVED);

        assertThrows(BusinessRuleViolationException.class, () -> service.approve(10L, false, "admin"));
        verify(memberService, never()).createMember(any());
    }

    @Test
    void otherBranchApplicationIsRefusedWhileABranchIsActive() {
        MembershipApplication a = new MembershipApplication();
        a.setBranchId(2L);
        when(applicationRepository.findById(10L)).thenReturn(Optional.of(a));

        assertThrows(BusinessRuleViolationException.class, () -> service.approve(10L, false, "admin"));
        assertEquals(1L, BranchContextHolder.getActiveBranchId());
    }

    @Test
    void allBranchesModeChecksAccessAndRestoresContext() {
        BranchContextHolder.clear();
        application(MembershipApplication.METHOD_ONLINE, MembershipApplication.PAYMENT_PAID);
        activePlanAndMember();

        service.approve(10L, false, "admin");

        verify(branchService).resolveBranchForCreate(1L);
        assertNull(BranchContextHolder.getActiveBranchId());
    }

    // ── Decision email ──────────────────────────────────────────────────────────

    private void mailReady() {
        when(emailService.isConfigured()).thenReturn(true);
        TenantContextHolder.setCurrentTenant("fitzone");
        when(tenantDataSources.gymName("fitzone")).thenReturn(Optional.of("Fitzone"));
        when(portfolioService.currencyCode(1L)).thenReturn("AED");
        Branch b = new Branch();
        b.setId(1L);
        b.setBranchName("Main Branch");
        b.setPhone("+97140000000");
        b.setEmail("main@fitzone.example");
        when(branchRepository.findById(1L)).thenReturn(Optional.of(b));
        when(applicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void rejectionEmailsTheEscapedReasonAndRefund() {
        MembershipApplication a = application(MembershipApplication.METHOD_ONLINE, MembershipApplication.PAYMENT_PAID);
        a.setFullName("Sara <b>Ahmed</b>");
        mailReady();

        ApplicationView view = service.reject(10L, "Gym is full this month.\n<script>x</script>", "admin");

        ArgumentCaptor<String> subject = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendEmail(eq("sara@example.com"), subject.capture(), html.capture());
        assertEquals("Your membership application at Fitzone · Main Branch", subject.getValue());
        String body = html.getValue();
        assertTrue(body.contains("Gym is full this month.<br>&lt;script&gt;x&lt;/script&gt;"), body);
        assertTrue(body.contains("Sara &lt;b&gt;Ahmed&lt;/b&gt;"), body);
        assertFalse(body.contains("<script>"), body);
        assertTrue(body.contains("AED 300.00 you paid (card ending 4242) has been refunded"), body);
        assertTrue(body.contains("main@fitzone.example"), body);
        assertEquals(MembershipApplication.EMAIL_SENT, view.decisionEmailStatus());
        assertTrue(view.emailConfigured());
        assertEquals(MembershipApplication.EMAIL_SENT, a.getDecisionEmailStatus());
    }

    @Test
    void rejectingCashApplicationSaysNoPaymentWasTaken() {
        application(MembershipApplication.METHOD_CASH, MembershipApplication.PAYMENT_PENDING);
        mailReady();

        service.reject(10L, "Incomplete details", "admin");

        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendEmail(any(), any(), html.capture());
        assertTrue(html.getValue().contains("No payment was taken."), html.getValue());
        assertFalse(html.getValue().contains("refunded"), html.getValue());
    }

    @Test
    void approvalEmailsTheMemberId() {
        MembershipApplication a = application(MembershipApplication.METHOD_ONLINE, MembershipApplication.PAYMENT_PAID);
        activePlanAndMember();
        mailReady();

        service.approve(10L, false, "admin");

        ArgumentCaptor<String> subject = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendEmail(eq("sara@example.com"), subject.capture(), html.capture());
        assertEquals("Welcome to Fitzone · Main Branch: your membership is approved", subject.getValue());
        assertTrue(html.getValue().contains("MBR-0000000077"), html.getValue());
        assertTrue(html.getValue().contains("AED 300.00, paid by card (card ending 4242)"), html.getValue());
        assertEquals(MembershipApplication.EMAIL_SENT, a.getDecisionEmailStatus());
    }

    @Test
    void noMailboxStillRejectsAndRecordsNotConfigured() {
        MembershipApplication a = application(MembershipApplication.METHOD_ONLINE, MembershipApplication.PAYMENT_PAID);
        when(applicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ApplicationView view = service.reject(10L, "Duplicate", "admin");

        verify(emailService, never()).sendEmail(any(), any(), any());
        assertEquals(MembershipApplication.APPROVAL_REJECTED, view.approvalStatus());
        assertEquals(MembershipApplication.EMAIL_NOT_CONFIGURED, view.decisionEmailStatus());
        assertFalse(view.emailConfigured());
        assertEquals(MembershipApplication.EMAIL_NOT_CONFIGURED, a.getDecisionEmailStatus());
    }

    @Test
    void failedSendStillRejectsAndRecordsTheReason() {
        MembershipApplication a = application(MembershipApplication.METHOD_ONLINE, MembershipApplication.PAYMENT_PAID);
        mailReady();
        doThrow(new RuntimeException("Failed to send email", new java.net.ConnectException("refused")))
                .when(emailService).sendEmail(any(), any(), any());

        ApplicationView view = service.reject(10L, "Duplicate", "admin");

        assertEquals(MembershipApplication.APPROVAL_REJECTED, a.getApprovalStatus());
        assertEquals(MembershipApplication.EMAIL_FAILED, view.decisionEmailStatus());
        assertNotNull(view.decisionEmailError());
    }

    @Test
    void resendEmailsADecidedApplicationAgain() {
        MembershipApplication a = application(MembershipApplication.METHOD_CASH, MembershipApplication.PAYMENT_VOID);
        a.setApprovalStatus(MembershipApplication.APPROVAL_REJECTED);
        a.setRejectionReason("Duplicate");
        a.setDecisionEmailStatus(MembershipApplication.EMAIL_NOT_CONFIGURED);
        mailReady();

        ApplicationView view = service.resendDecisionEmail(10L);

        verify(emailService).sendEmail(eq("sara@example.com"), any(), any());
        assertEquals(MembershipApplication.EMAIL_SENT, view.decisionEmailStatus());
    }

    @Test
    void pendingApplicationCannotBeResent() {
        application(MembershipApplication.METHOD_CASH, MembershipApplication.PAYMENT_PENDING);

        assertThrows(BusinessRuleViolationException.class, () -> service.resendDecisionEmail(10L));
        verify(emailService, never()).sendEmail(any(), any(), any());
    }
}
