package com.company.project.services;

import com.company.project.dto.StaffTargetResponseDTO;
import com.company.project.entities.Receipt;
import com.company.project.entities.SaleTransaction;
import com.company.project.entities.SaleTransactionItem;
import com.company.project.entities.Staff;
import com.company.project.repositories.LeadRepository;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.repositories.SaleTransactionItemRepository;
import com.company.project.repositories.SaleTransactionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class StaffProgressCalculatorUnitsTest {

    private final ReceiptRepository receipts = mock(ReceiptRepository.class);
    private final SaleTransactionRepository sales = mock(SaleTransactionRepository.class);
    private final SaleTransactionItemRepository items = mock(SaleTransactionItemRepository.class);
    private final com.company.project.repositories.TrainingSessionRepository trainingSessions =
            mock(com.company.project.repositories.TrainingSessionRepository.class);
    private final com.company.project.repositories.MemberAddonRepository memberAddons =
            mock(com.company.project.repositories.MemberAddonRepository.class);
    private final com.company.project.repositories.AddonPlanRepository addonPlans =
            mock(com.company.project.repositories.AddonPlanRepository.class);
    private final StaffProgressCalculator calculator = new StaffProgressCalculator(
            receipts, mock(LeadRepository.class), sales, items, trainingSessions,
            memberAddons, addonPlans);

    private static final LocalDateTime START = LocalDateTime.of(2026, 10, 1, 0, 0);
    private static final LocalDateTime END = LocalDateTime.of(2026, 11, 1, 0, 0);

    private static Receipt receipt(String type) {
        Receipt r = new Receipt();
        r.setTransactionType(type);
        return r;
    }

    private static SaleTransaction sale(long id) {
        SaleTransaction s = new SaleTransaction();
        s.setId(id);
        return s;
    }

    private static SaleTransactionItem item(int qty) {
        SaleTransactionItem i = new SaleTransactionItem();
        i.setQuantity(qty);
        return i;
    }

    @SuppressWarnings("unchecked")
    @Test
    void countsMembershipUnitsByTypeAndPosSalesAndItems() {
        Staff staff = new Staff();
        staff.setName("Test staff");
        when(receipts.findAll(any(Specification.class))).thenReturn(List.of(
                receipt("New"), receipt("New"), receipt("Renewal"), receipt("Add-on"),
                receipt("Daily Entry"), receipt("Payment")));
        when(sales.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(sale(1), sale(2)));
        when(items.findByTransactionIdIn(anyCollection())).thenReturn(List.of(item(2), item(3), item(1)));

        Map<String, Integer> units = calculator.computeUnits(staff, "test", START, END);

        assertEquals(2, units.get("admissions"));
        assertEquals(1, units.get("renewals"));
        assertEquals(1, units.get("addons"));
        assertEquals(1, units.get("walkins"));   // instalment "Payment" receipts aren't units
        assertEquals(2, units.get("pos_sales"));
        assertEquals(6, units.get("pos_items"));
    }

    @Test
    void countsBookedPtSessionsTheTrainerDeliveredUpToToday() {
        Staff trainer = new Staff();
        trainer.setId(7L);
        java.time.LocalDate monthStart = java.time.LocalDate.now().withDayOfMonth(1);
        LocalDateTime start = monthStart.atStartOfDay();
        LocalDateTime end = monthStart.plusMonths(1).atStartOfDay();
        when(trainingSessions.countBookedPtSessionsByTrainerBetween(List.of(7L), monthStart, java.time.LocalDate.now()))
                .thenReturn(List.<Object[]>of(new Object[]{7L, 4L}));

        assertEquals(4, calculator.computeUnits(trainer, "", start, end).get("pt_sessions"));
    }

    @SuppressWarnings("unchecked")
    @Test
    void wholeGymRevenueIsEveryMembershipPaymentPlusEveryPosSaleNet() {
        Receipt paid = receipt("New");
        paid.setStatus("Paid");
        paid.setPaidAmount(new java.math.BigDecimal("49.00"));
        Receipt renewal = receipt("Renewal");
        renewal.setStatus("Paid");
        renewal.setPaidAmount(new java.math.BigDecimal("100.00"));
        when(receipts.findAll(any(Specification.class))).thenReturn(List.of(paid, renewal));
        SaleTransaction a = sale(1);
        a.setTotalAmount(new java.math.BigDecimal("126.50"));
        a.setRefundedAmount(java.math.BigDecimal.ZERO);
        SaleTransaction b = sale(2);
        b.setTotalAmount(new java.math.BigDecimal("40.00"));
        b.setRefundedAmount(new java.math.BigDecimal("10.00"));
        when(sales.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(a, b));

        // 49 + 100 membership + 126.50 + (40 - 10) POS = 305.50
        assertEquals(0, new java.math.BigDecimal("305.50").compareTo(calculator.computeGymRevenue(START, END)));
    }

    @SuppressWarnings("unchecked")
    @Test
    void splitsRevenueIntoMembershipsPosAndPersonalTraining() {
        Receipt admission = paidReceipt(1L, "New", "Gold Individual", "300.00");
        Receipt ptByName = paidReceipt(2L, "Add-on", "PT - 10 Sessions", "500.00");
        Receipt ptByPlan = paidReceipt(3L, "Add-on", "Coach Ali Package", "250.00");
        Receipt ptByAddon = paidReceipt(4L, "Add-on", "Trainer Pack", "120.00");
        Receipt locker = paidReceipt(5L, "Add-on", "Locker", "50.00");
        Receipt ptInstalment = paidReceipt(6L, "Payment", "Personal Training", "80.00");
        when(receipts.findAll(any(Specification.class)))
                .thenReturn(List.of(admission, ptByName, ptByPlan, ptByAddon, locker, ptInstalment));
        when(addonPlans.findPtPlanNamesLower()).thenReturn(List.of("coach ali package"));
        when(memberAddons.findPtReceiptIds(anyCollection())).thenReturn(List.of(4L));
        SaleTransaction sale = sale(9);
        sale.setTotalAmount(new java.math.BigDecimal("40.00"));
        sale.setRefundedAmount(java.math.BigDecimal.ZERO);
        when(sales.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(sale));

        StaffProgressCalculator.RevenueBreakdown r =
                calculator.computeRevenueBreakdown(new Staff(), "cashier", START, END);

        assertEquals(0, new java.math.BigDecimal("350.00").compareTo(r.memberships()));  // admission + locker
        assertEquals(0, new java.math.BigDecimal("950.00").compareTo(r.pt()));           // 500 + 250 + 120 + 80
        assertEquals(0, new java.math.BigDecimal("40.00").compareTo(r.pos()));
        assertEquals(0, new java.math.BigDecimal("1340.00").compareTo(r.total()));
    }

    @SuppressWarnings("unchecked")
    @Test
    void creditsAppPtBookingsToTheSessionTrainerAsPtRevenue() {
        Staff trainer = new Staff();
        trainer.setId(7L);
        trainer.setName("Coach Sam");
        // Receipts the trainer took at the desk, then the app booking on their PT session
        // (processed by "Mobile App", named after the session, which doesn't say PT).
        Receipt deskRenewal = paidReceipt(1L, "Renewal", "Monthly", "100.00");
        Receipt appBooking = paidReceipt(2L, "Class Booking", "Strength 1:1 — 2026-10-12", "150.00");
        appBooking.setProcessedBy("Mobile App");
        when(receipts.findAll(any(Specification.class))).thenReturn(List.of(deskRenewal), List.of(appBooking));
        when(trainingSessions.findPtBookingReceiptIdsByTrainer(7L)).thenReturn(List.of(2L));
        when(trainingSessions.findPtBookingReceiptIds(anyCollection())).thenReturn(List.of(2L));

        StaffProgressCalculator.RevenueBreakdown r = calculator.computeRevenueBreakdown(trainer, "sam", START, END);

        assertEquals(0, new java.math.BigDecimal("100.00").compareTo(r.memberships()));
        assertEquals(0, new java.math.BigDecimal("150.00").compareTo(r.pt()));
        assertEquals(0, new java.math.BigDecimal("250.00").compareTo(r.total()));
    }

    @SuppressWarnings("unchecked")
    @Test
    void aPtBookingTheTrainerTookThemselvesCountsOnce() {
        Staff trainer = new Staff();
        trainer.setId(7L);
        trainer.setName("Coach Sam");
        Receipt booking = paidReceipt(2L, "Class Booking", "PT — 2026-10-12", "150.00");
        when(receipts.findAll(any(Specification.class))).thenReturn(List.of(booking), List.of(booking));
        when(trainingSessions.findPtBookingReceiptIdsByTrainer(7L)).thenReturn(List.of(2L));

        assertEquals(0, new java.math.BigDecimal("150.00")
                .compareTo(calculator.computeRevenueBreakdown(trainer, "sam", START, END).pt()));
    }

    private static Receipt paidReceipt(Long id, String type, String plan, String paid) {
        Receipt r = receipt(type);
        r.setId(id);
        r.setStatus("Paid");
        r.setPlanName(plan);
        r.setPaidAmount(new java.math.BigDecimal(paid));
        return r;
    }

    @Test
    void fillsUnitTargetsAchievedFromLiveCounts() {
        StaffTargetResponseDTO dto = new StaffTargetResponseDTO();
        dto.setUnitTargetsJson("[{\"service\":\"admissions\",\"target_units\":10,\"achieved_units\":0},"
                + "{\"service\":\"karate\",\"target_units\":5,\"achieved_units\":1}]");
        dto.withUnits(Map.of("admissions", 3));
        assertTrue(dto.getUnitTargetsJson().contains("\"service\":\"admissions\",\"target_units\":10,\"achieved_units\":3"),
                dto.getUnitTargetsJson());
        // Old untrackable services keep their stored value.
        assertTrue(dto.getUnitTargetsJson().contains("\"service\":\"karate\",\"target_units\":5,\"achieved_units\":1"),
                dto.getUnitTargetsJson());
    }
}
