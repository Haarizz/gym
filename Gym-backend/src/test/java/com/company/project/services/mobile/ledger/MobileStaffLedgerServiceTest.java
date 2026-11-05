package com.company.project.services.mobile.ledger;

import com.company.project.dto.mobile.ledger.StaffLedgerResponseDTO;
import com.company.project.dto.mobile.ledger.StaffLedgerResponseDTO.RecentEarningDTO;
import com.company.project.entities.*;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.*;
import com.company.project.security.UserDetailsImpl;
import com.company.project.performance.PerformanceEngine;
import com.company.project.performance.PerformanceTestData;
import com.company.project.performance.events.PerformanceEvent;
import com.company.project.performance.events.PerformanceEventRepository;
import com.company.project.performance.events.SourceLabels;
import com.company.project.performance.incentives.IncentivePlan;
import com.company.project.performance.incentives.IncentivePlanBonus;
import com.company.project.performance.incentives.IncentivePlanLine;
import com.company.project.performance.settlement.SettlementView;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MobileStaffLedgerServiceTest {

    @Mock
    private StaffRepository staffRepository;

    @Mock
    private SalaryPaymentRepository salaryPaymentRepository;

    @Mock
    private SalaryPaymentEmployeeRepository salaryPaymentEmployeeRepository;

    @Mock
    private PerformanceEngine engine;

    @Mock
    private PerformanceEventRepository events;

    @Mock
    private SourceLabels sourceLabels;

    private MobileStaffLedgerService ledgerService;

    private final Map<YearMonth, String> commission = new HashMap<>();
    private final Map<YearMonth, String> status = new HashMap<>();
    private UserDetailsImpl testPrincipal;
    private Staff testStaff;
    private YearMonth current;
    private YearMonth previous;

    @BeforeEach
    void setUp() {
        LedgerEarningsCalculator earnings = new LedgerEarningsCalculator(
                salaryPaymentRepository, salaryPaymentEmployeeRepository, engine, events, sourceLabels,
                PerformanceTestData.utcClock());
        ledgerService = new MobileStaffLedgerService(staffRepository, engine, earnings);

        testPrincipal = new UserDetailsImpl(100L, "staffuser", "staff@gymbios.com", "password", Collections.emptyList(), true);

        testStaff = new Staff();
        testStaff.setId(10L);
        testStaff.setStaffId("EMP-0010");
        testStaff.setName("Rahul Sharma");
        testStaff.setEmail("staff@gymbios.com");
        testStaff.setRole("Trainer");
        testStaff.setBranch("Main Branch");
        testStaff.setBaseSalary(new BigDecimal("18000"));
        testStaff.setUserId(100L);
        testStaff.setAppUsername("staffuser");

        current = YearMonth.now(java.time.ZoneOffset.UTC);
        previous = current.minusMonths(1);

        when(staffRepository.findByUserId(100L)).thenReturn(Optional.of(testStaff));
        when(salaryPaymentEmployeeRepository.findByEmployeeId(anyString())).thenReturn(Optional.empty());
        when(salaryPaymentRepository.findAll()).thenReturn(Collections.emptyList());
        when(events.findForStaff(anyLong(), any(), any(), any())).thenReturn(Collections.emptyList());
        when(sourceLabels.describe(any())).thenReturn(Map.of());
        when(engine.planFor(anyLong(), any())).thenReturn(null);
        when(engine.evaluate(eq(10L), any(YearMonth.class))).thenAnswer(inv -> {
            YearMonth m = inv.getArgument(1);
            return PerformanceTestData.result(10L, m)
                    .commission(commission.getOrDefault(m, "0"))
                    .status(status.getOrDefault(m, SettlementView.ESTIMATED))
                    .build();
        });
    }

    private static String monthName(YearMonth ym) {
        return ym.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
    }

    private static IncentivePlan plan() {
        IncentivePlan plan = new IncentivePlan();
        plan.setId(3L);
        plan.setName("Trainer commission");
        IncentivePlanLine admission = new IncentivePlanLine();
        admission.setMetric("MEMBER_ADMISSION");
        admission.setBasis(IncentivePlanLine.PERCENT_OF_AMOUNT);
        admission.setRate(new BigDecimal("15"));
        IncentivePlanLine pt = new IncentivePlanLine();
        pt.setMetric("PT_SESSION_DELIVERED");
        pt.setBasis(IncentivePlanLine.FIXED_PER_UNIT);
        pt.setRate(new BigDecimal("150"));
        IncentivePlanBonus bonus = new IncentivePlanBonus();
        bonus.setMetric("REVENUE_TOTAL");
        bonus.setThresholdPct(new BigDecimal("100"));
        bonus.setRewardType(IncentivePlanBonus.PERCENT_OF_METRIC_AMOUNT);
        bonus.setRewardValue(new BigDecimal("2"));
        plan.getLines().addAll(List.of(admission, pt));
        plan.getBonuses().add(bonus);
        return plan;
    }

    @Test
    @DisplayName("Throws EntityNotFoundException when principal is null")
    void testNullPrincipalThrows() {
        assertThrows(EntityNotFoundException.class, () -> ledgerService.getStaffLedger(null));
    }

    @Test
    @DisplayName("Throws EntityNotFoundException when no staff record is linked to user")
    void testMissingStaffThrows() {
        when(staffRepository.findByUserId(100L)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> ledgerService.getStaffLedger(testPrincipal));
    }

    @Test
    @DisplayName("No incentive plan: no commission and no implicit 5% rate")
    void testNoPlanEarnsNothing() {
        testStaff.setJoinDate(LocalDate.now());

        StaffLedgerResponseDTO response = ledgerService.getStaffLedger(testPrincipal);

        assertEquals(0, new BigDecimal("18000").compareTo(response.getSummary().getThisMonth()));
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getSummary().getCommission()));
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getSummary().getLastMonth()));
        assertNull(response.getSummary().getGrowthPercentage());
        assertEquals("—", response.getQuickStats().getGrowth());

        assertEquals(1, response.getCommissionStructure().size());
        assertEquals("NONE", response.getCommissionStructure().get(0).getType());
        assertTrue(response.getRecentEarnings().isEmpty());
    }

    @Test
    @DisplayName("Commission comes from the engine, the structure from the plan, activity from the ledger")
    void testLedgerFromEngine() {
        testStaff.setJoinDate(LocalDate.now().minusYears(1));

        SalaryPaymentEmployee payroll = new SalaryPaymentEmployee();
        payroll.setEmployeeId("EMP-0010");
        payroll.setAllowances(new BigDecimal("500"));
        when(salaryPaymentEmployeeRepository.findByEmployeeId("EMP-0010")).thenReturn(Optional.of(payroll));

        SalaryPayment prevPayment = new SalaryPayment();
        prevPayment.setId(7L);
        prevPayment.setEmployeeId("EMP-0010");
        prevPayment.setYear(previous.getYear());
        prevPayment.setMonth(monthName(previous));
        prevPayment.setNetSalary(new BigDecimal("20000"));
        prevPayment.setStatus("Paid");
        when(salaryPaymentRepository.findAll()).thenReturn(List.of(prevPayment));

        commission.put(current, "1500");
        commission.put(previous, "800"); // frozen (approved) amount for last month
        status.put(previous, SettlementView.APPROVED);
        when(engine.planFor(eq(10L), any())).thenReturn(plan());

        PerformanceEvent sale = new PerformanceEvent();
        sale.setId(55L);
        sale.setMetric("MEMBER_ADMISSION");
        sale.setQuantity(1);
        sale.setAmount(new BigDecimal("10000"));
        sale.setSourceType("receipt");
        sale.setSourceId(9L);
        sale.setOccurredAt(LocalDateTime.now(java.time.ZoneOffset.UTC).minusMinutes(5));
        when(events.findForStaff(eq(10L), any(), any(), any())).thenReturn(List.of(sale));
        when(sourceLabels.describe(any())).thenReturn(Map.of("receipt", Map.of(9L, new SourceLabels.Label("Gold", "Asha"))));

        StaffLedgerResponseDTO response = ledgerService.getStaffLedger(testPrincipal);

        // 18000 base + 1500 commission + 500 allowances
        assertEquals(0, new BigDecimal("1500").compareTo(response.getSummary().getCommission()));
        assertEquals(0, new BigDecimal("20000").compareTo(response.getSummary().getThisMonth()));
        // 20000 recorded salary + 800 approved commission
        assertEquals(0, new BigDecimal("20800").compareTo(response.getSummary().getLastMonth()));
        assertEquals(-4, response.getSummary().getGrowthPercentage());

        assertEquals("MEMBER_ADMISSION", response.getCommissionStructure().get(0).getType());
        assertEquals("15%", response.getCommissionStructure().get(0).getAmount());
        assertEquals("150 per session", response.getCommissionStructure().get(1).getAmount());
        assertEquals("TARGET_BONUS", response.getCommissionStructure().get(2).getType());
        assertEquals("+2%", response.getCommissionStructure().get(2).getAmount());

        assertEquals(2, response.getRecentEarnings().size());
        RecentEarningDTO earned = response.getRecentEarnings().stream()
                .filter(e -> "COMMISSION".equals(e.getType())).findFirst().orElseThrow();
        assertEquals(0, new BigDecimal("1500").compareTo(earned.getAmount())); // 15% of 10000
        assertEquals("pending", earned.getStatus());
        assertTrue(earned.getTitle().contains("Gold"));
        RecentEarningDTO salary = response.getRecentEarnings().stream()
                .filter(e -> "SALARY".equals(e.getType())).findFirst().orElseThrow();
        assertEquals("paid", salary.getStatus());
    }

    @Test
    @DisplayName("Without a recorded payment, last month uses the configured salary only if the staff had joined")
    void testLastMonthWithoutPayrollRun() {
        testStaff.setJoinDate(LocalDate.now().minusMonths(3));

        StaffLedgerResponseDTO response = ledgerService.getStaffLedger(testPrincipal);

        assertEquals(0, new BigDecimal("18000").compareTo(response.getSummary().getLastMonth()));
        assertEquals(0, response.getSummary().getGrowthPercentage());
    }

    @Test
    @DisplayName("Generates salary slip bytes for authenticated staff")
    void testGetSalarySlip() {
        byte[] slipBytes = ledgerService.getSalarySlip(testPrincipal, 2026, 3);

        assertNotNull(slipBytes);
        String slipContent = new String(slipBytes);
        assertTrue(slipContent.contains("GYMBIOS PAYROLL ADVICE"));
        assertTrue(slipContent.contains("Rahul Sharma"));
        assertTrue(slipContent.contains("EMP-0010"));
        assertTrue(slipContent.contains("March 2026"));
        assertTrue(slipContent.contains("Not yet processed"));
        assertFalse(slipContent.contains("TDS"));
    }
}
