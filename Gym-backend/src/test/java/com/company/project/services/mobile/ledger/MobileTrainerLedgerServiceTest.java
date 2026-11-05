package com.company.project.services.mobile.ledger;

import com.company.project.performance.PerformanceEngine;
import com.company.project.performance.PerformanceTestData;
import com.company.project.performance.events.PerformanceEventRepository;
import com.company.project.performance.events.SourceLabels;
import java.util.HashMap;
import java.util.Map;

import com.company.project.dto.mobile.ledger.trainer.TrainerLedgerResponseDTO;
import com.company.project.entities.*;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.*;
import com.company.project.security.UserDetailsImpl;
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
    private SalaryPaymentRepository salaryPaymentRepository;

    @Mock
    private SalaryPaymentEmployeeRepository salaryPaymentEmployeeRepository;

    @Mock
    private PerformanceEngine engine;

    @Mock
    private PerformanceEventRepository events;

    @Mock
    private SourceLabels sourceLabels;

    private final Map<YearMonth, String> commission = new HashMap<>();

    private MobileTrainerLedgerService ledgerService;

    private UserDetailsImpl testPrincipal;
    private Staff trainer;
    private YearMonth current;

    @BeforeEach
    void setUp() {
        LedgerEarningsCalculator earnings = new LedgerEarningsCalculator(
                salaryPaymentRepository, salaryPaymentEmployeeRepository, engine, events, sourceLabels,
                PerformanceTestData.utcClock());
        ledgerService = new MobileTrainerLedgerService(staffRepository, earnings);

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
        when(salaryPaymentEmployeeRepository.findByEmployeeId(anyString())).thenReturn(Optional.empty());
        when(salaryPaymentRepository.findAll()).thenReturn(Collections.emptyList());
        when(events.findForStaff(anyLong(), any(), any(), any())).thenReturn(Collections.emptyList());
        when(sourceLabels.describe(any())).thenReturn(Map.of());
        when(engine.evaluate(eq(20L), any(YearMonth.class))).thenAnswer(inv -> {
            YearMonth m = inv.getArgument(1);
            return PerformanceTestData.result(20L, m).commission(commission.getOrDefault(m, "0")).build();
        });
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
    }

    @Test
    @DisplayName("Paid reflects this month's recorded payroll payment; last month uses last month's payment")
    void testPaidFromPayroll() {
        trainer.setJoinDate(LocalDate.now().minusYears(1));

        SalaryPayment thisMonth = payment(1L, current, "15000");
        SalaryPayment lastMonth = payment(2L, current.minusMonths(1), "19000");
        when(salaryPaymentRepository.findAll()).thenReturn(List.of(lastMonth, thisMonth));
        commission.put(current, "1000");

        TrainerLedgerResponseDTO response = ledgerService.getTrainerLedger(testPrincipal);

        assertEquals(0, new BigDecimal("21000").compareTo(response.getSummary().getThisMonth()));
        assertEquals(0, new BigDecimal("19000").compareTo(response.getSummary().getLastMonth()));
        assertEquals(0, new BigDecimal("15000").compareTo(response.getSummary().getPaid()));
        assertEquals(0, new BigDecimal("6000").compareTo(response.getSummary().getPending()));
        assertEquals("+11%", response.getQuickStats().getGrowth());

        assertEquals(2, response.getRecentTransactions().size());    }

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
