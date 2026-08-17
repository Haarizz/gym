package com.company.project.services.mobile.ledger;

import com.company.project.dto.mobile.ledger.StaffLedgerResponseDTO;
import com.company.project.entities.*;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.*;
import com.company.project.security.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
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
    private CommissionRuleRepository commissionRuleRepository;

    @Mock
    private ReceiptRepository receiptRepository;

    @Mock
    private LeadRepository leadRepository;

    @Mock
    private SalaryAdvanceRepository salaryAdvanceRepository;

    @InjectMocks
    private MobileStaffLedgerService ledgerService;

    private UserDetailsImpl testPrincipal;
    private Staff testStaff;

    @BeforeEach
    void setUp() {
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
    @DisplayName("Calculates staff ledger correctly with configured target and historical payment")
    void testLedgerCalculationsWithData() {
        when(staffRepository.findByUserId(100L)).thenReturn(Optional.of(testStaff));

        LocalDate today = LocalDate.now();
        int year = today.getYear();
        int month = today.getMonthValue();

        StaffTarget target = new StaffTarget();
        target.setRevenueTarget(new BigDecimal("150000"));
        target.setRevenueAchieved(new BigDecimal("160000"));
        target.setCommissionEarned(new BigDecimal("6000"));
        target.setForecast(9);

        when(staffTargetRepository.findByStaff_IdAndYearAndMonth(10L, year, month))
                .thenReturn(Optional.of(target));
        when(salaryPaymentEmployeeRepository.findByEmployeeId("EMP-0010"))
                .thenReturn(Optional.empty());

        // Previous month payment
        LocalDate prevMonthDate = today.minusMonths(1);
        SalaryPayment prevPayment = new SalaryPayment();
        prevPayment.setEmployeeId("EMP-0010");
        prevPayment.setYear(prevMonthDate.getYear());
        prevPayment.setMonth(prevMonthDate.getMonth().getDisplayName(java.time.format.TextStyle.FULL, Locale.ENGLISH));
        prevPayment.setNetSalary(new BigDecimal("22000"));
        when(salaryPaymentRepository.findAll()).thenReturn(List.of(prevPayment));

        // Commission Rule for role
        CommissionRule rule = new CommissionRule();
        rule.setRole("Trainer");
        rule.setBaseCommission(new BigDecimal("10.00"));
        when(commissionRuleRepository.findByRole("Trainer")).thenReturn(Optional.of(rule));

        // Receipts
        when(receiptRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));
        when(leadRepository.count(any(Specification.class))).thenReturn(42L);

        StaffLedgerResponseDTO response = ledgerService.getStaffLedger(testPrincipal);

        assertNotNull(response);
        assertEquals(year, response.getPeriod().getYear());
        assertEquals(month, response.getPeriod().getMonth());

        // Summary
        assertEquals(new BigDecimal("18000"), response.getSummary().getBaseSalary());
        assertEquals(new BigDecimal("6000"), response.getSummary().getCommission());
        assertEquals(new BigDecimal("26000"), response.getSummary().getThisMonth()); // 18000 + 6000 + 2000 (bonus target achieved)
        assertEquals(new BigDecimal("22000"), response.getSummary().getLastMonth());
        assertEquals(18, response.getSummary().getGrowthPercentage()); // (26000 - 22000)/22000 = ~18%

        // Quick Stats & Next Payout
        assertNotNull(response.getQuickStats().getNextPayoutDate());
        assertNotNull(response.getNextPayout().getDate());

        // Breakdown
        assertFalse(response.getBreakdown().isEmpty());
        assertEquals(3, response.getBreakdown().size());
        assertEquals("Base Salary", response.getBreakdown().get(0).getCategory());
        assertEquals(new BigDecimal("18000"), response.getBreakdown().get(0).getAmount());

        // Commission Structure
        assertFalse(response.getCommissionStructure().isEmpty());
        assertEquals("MEMBERSHIP_SALE", response.getCommissionStructure().get(0).getType());

        // Tax Info
        assertEquals(String.valueOf(year), response.getTaxInfo().getTaxYear());
        assertEquals(42, response.getTaxInfo().getConversions());
        assertTrue(response.getTaxInfo().getYtdEarnings().compareTo(BigDecimal.ZERO) > 0);
        assertTrue(response.getTaxInfo().getTdsDeducted().compareTo(BigDecimal.ZERO) > 0);

        // Tax Documents
        assertEquals(3, response.getTaxDocuments().size());
    }

    @Test
    @DisplayName("Handles zero values and empty cases gracefully without exceptions")
    void testZeroValuesHandling() {
        testStaff.setBaseSalary(BigDecimal.ZERO);
        when(staffRepository.findByUserId(100L)).thenReturn(Optional.of(testStaff));

        LocalDate today = LocalDate.now();
        when(staffTargetRepository.findByStaff_IdAndYearAndMonth(10L, today.getYear(), today.getMonthValue()))
                .thenReturn(Optional.empty());
        when(salaryPaymentEmployeeRepository.findByEmployeeId("EMP-0010"))
                .thenReturn(Optional.empty());
        when(salaryPaymentRepository.findAll()).thenReturn(Collections.emptyList());
        when(commissionRuleRepository.findByRole(any())).thenReturn(Optional.empty());
        when(receiptRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        when(receiptRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));
        when(leadRepository.count(any(Specification.class))).thenReturn(0L);

        StaffLedgerResponseDTO response = ledgerService.getStaffLedger(testPrincipal);

        assertNotNull(response);
        assertDoesNotThrow(() -> response.getSummary().getGrowthPercentage());
        assertDoesNotThrow(() -> response.getBreakdown().get(0).getPercentage());
    }

    @Test
    @DisplayName("Generates salary slip bytes for authenticated staff")
    void testGetSalarySlip() {
        when(staffRepository.findByUserId(100L)).thenReturn(Optional.of(testStaff));

        byte[] slipBytes = ledgerService.getSalarySlip(testPrincipal, 2026, 3);

        assertNotNull(slipBytes);
        assertTrue(slipBytes.length > 0);
        String slipContent = new String(slipBytes);
        assertTrue(slipContent.contains("GYMBIOS PAYROLL ADVICE"));
        assertTrue(slipContent.contains("Rahul Sharma"));
        assertTrue(slipContent.contains("EMP-0010"));
        assertTrue(slipContent.contains("March 2026"));
    }

    @Test
    @DisplayName("Generates tax document bytes for authenticated staff")
    void testGetTaxDocument() {
        when(staffRepository.findByUserId(100L)).thenReturn(Optional.of(testStaff));

        byte[] docBytes = ledgerService.getTaxDocument(testPrincipal, "1");

        assertNotNull(docBytes);
        assertTrue(docBytes.length > 0);
        String docContent = new String(docBytes);
        assertTrue(docContent.contains("GYMBIOS TAX & TDS CERTIFICATE"));
        assertTrue(docContent.contains("Rahul Sharma"));
        assertTrue(docContent.contains("EMP-0010"));
    }
}
