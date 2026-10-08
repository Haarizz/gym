package com.company.project.services;

import com.company.project.dto.PaymentSplitDTO;
import com.company.project.dto.WalkInCheckInRequest;
import com.company.project.entities.Attendance;
import com.company.project.repositories.AttendanceReportSettingsRepository;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.MemberRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AttendanceWalkInPaymentTest {

    @Mock private AttendanceRepository attendanceRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private ReceiptService receiptService;
    @Mock private AttendanceReportSettingsRepository reportSettingsRepository;
    @Mock private BranchSettingsResolver branchSettingsResolver;

    @InjectMocks
    private AttendanceService attendanceService;

    private static WalkInCheckInRequest request(String amount) {
        WalkInCheckInRequest req = new WalkInCheckInRequest();
        req.setName("Day Visitor");
        req.setPhone("0500000000");
        req.setSessionType("Day Pass");
        req.setAmount(new BigDecimal(amount));
        return req;
    }

    private Attendance savedRecord() {
        ArgumentCaptor<Attendance> saved = ArgumentCaptor.forClass(Attendance.class);
        verify(attendanceRepository).save(saved.capture());
        return saved.getValue();
    }

    @Test
    void splitPaymentWithRemainderOnCreditRecordsWhatWasReceived() {
        WalkInCheckInRequest req = request("50");
        req.setPaidAmount(new BigDecimal("30"));
        req.setPaymentMethod("Mixed");
        List<PaymentSplitDTO> legs = List.of(new PaymentSplitDTO(), new PaymentSplitDTO());
        req.setPaymentBreakdown(legs);

        attendanceService.walkInCheckIn(req);

        assertEquals("partial", savedRecord().getWalkInPaymentStatus());
        verify(receiptService).createWalkInReceipt(eq("Day Visitor"), eq("0500000000"), eq("Day Pass"),
                eq(new BigDecimal("50")), eq(new BigDecimal("30")), eq("Mixed"), eq(legs),
                isNull(), isNull(), any(), any());
    }

    @Test
    void onlinePaymentKeepsItsBankAccount() {
        WalkInCheckInRequest req = request("50");
        req.setPaidAmount(new BigDecimal("50"));
        req.setPaymentMethod("Online Payment");
        req.setBankAccountCode("1020");
        req.setBankAccountName("Emirates NBD");

        attendanceService.walkInCheckIn(req);

        assertEquals("paid", savedRecord().getWalkInPaymentStatus());
        verify(receiptService).createWalkInReceipt(any(), any(), any(),
                eq(new BigDecimal("50")), eq(new BigDecimal("50")), eq("Online Payment"), isNull(),
                eq("1020"), eq("Emirates NBD"), any(), any());
    }

    @Test
    void allOnCreditIsPendingAndPaidAmountIsCappedAtTheCharge() {
        WalkInCheckInRequest onCredit = request("50");
        onCredit.setPaidAmount(BigDecimal.ZERO);
        onCredit.setPaymentMethod("Credit");
        attendanceService.walkInCheckIn(onCredit);
        assertEquals("pending", savedRecord().getWalkInPaymentStatus());
        verify(receiptService).createWalkInReceipt(any(), any(), any(),
                eq(new BigDecimal("50")), eq(BigDecimal.ZERO), eq("Credit"), any(), any(), any(), any(), any());
    }

    @Test
    void olderClientsSendingOnlyPaymentStatusStillWork() {
        WalkInCheckInRequest req = request("40");
        req.setPaymentStatus("paid");
        req.setPaymentMethod("Cash");

        attendanceService.walkInCheckIn(req);

        assertEquals("paid", savedRecord().getWalkInPaymentStatus());
        verify(receiptService).createWalkInReceipt(any(), any(), any(),
                eq(new BigDecimal("40")), eq(new BigDecimal("40")), eq("Cash"), any(), any(), any(), any(), any());
    }

    @Test
    void freeWalkInCreatesNoReceipt() {
        attendanceService.walkInCheckIn(request("0"));
        verify(receiptService, never()).createWalkInReceipt(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }
}
