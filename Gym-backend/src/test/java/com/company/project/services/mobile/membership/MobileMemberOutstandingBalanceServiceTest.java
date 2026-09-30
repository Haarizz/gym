package com.company.project.services.mobile.membership;

import com.company.project.dto.PaymentSplitDTO;
import com.company.project.dto.SettlePaymentRequestDTO;
import com.company.project.dto.mobile.membership.MobileOutstandingBalanceDTO;
import com.company.project.dto.mobile.membership.MobileOutstandingBalanceDTO.BalancePaymentStatus;
import com.company.project.dto.mobile.membership.MobileOutstandingBalanceDTO.PayBlockedReason;
import com.company.project.dto.mobile.membership.MobileOutstandingBalanceSettleRequestDTO;
import com.company.project.entities.Currency;
import com.company.project.entities.Member;
import com.company.project.entities.MobileIdempotencyRecord;
import com.company.project.entities.Receipt;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.ReceiptService;
import com.company.project.services.mobile.family.MobileIdempotencyService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.TypedQuery;
import org.hibernate.Session;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MobileMemberOutstandingBalanceServiceTest {

    @Mock private MemberRepository memberRepository;
    @Mock private ReceiptRepository receiptRepository;
    @Mock private ReceiptService receiptService;
    @Mock private MobileIdempotencyService idempotencyService;
    @Mock private EntityManager entityManager;
    @Mock private Session session;
    @Mock private TypedQuery<Currency> currencyQuery;

    private MobileMemberOutstandingBalanceService service;

    private final UserDetailsImpl principal = new UserDetailsImpl(
            101L, "member", "member@example.com", "secret",
            List.of(new SimpleGrantedAuthority("ROLE_MEMBER")), true);
    private final UUID key = UUID.randomUUID();
    private MobileIdempotencyRecord lease;
    private Member member;
    private final List<Receipt> openBills = new ArrayList<>();

    private static BigDecimal bd(String v) { return new BigDecimal(v); }

    @BeforeEach
    void setUp() {
        service = new MobileMemberOutstandingBalanceService(memberRepository, receiptRepository, receiptService,
                idempotencyService, new ObjectMapper().registerModule(new JavaTimeModule()));
        ReflectionTestUtils.setField(service, "entityManager", entityManager);
        when(entityManager.unwrap(Session.class)).thenReturn(session);
        when(entityManager.createQuery(anyString(), eq(Currency.class))).thenReturn(currencyQuery);
        when(currencyQuery.setMaxResults(anyInt())).thenReturn(currencyQuery);
        when(currencyQuery.getResultStream()).thenAnswer(inv -> Stream.empty());

        member = new Member();
        member.setId(7L);
        member.setName("Asha");
        member.setMembershipPlan("Gold Membership");
        member.setOutstandingBalance(bd("6000"));
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(member));
        when(receiptRepository.findPendingByMember(7L)).thenAnswer(inv -> openBills);

        lease = new MobileIdempotencyRecord();
        lease.setIdempotencyKey(key);
        lease.setLeaseId(UUID.randomUUID());
        lease.setStatus("IN_PROGRESS");
        when(idempotencyService.acquireOrRenewLease(eq(key), anyString())).thenReturn(lease);
    }

    private Receipt bill(long id, String amount, String paid, String status, LocalDateTime date) {
        Receipt r = new Receipt();
        r.setId(id);
        r.setMemberDbId(7L);
        r.setTransactionType("New");
        r.setAmount(bd(amount));
        r.setPaidAmount(bd(paid));
        r.setTotalPaidToDate(bd(paid));
        r.setStatus(status);
        r.setTransactionDate(date);
        return r;
    }

    private MobileOutstandingBalanceSettleRequestDTO cardRequest(String expected) {
        PaymentSplitDTO leg = new PaymentSplitDTO();
        leg.setMethod("Card");
        leg.setCardType("Visa");
        leg.setAmount(bd("1")); // client-side amount — must be ignored
        MobileOutstandingBalanceSettleRequestDTO r = new MobileOutstandingBalanceSettleRequestDTO();
        r.setExpectedAmount(bd(expected));
        r.setPaymentMethodUsed("Card");
        r.setPaymentBreakdown(List.of(leg));
        return r;
    }

    private void stubSettlementPaysDownBalance() {
        when(receiptService.settlePayment(any())).thenAnswer(inv -> {
            SettlePaymentRequestDTO req = inv.getArgument(0);
            BigDecimal total = req.getBillPayments().stream()
                    .map(SettlePaymentRequestDTO.BillPayment::getPayAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            member.setOutstandingBalance(member.getOutstandingBalance().subtract(total));
            Receipt settlement = new Receipt();
            settlement.setId(99L);
            settlement.setReceiptNo("RCPT-0000000099");
            return com.company.project.dto.ReceiptResponseDTO.fromEntity(settlement);
        });
    }

    // ── Balance discovery ────────────────────────────────────────────────────

    @Test
    @DisplayName("Web Credit purchase partly paid: 10,000 total, 4,000 paid → 6,000 outstanding and payable")
    void partiallyPaidMembership() {
        openBills.add(bill(1, "10000", "4000", "Partial", LocalDateTime.now().minusDays(10)));

        MobileOutstandingBalanceDTO dto = service.getOutstandingBalance(principal);

        assertEquals(7L, dto.getMembershipId());
        assertEquals(0, bd("10000").compareTo(dto.getTotalAmount()));
        assertEquals(0, bd("4000").compareTo(dto.getPaidAmount()));
        assertEquals(0, bd("6000").compareTo(dto.getOutstandingAmount()));
        assertEquals(0, bd("6000").compareTo(dto.getPayableAmount()));
        assertEquals(BalancePaymentStatus.PARTIALLY_PAID, dto.getPaymentStatus());
        assertTrue(dto.isCanPay());
        assertNull(dto.getPayBlockedReason());
    }

    @Test
    @DisplayName("Fully paid membership is not payable")
    void fullyPaidMembership() {
        member.setOutstandingBalance(BigDecimal.ZERO);

        MobileOutstandingBalanceDTO dto = service.getOutstandingBalance(principal);

        assertFalse(dto.isCanPay());
        assertEquals(PayBlockedReason.NO_BALANCE, dto.getPayBlockedReason());
        assertEquals(0, BigDecimal.ZERO.compareTo(dto.getPayableAmount()));
        assertEquals(BalancePaymentStatus.PAID, dto.getPaymentStatus());
    }

    @Test
    @DisplayName("A bill still awaiting reception approval is not self-service payable")
    void unapprovedBillExcluded() {
        Receipt pending = bill(1, "10000", "0", "Pending", LocalDateTime.now());
        pending.setApprovalStatus("PENDING");
        openBills.add(pending);

        MobileOutstandingBalanceDTO dto = service.getOutstandingBalance(principal);

        assertFalse(dto.isCanPay());
        assertEquals(PayBlockedReason.NO_PAYABLE_BILLS, dto.getPayBlockedReason());
        assertTrue(dto.getBills().isEmpty());
    }

    @Test
    @DisplayName("Another member's (or a nonexistent) membership id is a 404")
    void foreignMembershipIsNotFound() {
        assertThrows(EntityNotFoundException.class, () -> service.getOutstandingBalance(principal, 8L));
    }

    @Test
    @DisplayName("No membership in this gym → empty, non-payable state")
    void noMembership() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.empty());

        MobileOutstandingBalanceDTO dto = service.getOutstandingBalance(principal);

        assertNull(dto.getMembershipId());
        assertFalse(dto.isCanPay());
        assertEquals(PayBlockedReason.NO_MEMBERSHIP, dto.getPayBlockedReason());
    }

    // ── Settlement ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("Settles the server's payable amount across bills oldest-first, ignoring the client's leg amount")
    void settlesAuthoritativeAmount() {
        openBills.add(bill(2, "3000", "0", "Pending", LocalDateTime.now().minusDays(1)));
        openBills.add(bill(1, "10000", "7000", "Partial", LocalDateTime.now().minusDays(30)));
        stubSettlementPaysDownBalance();

        String json = service.settle(principal, 7L, key, "fp", cardRequest("6000"));

        verify(entityManager).refresh(member, LockModeType.PESSIMISTIC_WRITE);
        ArgumentCaptor<SettlePaymentRequestDTO> captor = ArgumentCaptor.forClass(SettlePaymentRequestDTO.class);
        verify(receiptService).settlePayment(captor.capture());
        SettlePaymentRequestDTO req = captor.getValue();
        assertEquals(7L, req.getMemberDbId());
        assertEquals("Card", req.getPaymentMethod());
        assertEquals(2, req.getBillPayments().size());
        assertEquals(1L, req.getBillPayments().get(0).getReceiptId());
        assertEquals(0, bd("3000").compareTo(req.getBillPayments().get(0).getPayAmount()));
        assertEquals(2L, req.getBillPayments().get(1).getReceiptId());
        assertEquals(0, bd("3000").compareTo(req.getBillPayments().get(1).getPayAmount()));
        assertEquals(0, bd("6000").compareTo(req.getPaymentBreakdown().get(0).getAmount()));
        assertEquals("Visa", req.getPaymentBreakdown().get(0).getCardType());

        verify(idempotencyService).acquireOrRenewLease(key, "outstanding-balance:7:fp");
        verify(idempotencyService).completeRequest(eq(key), eq(lease.getLeaseId()), eq(json));
        assertTrue(json.contains("\"receiptNo\":\"RCPT-0000000099\""));
        assertEquals(0, BigDecimal.ZERO.compareTo(member.getOutstandingBalance()));
    }

    @Test
    @DisplayName("Balance changed since the screen opened (paid elsewhere) → rejected, nothing settled")
    void staleExpectedAmountRejected() {
        openBills.add(bill(1, "10000", "4000", "Partial", LocalDateTime.now()));

        assertThrows(BusinessRuleViolationException.class,
                () -> service.settle(principal, 7L, key, "fp", cardRequest("8000")));

        verify(receiptService, never()).settlePayment(any());
        verify(idempotencyService).failRequest(key, lease.getLeaseId());
    }

    @Test
    @DisplayName("Already fully paid (e.g. settled at reception) → rejected")
    void alreadyPaidRejected() {
        member.setOutstandingBalance(BigDecimal.ZERO);

        assertThrows(BusinessRuleViolationException.class,
                () -> service.settle(principal, 7L, key, "fp", cardRequest("6000")));
        verify(receiptService, never()).settlePayment(any());
    }

    @Test
    @DisplayName("Cash needs reception to confirm the money — not allowed from the app")
    void cashRejected() {
        openBills.add(bill(1, "10000", "4000", "Partial", LocalDateTime.now()));
        MobileOutstandingBalanceSettleRequestDTO req = cardRequest("6000");
        req.setPaymentMethodUsed("Cash");
        req.setPaymentBreakdown(null);

        assertThrows(IllegalArgumentException.class, () -> service.settle(principal, 7L, key, "fp", req));
        verify(receiptService, never()).settlePayment(any());
    }

    @Test
    @DisplayName("Replay of a completed request returns the original result without paying again")
    void completedReplayIsNotSettledTwice() {
        lease.setStatus("COMPLETED");
        lease.setResponsePayload("{\"receiptNo\":\"RCPT-1\"}");

        String json = service.settle(principal, 7L, key, "fp", cardRequest("6000"));

        assertEquals("{\"receiptNo\":\"RCPT-1\"}", json);
        verify(receiptService, never()).settlePayment(any());
    }

    @Test
    @DisplayName("Another member's membership id is rejected before any idempotency state is touched")
    void foreignMembershipSettleRejected() {
        assertThrows(EntityNotFoundException.class,
                () -> service.settle(principal, 8L, key, "fp", cardRequest("6000")));
        verify(idempotencyService, never()).acquireOrRenewLease(any(), anyString());
        verify(receiptService, never()).settlePayment(any());
    }
}
