package com.company.project.services.mobile.dashboard.admin;

import com.company.project.dto.mobile.dashboard.admin.AdminDashboardKpiDTO;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.mobile.dashboard.AdminDashboardBookingRepository;
import com.company.project.repositories.mobile.dashboard.AdminDashboardReceiptRepository;
import com.company.project.repositories.mobile.dashboard.AdminDashboardSaleTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminDashboardKpiServiceTest {

    @Mock private AdminDashboardReceiptRepository receiptRepository;
    @Mock private AdminDashboardSaleTransactionRepository saleTransactionRepository;
    @Mock private AdminDashboardBookingRepository bookingRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private AttendanceRepository attendanceRepository;

    @InjectMocks
    private AdminDashboardKpiService kpiService;

    private AdminDashboardDateRange range;

    @BeforeEach
    void setUp() {
        range = AdminDashboardDateRange.of(LocalDate.of(2026, 3, 20), LocalDate.of(2026, 3, 26));
    }

    @Test
    void percentageChange_previousZero_currentPositive_isHundredPercent() {
        assertEquals(100.0, AdminDashboardKpiService.percentageChange(BigDecimal.TEN, BigDecimal.ZERO));
    }

    @Test
    void percentageChange_bothZero_isZero() {
        assertEquals(0.0, AdminDashboardKpiService.percentageChange(BigDecimal.ZERO, BigDecimal.ZERO));
    }

    @Test
    void percentageChange_normalIncrease() {
        Double change = AdminDashboardKpiService.percentageChange(BigDecimal.valueOf(120), BigDecimal.valueOf(100));
        assertEquals(20.0, change, 0.001);
    }

    @Test
    void totalCollectionsKpi_sumsAllTransactionTypes_andComputesGrowth() {
        when(receiptRepository.sumPaidByTransactionTypesInPeriod(
                eqUnordered(AdminDashboardKpiService.ALL_COLLECTION_TRANSACTION_TYPES), any(), any()))
                .thenReturn(BigDecimal.valueOf(1200), BigDecimal.valueOf(1000));

        AdminDashboardKpiDTO dto = kpiService.totalCollectionsKpi(range);

        assertEquals("total-collections", dto.getId());
        assertEquals(BigDecimal.valueOf(1200), dto.getValue());
        assertEquals(20.0, dto.getChangePercent(), 0.001);
        assertTrue(dto.isClickable());
        assertTrue(dto.isAvailable());
    }

    @Test
    void checkInsKpi_isNeverClickable() {
        when(attendanceRepository.countByDateRange(any(), any())).thenReturn(10L, 8L);

        AdminDashboardKpiDTO dto = kpiService.checkInsKpi(range);

        assertFalse(dto.isClickable(), "check-ins has no detail sheet in the existing frontend");
    }

    @Test
    void activeMembersKpi_isCurrentStateSnapshot_withNoGrowthFigure() {
        when(memberRepository.countByMembershipStatus("active")).thenReturn(500L);

        AdminDashboardKpiDTO dto = kpiService.activeMembersKpi();

        assertEquals(BigDecimal.valueOf(500), dto.getValue());
        assertNull(dto.getChangePercent(), "active members is a live snapshot, not a period comparison");
    }

    @Test
    void churnFigures_computesRateAgainstBaselineOfActivePlusChurned() {
        when(memberRepository.countByMembershipStatusAndExpiryDateBetween(eqStr("expired"), any(), any()))
                .thenReturn(10L);
        when(memberRepository.countByMembershipStatus("active")).thenReturn(90L);

        AdminDashboardKpiService.ChurnFigures figures = kpiService.churnFigures(range.getStart(), range.getEnd());

        assertEquals(10L, figures.churnedCount);
        assertEquals(100L, figures.baselineCount);
        assertEquals(0, BigDecimal.valueOf(10.00).compareTo(figures.churnRatePercent));
        assertEquals(0, BigDecimal.valueOf(90.00).compareTo(figures.retentionRatePercent));
    }

    private static List<String> eqUnordered(List<String> expected) {
        return org.mockito.ArgumentMatchers.argThat(actual -> actual != null
                && actual.size() == expected.size() && actual.containsAll(expected));
    }

    private static String eqStr(String expected) {
        return org.mockito.ArgumentMatchers.eq(expected);
    }
}
