package com.company.project.services.mobile.ledger;

import com.company.project.dto.mobile.ledger.trainer.TrainerLedgerResponseDTO;
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
class MobileTrainerLedgerServiceTest {

    @Mock
    private StaffRepository staffRepository;

    @Mock
    private TrainingSessionRepository trainingSessionRepository;

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

    private MobileTrainerLedgerService ledgerService;

    private UserDetailsImpl testPrincipal;
    private Staff trainer;
    private YearMonth current;

    @BeforeEach
    void setUp() {
        LedgerEarningsCalculator earnings = new LedgerEarningsCalculator(
                staffTargetRepository, salaryPaymentRepository, salaryPaymentEmployeeRepository,
                receiptRepository, progressCalculator);
        ledgerService = new MobileTrainerLedgerService(staffRepository, trainingSessionRepository, earnings);

        testPrincipal = new UserDetailsImpl(200L, "trainer", "trainer@gymbios.com", "password", Collections.emptyList(), true);

        trainer = new Staff();
        trainer.setId(20L);
        trainer.setStaffId("EMP-0020");
        trainer.setName("Jose Mourinho");
        trainer.setRole("Trainer");
        trainer.setBaseSalary(new BigDecimal("20000"));
        trainer.setUserId(200L);
        trainer.setAppUsername("trainer");

        current = YearMonth.now();

        when(staffRepository.findByUserId(200L)).thenReturn(Optional.of(trainer));
        when(staffTargetRepository.findByStaff_IdAndYearAndMonthOrderByCreatedAtDesc(anyLong(), anyInt(), anyInt()))
                .thenReturn(Collections.emptyList());
        when(salaryPaymentEmployeeRepository.findByEmployeeId(anyString())).thenReturn(Optional.empty());
        when(salaryPaymentRepository.findAll()).thenReturn(Collections.emptyList());
        when(receiptRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));
        when(trainingSessionRepository.countByTrainer_IdAndStatusAndDateBetween(anyLong(), anyString(), any(), any()))
                .thenReturn(0L);

        when(progressCalculator.computeCommission(any(), any(), any(), any())).thenReturn(BigDecimal.ZERO);
        when(progressCalculator.findCommissionRule(any())).thenReturn(Optional.empty());
        when(progressCalculator.baseCommissionRate(any())).thenCallRealMethod();
        when(progressCalculator.admissionCommissionRate(any())).thenCallRealMethod();
        when(progressCalculator.commissionOn(any(), any())).thenCallRealMethod();
    }

    @Test
    @DisplayName("Throws EntityNotFoundException when principal is null")
    void testNullPrincipalThrows() {
        assertThrows(EntityNotFoundException.class, () -> ledgerService.getTrainerLedger(null));
    }

    @Test
    @DisplayName("A trainer created this month has nothing last month and nothing paid yet")
    void testFreshTrainer() {
        trainer.setJoinDate(LocalDate.now());

        TrainerLedgerResponseDTO response = ledgerService.getTrainerLedger(testPrincipal);

        assertEquals(0, new BigDecimal("20000").compareTo(response.getSummary().getThisMonth()));
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getSummary().getLastMonth()));
        assertEquals(0, BigDecimal.ZERO.compareTo(response.getSummary().getPaid()));
        assertEquals(0, new BigDecimal("20000").compareTo(response.getSummary().getPending()));
        assertEquals("—", response.getQuickStats().getGrowth());

        assertEquals("Base Salary", response.getBreakdown().get(0).getCategory());
        assertEquals(100, response.getBreakdown().get(0).getPercentage());

        assertTrue(response.getRecentTransactions().isEmpty());
        assertEquals("0", response.getTaxInfo().getYtdEarnings());
        assertNull(response.getTaxInfo().getAvgPerSession());
        assertTrue(response.getTaxDocuments().isEmpty());
    }

    @Test
    @DisplayName("Paid reflects this month's recorded payroll payment; last month uses last month's payment")
    void testPaidFromPayroll() {
        trainer.setJoinDate(LocalDate.now().minusYears(1));

        SalaryPayment thisMonth = payment(1L, current, "15000");
        SalaryPayment lastMonth = payment(2L, current.minusMonths(1), "19000");
        when(salaryPaymentRepository.findAll()).thenReturn(List.of(lastMonth, thisMonth));
        when(progressCalculator.computeCommission(eq(trainer), eq("trainer"), eq(current.atDay(1).atStartOfDay()), any()))
                .thenReturn(new BigDecimal("1000"));
        when(trainingSessionRepository.countByTrainer_IdAndStatusAndDateBetween(eq(20L), eq("completed"), any(), any()))
                .thenReturn(12L);

        TrainerLedgerResponseDTO response = ledgerService.getTrainerLedger(testPrincipal);

        assertEquals(0, new BigDecimal("21000").compareTo(response.getSummary().getThisMonth()));
        assertEquals(0, new BigDecimal("19000").compareTo(response.getSummary().getLastMonth()));
        assertEquals(0, new BigDecimal("15000").compareTo(response.getSummary().getPaid()));
        assertEquals(0, new BigDecimal("6000").compareTo(response.getSummary().getPending()));
        assertEquals("+11%", response.getQuickStats().getGrowth());

        assertEquals(2, response.getRecentTransactions().size());
        assertEquals(12, response.getTaxInfo().getTotalSessions());
    }

    private SalaryPayment payment(Long id, YearMonth period, String net) {
        SalaryPayment p = new SalaryPayment();
        p.setId(id);
        p.setEmployeeId("EMP-0020");
        p.setYear(period.getYear());
        p.setMonth(period.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH));
        p.setNetSalary(new BigDecimal(net));
        p.setStatus("Paid");
        return p;
    }
}
