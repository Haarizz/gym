package com.company.project.services.mobile.ledger;

import com.company.project.dto.mobile.ledger.StaffLedgerResponseDTO;
import com.company.project.dto.mobile.ledger.StaffLedgerResponseDTO.RecentEarningDTO;
import com.company.project.entities.*;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.*;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.StaffProgressCalculator;
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
    private StaffTargetRepository staffTargetRepository;

    @Mock
    private SalaryPaymentRepository salaryPaymentRepository;

    @Mock
    private SalaryPaymentEmployeeRepository salaryPaymentEmployeeRepository;

    @Mock
    private ReceiptRepository receiptRepository;

    @Mock
    private StaffProgressCalculator progressCalculator;

    private MobileStaffLedgerService ledgerService;

    private UserDetailsImpl testPrincipal;
    private Staff testStaff;
    private YearMonth current;
    private YearMonth previous;

    @BeforeEach
    void setUp() {
        LedgerEarningsCalculator earnings = new LedgerEarningsCalculator(
                staffTargetRepository, salaryPaymentRepository, salaryPaymentEmployeeRepository,
                receiptRepository, progressCalculator);
        ledgerService = new MobileStaffLedgerService(staffRepository, progressCalculator, earnings);

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

        current = YearMonth.now();
        previous = current.minusMonths(1);

        when(staffRepository.findByUserId(100L)).thenReturn(Optional.of(testStaff));
        when(staffTargetRepository.findByStaff_IdAndYearAndMonthOrderByCreatedAtDesc(anyLong(), anyInt(), anyInt()))
                .thenReturn(Collections.emptyList());
        when(salaryPaymentEmployeeRepository.findByEmployeeId(anyString())).thenReturn(Optional.empty());
        when(salaryPaymentRepository.findAll()).thenReturn(Collections.emptyList());
        when(receiptRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        // No sales and no commission rule unless a test says otherwise; rate helpers behave for real.
        when(progressCalculator.computeCommission(any(), any(), any(), any())).thenReturn(BigDecimal.ZERO);
        when(progressCalculator.computeConversions(any(), any(), any(), any())).thenReturn(0);
        when(progressCalculator.findCommissionRule(any())).thenReturn(Optional.empty());
        when(progressCalculator.baseCommissionRate(any())).thenCallRealMethod();
        when(progressCalculator.admissionCommissionRate(any())).thenCallRealMethod();
        when(progressCalculator.commissionOn(any(), any())).thenCallRealMethod();
    }

    private static LocalDateTime monthStart(YearMonth ym) {
        return ym.atDay(1).atStartOfDay();
    }

    private static String monthName(YearMonth ym) {
        return ym.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
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
    @DisplayName("A staff member who joined this month has no last-month earnings, commission or invented entries")
    void testFreshStaffShowsNoInventedData() {
        testStaff.setJoinDate(LocalDate.now());

        StaffLedgerResponseDTO response = ledgerService.getStaffLedger(testPrincipal);

        assertEquals(0, new BigDecimal("18000").compareTo(response.getSummary().getThisMonth()));
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getSummary().getCommission()));
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getSummary().getLastMonth()));
        assertNull(response.getSummary().getGrowthPercentage());
        assertEquals("—", response.getQuickStats().getGrowth());

        assertEquals("Allowances", response.getBreakdown().get(2).getCategory());
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getBreakdown().get(1).getAmount()));
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getBreakdown().get(2).getAmount()));

        // Same 5% default the web Targets pages use when the role has no rule.
        assertEquals(2, response.getCommissionStructure().size());
        assertEquals("5%", response.getCommissionStructure().get(0).getAmount());
        assertEquals("5%", response.getCommissionStructure().get(1).getAmount());

        assertTrue(response.getRecentEarnings().isEmpty());
        assertTrue(response.getTaxDocuments().isEmpty());
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getTaxInfo().getYtdEarnings()));
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getTaxInfo().getTdsDeducted()));
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getTaxInfo().getTotalCommission()));
        assertEquals(0, response.getTaxInfo().getConversions());
    }

    @Test
    @DisplayName("Uses recorded payroll, the web commission calculation and the role's commission rule")
    void testLedgerFromRealRecords() {
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

        // Live commission 1200 this month, but the stored target says 1500 — web shows the larger.
        when(progressCalculator.computeCommission(eq(testStaff), eq("staffuser"), eq(monthStart(current)), any()))
                .thenReturn(new BigDecimal("1200"));
        StaffTarget target = new StaffTarget();
        target.setCommissionEarned(new BigDecimal("1500"));
        when(staffTargetRepository.findByStaff_IdAndYearAndMonthOrderByCreatedAtDesc(10L, current.getYear(), current.getMonthValue()))
                .thenReturn(List.of(target));
        when(progressCalculator.computeCommission(eq(testStaff), eq("staffuser"), eq(monthStart(previous)), any()))
                .thenReturn(new BigDecimal("800"));
        when(progressCalculator.computeConversions(any(), any(), any(), any())).thenReturn(3);

        CommissionRule rule = new CommissionRule();
        rule.setRole("Trainer");
        rule.setBaseCommission(new BigDecimal("10.00"));
        rule.setAdmissionCommission(new BigDecimal("15.00"));
        rule.setTargetBonusesJson("[{\"threshold\":100,\"bonus\":2.0}]");
        when(progressCalculator.findCommissionRule(testStaff)).thenReturn(Optional.of(rule));

        Receipt sale = new Receipt();
        sale.setId(55L);
        sale.setStatus("Paid");
        sale.setTransactionType("New");
        sale.setPaidAmount(new BigDecimal("10000"));
        sale.setMemberName("Asha");
        sale.setPlanName("Gold");
        sale.setTransactionDate(LocalDateTime.now());
        when(receiptRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(sale)));

        StaffLedgerResponseDTO response = ledgerService.getStaffLedger(testPrincipal);

        // 18000 base + 1500 commission + 500 allowances
        assertEquals(0, new BigDecimal("1500").compareTo(response.getSummary().getCommission()));
        assertEquals(0, new BigDecimal("20000").compareTo(response.getSummary().getThisMonth()));
        // 20000 recorded salary + 800 commission
        assertEquals(0, new BigDecimal("20800").compareTo(response.getSummary().getLastMonth()));
        assertEquals(-4, response.getSummary().getGrowthPercentage());
        assertEquals("-4%", response.getQuickStats().getGrowth());

        assertEquals("15%", response.getCommissionStructure().get(0).getAmount());
        assertEquals("10%", response.getCommissionStructure().get(1).getAmount());
        assertEquals("Reach 100% of target", response.getCommissionStructure().get(2).getLabel());
        assertEquals("+2%", response.getCommissionStructure().get(2).getAmount());

        assertEquals(2, response.getRecentEarnings().size());
        RecentEarningDTO commission = response.getRecentEarnings().stream()
                .filter(e -> "COMMISSION".equals(e.getType())).findFirst().orElseThrow();
        assertEquals(0, new BigDecimal("1500").compareTo(commission.getAmount())); // 15% admission rate
        assertEquals("pending", commission.getStatus());
        RecentEarningDTO salary = response.getRecentEarnings().stream()
                .filter(e -> "SALARY".equals(e.getType())).findFirst().orElseThrow();
        assertEquals(0, new BigDecimal("20000").compareTo(salary.getAmount()));
        assertEquals("paid", salary.getStatus());

        assertEquals(3, response.getTaxInfo().getConversions());
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getTaxInfo().getTdsDeducted()));
        assertTrue(response.getTaxDocuments().isEmpty());
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

    @Test
    @DisplayName("Tax documents are not issued, so requesting one is not found")
    void testGetTaxDocumentNotFound() {
        assertThrows(EntityNotFoundException.class, () -> ledgerService.getTaxDocument(testPrincipal, "1"));
    }
}
