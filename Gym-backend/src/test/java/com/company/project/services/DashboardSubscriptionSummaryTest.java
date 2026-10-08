package com.company.project.services;

import com.company.project.dto.MinorChargeDTO;
import com.company.project.entities.Receipt;
import com.company.project.repositories.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardSubscriptionSummaryTest {

    @Mock private MemberRepository memberRepository;
    @Mock private ReceiptRepository receiptRepository;
    @Mock private AttendanceRepository attendanceRepository;
    @Mock private StaffRepository staffRepository;
    @Mock private NotificationService notificationService;
    @Mock private TrainingSessionRepository trainingSessionRepository;
    @Mock private BookingRepository bookingRepository;
    @Mock private LeadRepository leadRepository;
    @Mock private FollowUpRepository followUpRepository;
    @Mock private StaffAttendanceRepository staffAttendanceRepository;
    @Mock private RevenueDashboardService revenueDashboardService;

    @InjectMocks
    private DashboardService dashboardService;

    private static final LocalDateTime NOW = LocalDateTime.now();

    private static Receipt receipt(long id, Long memberDbId, String type, String plan, String paid, LocalDateTime at) {
        Receipt r = new Receipt();
        r.setId(id);
        r.setMemberDbId(memberDbId);
        r.setTransactionType(type);
        r.setPlanName(plan);
        r.setPaidAmount(paid != null ? new BigDecimal(paid) : null);
        r.setAmount(paid != null ? new BigDecimal(paid) : null);
        r.setTransactionDate(at);
        return r;
    }

    @Test
    void cheaperPlanChangeIsARenewalNotAnUpgrade() {
        Receipt downgrade = receipt(50, 7L, "Renewal", "Silver Monthly", "150", NOW);
        when(receiptRepository.findSalesOfTypesBetween(anyList(), any(), any())).thenReturn(List.of(downgrade));
        when(receiptRepository.findMembershipReceiptsBefore(anyList(), any())).thenReturn(List.of(
                receipt(51, 7L, "New", "Gold Monthly", "300", NOW.minusMonths(1)),
                downgrade));

        Map<String, Object> summary = dashboardService.getSubscriptionSummary("today");

        assertEquals(1L, card(summary, "renew").get("count"));
        assertEquals(new BigDecimal("150.00"), card(summary, "renew").get("collected"));
        assertEquals(0L, card(summary, "upgrade").get("count"));
        assertEquals(new BigDecimal("0.00"), card(summary, "upgrade").get("collected"));
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> card(Map<String, Object> summary, String key) {
        return ((List<Map<String, Object>>) summary.get("cards")).stream()
                .filter(c -> key.equals(c.get("key"))).findFirst().orElseThrow();
    }

    @Test
    void bucketsEachTypeAndSumsMoneyReceived() {
        Receipt newPaid = receipt(10, 1L, "New", "Gold Monthly", "300.00", NOW);
        Receipt newOnCredit = receipt(11, 2L, "New", "Gold Monthly", "0.00", NOW);
        Receipt sameRenewal = receipt(12, 3L, "Renewal", "Silver Monthly", "150.50", NOW);
        Receipt upgrade = receipt(13, 4L, "Renewal", "Gold Annual", "2400.00", NOW);
        Receipt addon = receipt(14, 1L, "Add-on", "Locker", "50.00", NOW);
        Receipt dayPass1 = receipt(15, null, "Daily Entry", "Day Pass", "40.00", NOW);
        Receipt dayPass2 = receipt(16, null, "Daily Entry", "Day Pass", null, NOW);
        when(receiptRepository.findSalesOfTypesBetween(anyList(), any(), any()))
                .thenReturn(List.of(newPaid, newOnCredit, sameRenewal, upgrade, addon, dayPass1, dayPass2));
        when(receiptRepository.findMembershipReceiptsBefore(anyList(), any())).thenReturn(List.of(
                receipt(1, 3L, "New", "Silver Monthly", "150.50", NOW.minusMonths(1)),
                receipt(2, 4L, "New", "Gold Monthly", "300.00", NOW.minusMonths(1)),
                sameRenewal,
                upgrade));

        Map<String, Object> summary = dashboardService.getSubscriptionSummary("today");

        assertEquals("today", summary.get("period"));
        assertEquals(2L, card(summary, "new").get("count"));
        assertEquals(new BigDecimal("300.00"), card(summary, "new").get("collected"));
        assertEquals(1L, card(summary, "renew").get("count"));
        assertEquals(new BigDecimal("150.50"), card(summary, "renew").get("collected"));
        assertEquals(1L, card(summary, "upgrade").get("count"));
        assertEquals(new BigDecimal("2400.00"), card(summary, "upgrade").get("collected"));
        assertEquals(1L, card(summary, "addons").get("count"));
        assertEquals(2L, card(summary, "dayPass").get("count"));
        assertEquals(new BigDecimal("40.00"), card(summary, "dayPass").get("collected"));
    }

    @Test
    void pendingCountsSalesStillOwingAndSumsWhatIsOwed() {
        Receipt onCredit = receipt(40, 1L, "New", "Gold Monthly", "0", NOW);
        onCredit.setAmount(new BigDecimal("300"));
        onCredit.setStatus("Pending");
        Receipt partial = receipt(41, 2L, "New", "Gold Monthly", "100", NOW);
        partial.setAmount(new BigDecimal("300"));
        partial.setStatus("Partial");
        partial.setTotalPaidToDate(new BigDecimal("120"));   // 20 more settled later
        Receipt settledLater = receipt(42, 3L, "New", "Gold Monthly", "0", NOW);
        settledLater.setAmount(new BigDecimal("300"));
        settledLater.setStatus("Paid");
        settledLater.setTotalPaidToDate(new BigDecimal("300"));
        Receipt dayPassUnpaid = receipt(43, null, "Daily Entry", "Day Pass", "0", NOW);
        dayPassUnpaid.setAmount(new BigDecimal("40"));
        dayPassUnpaid.setStatus("Pending");
        when(receiptRepository.findSalesOfTypesBetween(anyList(), any(), any()))
                .thenReturn(List.of(onCredit, partial, settledLater, dayPassUnpaid));

        Map<String, Object> summary = dashboardService.getSubscriptionSummary("today");

        assertEquals(3L, card(summary, "new").get("count"));
        assertEquals(2L, card(summary, "new").get("pendingCount"));
        assertEquals(new BigDecimal("480.00"), card(summary, "new").get("pendingAmount"));
        assertEquals(1L, card(summary, "dayPass").get("pendingCount"));
        assertEquals(new BigDecimal("40.00"), card(summary, "dayPass").get("pendingAmount"));
        assertEquals(0L, card(summary, "renew").get("pendingCount"));
        assertEquals(new BigDecimal("0.00"), card(summary, "renew").get("pendingAmount"));
    }

    @Test
    void renewalWithNoEarlierReceiptCountsAsRenew() {
        Receipt renewal = receipt(20, 5L, "Renewal", "Gold Monthly", "300", NOW);
        when(receiptRepository.findSalesOfTypesBetween(anyList(), any(), any())).thenReturn(List.of(renewal));
        when(receiptRepository.findMembershipReceiptsBefore(anyList(), any())).thenReturn(List.of(renewal));

        Map<String, Object> summary = dashboardService.getSubscriptionSummary("month");

        assertEquals(1L, card(summary, "renew").get("count"));
        assertEquals(0L, card(summary, "upgrade").get("count"));
    }

    @Test
    void minorRenewalOnGuardianReceiptIsComparedWithTheMinorsOwnHistory() {
        // Guardian (id 6) is on "Adult Gold"; their minor (id 60) renews "Kids Basic" like-for-like
        Receipt minorNew = receipt(30, 6L, "New", "Kids Basic", "100", NOW.minusMonths(1));
        minorNew.setRemarks("Charge for family member: Sam (Son)");
        minorNew.setMinorCharges(List.of(new MinorChargeDTO("MBR-60", 60L, "Sam", new BigDecimal("100"))));
        Receipt guardianNew = receipt(31, 6L, "New", "Adult Gold", "300", NOW.minusMonths(1));
        Receipt minorRenewal = receipt(32, 6L, "Renewal", "Kids Basic", "100", NOW);
        minorRenewal.setRemarks("Charge for family member: Sam (Son)");
        minorRenewal.setMinorCharges(List.of(new MinorChargeDTO("MBR-60", 60L, "Sam", new BigDecimal("100"))));
        when(receiptRepository.findSalesOfTypesBetween(anyList(), any(), any())).thenReturn(List.of(minorRenewal));
        when(receiptRepository.findMembershipReceiptsBefore(anyList(), any()))
                .thenReturn(List.of(minorNew, guardianNew, minorRenewal));

        Map<String, Object> summary = dashboardService.getSubscriptionSummary("today");

        assertEquals(1L, card(summary, "renew").get("count"));
        assertEquals(0L, card(summary, "upgrade").get("count"));
    }

    @Test
    void noRenewalsSkipsHistoryLookupAndReturnsAllCardsAtZero() {
        when(receiptRepository.findSalesOfTypesBetween(anyList(), any(), any())).thenReturn(List.of());

        Map<String, Object> summary = dashboardService.getSubscriptionSummary("week");

        verify(receiptRepository, never()).findMembershipReceiptsBefore(anyList(), any());
        for (String key : List.of("new", "renew", "upgrade", "addons", "dayPass")) {
            assertEquals(0L, card(summary, key).get("count"));
            assertEquals(new BigDecimal("0.00"), card(summary, key).get("collected"));
        }
    }
}
