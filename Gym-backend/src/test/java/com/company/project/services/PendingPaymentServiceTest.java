package com.company.project.services;

import com.company.project.dto.PendingPaymentDTOs.DuePage;
import com.company.project.dto.PendingPaymentDTOs.Stats;
import com.company.project.dto.PendingPaymentDTOs.WriteOff;
import com.company.project.dto.WriteOffRequestDTO;
import com.company.project.entities.Member;
import com.company.project.entities.MemberDueWriteOff;
import com.company.project.entities.Receipt;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.performance.PerformanceClock;
import com.company.project.repositories.MemberDueWriteOffRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.security.BranchContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PendingPaymentServiceTest {

    @Mock private ReceiptRepository receiptRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private MemberDueWriteOffRepository writeOffRepository;
    @Mock private StaffRepository staffRepository;
    @Mock private PerformanceClock clock;

    @InjectMocks private PendingPaymentService service;

    @BeforeEach
    void activeBranch() {
        BranchContextHolder.setActiveBranchId(1L);
        lenient().when(clock.zone(any())).thenReturn(java.time.ZoneOffset.UTC);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("manager@gym.test", null, List.of()));
    }

    @AfterEach
    void clear() {
        BranchContextHolder.clear();
        SecurityContextHolder.clearContext();
    }

    private static Receipt bill(long id, String amount, String paidAtCreation, String paidToDate, String status) {
        Receipt r = new Receipt();
        r.setId(id);
        r.setBranchId(1L);
        r.setReceiptNo("RCPT-" + id);
        r.setInvoiceNo("INV-" + id);
        r.setMemberDbId(7L);
        r.setMemberId("GYM00007");
        r.setMemberName("Ahmed Ali");
        r.setMemberPhone("0522823056");
        r.setTransactionType("New");
        r.setPlanName("Gold Individual");
        r.setTransactionDate(LocalDateTime.now().minusDays(40));
        r.setDueDate(LocalDateTime.now().minusDays(30));
        r.setAmount(new BigDecimal(amount));
        r.setPaidAmount(new BigDecimal(paidAtCreation));
        r.setTotalPaidToDate(paidToDate == null ? null : new BigDecimal(paidToDate));
        r.setStatus(status);
        return r;
    }

    private static Member member(String outstanding) {
        Member m = new Member();
        m.setId(7L);
        m.setOutstandingBalance(new BigDecimal(outstanding));
        m.setPaymentStatus("partial");
        return m;
    }

    private static WriteOffRequestDTO request(String reason, String notes) {
        WriteOffRequestDTO req = new WriteOffRequestDTO();
        req.setReason(reason);
        req.setNotes(notes);
        return req;
    }

    private void stubSaves() {
        when(writeOffRepository.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void writesOffOnlyWhatIsStillOwedAndLeavesThePaymentsAlone() {
        // Billed 1,000; 300 at sign-up + a later 100 settlement = 400 collected; 600 still owed.
        Receipt bill = bill(11, "1000.00", "300.00", "400.00", "Partial");
        Member member = member("600.00");
        when(receiptRepository.findByIdForUpdate(11L)).thenReturn(Optional.of(bill));
        when(memberRepository.findById(7L)).thenReturn(Optional.of(member));
        stubSaves();

        WriteOff result = service.writeOff(11L, request("UNCOLLECTABLE", "Moved abroad"));

        assertEquals(new BigDecimal("600.00"), result.writtenOffAmount());
        assertEquals(new BigDecimal("400.00"), result.paidAmount());
        assertEquals(new BigDecimal("1000.00"), result.originalAmount());
        assertEquals("manager@gym.test", result.writtenOffBy());

        // The bill keeps its real payment facts; only status and the written-off amount change.
        assertEquals("Written Off", bill.getStatus());
        assertEquals(new BigDecimal("600.00"), bill.getWrittenOffAmount());
        assertEquals(new BigDecimal("300.00"), bill.getPaidAmount());
        assertEquals(new BigDecimal("400.00"), bill.getTotalPaidToDate());
        assertEquals(new BigDecimal("1000.00"), bill.getAmount());

        // The due is gone from the member's balance.
        assertEquals(0, member.getOutstandingBalance().signum());
        assertEquals("paid", member.getPaymentStatus());

        // Not a payment: the only receipt saved is the bill itself — no settlement receipt.
        ArgumentCaptor<Receipt> saved = ArgumentCaptor.forClass(Receipt.class);
        verify(receiptRepository, times(1)).save(saved.capture());
        assertSame(bill, saved.getValue());
    }

    @Test
    void otherDuesStayOnTheMembersBalance() {
        Receipt bill = bill(12, "500.00", "200.00", null, "Partial");
        Member member = member("800.00");
        when(receiptRepository.findByIdForUpdate(12L)).thenReturn(Optional.of(bill));
        when(memberRepository.findById(7L)).thenReturn(Optional.of(member));
        stubSaves();

        service.writeOff(12L, request("OLD_BALANCE", null));

        assertEquals(new BigDecimal("500.00"), member.getOutstandingBalance());
        assertEquals("partial", member.getPaymentStatus());
        assertEquals(new BigDecimal("300.00"), bill.getWrittenOffAmount());
    }

    @Test
    void historyRecordCopiesTheBillAndMember() {
        Receipt bill = bill(13, "250.00", "0.00", null, "Pending");
        when(receiptRepository.findByIdForUpdate(13L)).thenReturn(Optional.of(bill));
        when(memberRepository.findById(7L)).thenReturn(Optional.of(member("250.00")));
        stubSaves();

        service.writeOff(13L, request("discontinued", "  Left the gym  "));

        ArgumentCaptor<MemberDueWriteOff> rec = ArgumentCaptor.forClass(MemberDueWriteOff.class);
        verify(writeOffRepository).saveAndFlush(rec.capture());
        MemberDueWriteOff w = rec.getValue();
        assertEquals(13L, w.getReceiptId());
        assertEquals("RCPT-13", w.getReceiptNo());
        assertEquals("GYM00007", w.getMemberCode());
        assertEquals("Ahmed Ali", w.getMemberName());
        assertEquals("Membership · Gold Individual", w.getBillDescription());
        assertEquals("DISCONTINUED", w.getReason());
        assertEquals("Left the gym", w.getNotes());
        assertEquals(1L, w.getBranchId());
        assertNotNull(w.getWrittenOffAt());
    }

    @Test
    void fullyPaidBillCannotBeWrittenOff() {
        when(receiptRepository.findByIdForUpdate(14L)).thenReturn(Optional.of(bill(14, "300.00", "300.00", "300.00", "Paid")));

        assertThrows(BusinessRuleViolationException.class, () -> service.writeOff(14L, request("UNCOLLECTABLE", null)));
        verify(receiptRepository, never()).save(any());
        verify(writeOffRepository, never()).saveAndFlush(any());
    }

    @Test
    void writtenOffBillCannotBeWrittenOffAgain() {
        when(receiptRepository.findByIdForUpdate(15L)).thenReturn(Optional.of(bill(15, "300.00", "0.00", null, "Written Off")));

        BusinessRuleViolationException e = assertThrows(BusinessRuleViolationException.class,
                () -> service.writeOff(15L, request("UNCOLLECTABLE", null)));
        assertTrue(e.getMessage().contains("already been written off"));
        verify(memberRepository, never()).save(any());
    }

    @Test
    void secondConcurrentWriteOffFailsOnTheUniqueIndex() {
        when(receiptRepository.findByIdForUpdate(16L)).thenReturn(Optional.of(bill(16, "300.00", "0.00", null, "Pending")));
        when(memberRepository.findById(7L)).thenReturn(Optional.of(member("300.00")));
        when(writeOffRepository.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("uq_member_due_write_offs_receipt"));

        assertThrows(BusinessRuleViolationException.class, () -> service.writeOff(16L, request("UNCOLLECTABLE", null)));
    }

    @Test
    void paymentReceiptIsNotABill() {
        Receipt settlement = bill(17, "100.00", "100.00", null, "Pending");
        settlement.setTransactionType("Payment");
        when(receiptRepository.findByIdForUpdate(17L)).thenReturn(Optional.of(settlement));

        assertThrows(BusinessRuleViolationException.class, () -> service.writeOff(17L, request("UNCOLLECTABLE", null)));
    }

    @Test
    void needsABranchAndAReason() {
        assertThrows(BusinessRuleViolationException.class, () -> service.writeOff(18L, request("", null)));
        assertThrows(BusinessRuleViolationException.class, () -> service.writeOff(18L, request("OTHER", " ")));
        BranchContextHolder.clear();
        assertThrows(BusinessRuleViolationException.class, () -> service.writeOff(18L, request("UNCOLLECTABLE", null)));
        verify(receiptRepository, never()).findByIdForUpdate(any());
    }

    @Test
    void listsOnlyBillsStillOwingAndSplitsOverdueFromUpcoming() {
        Receipt overdue = bill(21, "500.00", "200.00", null, "Partial");
        Receipt upcoming = bill(22, "300.00", "0.00", null, "Pending");
        upcoming.setDueDate(LocalDateTime.now().plusDays(10));
        Receipt coveredAlready = bill(23, "0.00", "0.00", "0.00", "Pending");
        when(receiptRepository.findOpenBills("%ahmed%")).thenReturn(List.of(overdue, upcoming, coveredAlready));

        DuePage all = service.list(" Ahmed ", "all", "amount", "desc", 1, 20);
        assertEquals(2, all.allCount());
        assertEquals(1, all.overdueCount());
        assertEquals(1, all.upcomingCount());
        assertEquals(List.of(21L, 22L), all.items().stream().map(d -> d.receiptId()).toList());
        assertEquals(new BigDecimal("300.00"), all.items().get(0).amountDue());
        assertTrue(all.items().get(0).overdue());
        assertEquals(30, all.items().get(0).daysOverdue());

        DuePage upcomingOnly = service.list(" Ahmed ", "upcoming", "due_date", "asc", 1, 20);
        assertEquals(List.of(22L), upcomingOnly.items().stream().map(d -> d.receiptId()).toList());
        assertEquals(1, upcomingOnly.pagination().getTotal());
    }

    @Test
    void statsAddUpOpenDuesAndWriteOffsSeparately() {
        Receipt overdue = bill(31, "500.00", "200.00", null, "Partial");
        Receipt upcoming = bill(32, "300.00", "0.00", null, "Pending");
        upcoming.setDueDate(LocalDateTime.now().plusDays(3));
        when(receiptRepository.findOpenBills("%")).thenReturn(List.of(overdue, upcoming));
        MemberDueWriteOff w = new MemberDueWriteOff();
        w.setWrittenOffAmount(new BigDecimal("600.00"));
        when(writeOffRepository.findInPeriod(any(), any())).thenReturn(List.of(w));

        Stats s = service.stats(null, null);

        assertEquals(new BigDecimal("600.00"), s.totalDue());
        assertEquals(new BigDecimal("300.00"), s.overdueAmount());
        assertEquals(new BigDecimal("300.00"), s.upcomingAmount());
        assertEquals(new BigDecimal("600.00"), s.writtenOffAmount());
        assertEquals(1, s.writeOffCount());
        verify(receiptRepository, never()).save(any());
        verify(receiptRepository).findOpenBills(eq("%"));
    }
}
