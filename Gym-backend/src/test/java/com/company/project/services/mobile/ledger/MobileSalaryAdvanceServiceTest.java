package com.company.project.services.mobile.ledger;

import com.company.project.dto.mobile.ledger.MobileSalaryAdvanceDTOs.Advance;
import com.company.project.dto.mobile.ledger.MobileSalaryAdvanceDTOs.CreateRequest;
import com.company.project.dto.mobile.ledger.MobileSalaryAdvanceDTOs.Overview;
import com.company.project.entities.SalaryAdvance;
import com.company.project.entities.Staff;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.exceptions.UnprocessableRequestException;
import com.company.project.repositories.SalaryAdvanceRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.SalaryAdvanceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MobileSalaryAdvanceServiceTest {

    @Mock private StaffRepository staffRepository;
    @Mock private SalaryAdvanceRepository advanceRepository;
    @Mock private SalaryAdvanceService salaryAdvanceService;
    @Mock private LedgerEarningsCalculator earnings;

    private MobileSalaryAdvanceService service;
    private UserDetailsImpl principal;
    private Staff staff;

    @BeforeEach
    void setUp() {
        service = new MobileSalaryAdvanceService(staffRepository, advanceRepository, salaryAdvanceService, earnings);
        principal = new UserDetailsImpl(100L, "staffuser", "staff@gymbios.com", "pw", Collections.emptyList(), true);

        staff = new Staff();
        staff.setId(10L);
        staff.setStaffId("EMP-0010");
        staff.setName("Rahul Sharma");
        staff.setDepartment("Front Desk");
        staff.setBranchId(3L);
        when(staffRepository.findByUserId(100L)).thenReturn(Optional.of(staff));
        when(earnings.findPayrollEmployee(staff)).thenReturn(Optional.empty());
        when(earnings.baseSalaryFor(eq(staff), any())).thenReturn(new BigDecimal("5000"));
        when(advanceRepository.findByEmployeeIdOrderByRequestDateDescIdDesc("EMP-0010")).thenReturn(List.of());
        when(advanceRepository.save(any(SalaryAdvance.class))).thenAnswer(inv -> {
            SalaryAdvance a = inv.getArgument(0);
            if (a.getId() == null) a.setId(55L);
            return a;
        });
        when(salaryAdvanceService.money(any(), any())).thenAnswer(inv -> "AED " + inv.getArgument(0));
    }

    private static SalaryAdvance advance(Long id, String status, String balance) {
        SalaryAdvance a = new SalaryAdvance();
        a.setId(id);
        a.setEmployeeId("EMP-0010");
        a.setStatus(status);
        a.setBalance(new BigDecimal(balance));
        return a;
    }

    private static CreateRequest request(String amount, String reason) {
        CreateRequest r = new CreateRequest();
        r.setAmount(amount != null ? new BigDecimal(amount) : null);
        r.setReason(reason);
        return r;
    }

    @Test
    @DisplayName("Limits: available = base salary minus Active/Approved balances")
    void limits() {
        when(advanceRepository.findByEmployeeIdOrderByRequestDateDescIdDesc("EMP-0010")).thenReturn(List.of(
                advance(1L, "Active", "1200"),
                advance(2L, "Fully Repaid", "0"),
                advance(3L, "Rejected", "999")));

        Overview o = service.overview(principal);

        assertEquals(0, new BigDecimal("1200").compareTo(o.limits().outstanding()));
        assertEquals(0, new BigDecimal("3800").compareTo(o.limits().available()));
        assertTrue(o.limits().canRequest());
        assertNull(o.limits().reasonBlocked());
        assertEquals(3, o.advances().size());
    }

    @Test
    @DisplayName("Create fills identity from the Staff row and leaves the plan to the approver")
    void createUsesStaffIdentity() {
        Advance created = service.create(principal, request("1500", "  Rent deposit  "));

        ArgumentCaptor<SalaryAdvance> saved = ArgumentCaptor.forClass(SalaryAdvance.class);
        verify(advanceRepository).save(saved.capture());
        SalaryAdvance a = saved.getValue();
        assertEquals("EMP-0010", a.getEmployeeId());
        assertEquals("Rahul Sharma", a.getEmployeeName());
        assertEquals("Front Desk", a.getDepartment());
        assertEquals(3L, a.getBranchId());
        assertEquals("Rent deposit", a.getRemarks());
        assertEquals("app", a.getRequestedVia());
        assertEquals(100L, a.getRequestedByUserId());
        assertEquals(0, a.getInstallmentCount());
        assertNull(a.getStartMonth());
        assertEquals(SalaryAdvanceService.STATUS_PENDING, a.getStatus());
        assertEquals(55L, created.id());
        verify(salaryAdvanceService).notifyApprovers(any(), eq("/salary-advances?tab=requests"));
    }

    @Test
    @DisplayName("A second pending request is refused")
    void secondPendingRefused() {
        when(advanceRepository.findByEmployeeIdOrderByRequestDateDescIdDesc("EMP-0010"))
                .thenReturn(List.of(advance(1L, SalaryAdvanceService.STATUS_PENDING, "0")));
        assertThrows(UnprocessableRequestException.class, () -> service.create(principal, request("100", "x")));
        verify(advanceRepository, never()).save(any());
    }

    @Test
    @DisplayName("Amount over the cap is refused")
    void overCapRefused() {
        when(advanceRepository.findByEmployeeIdOrderByRequestDateDescIdDesc("EMP-0010"))
                .thenReturn(List.of(advance(1L, "Active", "1200")));
        assertThrows(UnprocessableRequestException.class, () -> service.create(principal, request("3800.01", "x")));
        assertDoesNotThrow(() -> service.create(principal, request("3800", "x")));
    }

    @Test
    @DisplayName("Missing base salary is refused with a clear message")
    void missingSalaryRefused() {
        when(earnings.baseSalaryFor(eq(staff), any())).thenReturn(BigDecimal.ZERO);
        UnprocessableRequestException ex = assertThrows(UnprocessableRequestException.class,
                () -> service.create(principal, request("100", "x")));
        assertTrue(ex.getMessage().contains("Salary not set up"));
    }

    @Test
    @DisplayName("Amount and reason are validated")
    void validation() {
        assertThrows(IllegalArgumentException.class, () -> service.create(principal, request("0", "x")));
        assertThrows(IllegalArgumentException.class, () -> service.create(principal, request("100", "   ")));
        assertThrows(IllegalArgumentException.class, () -> service.create(principal, request("100", "x".repeat(501))));
    }

    @Test
    @DisplayName("Someone without a Staff row cannot request")
    void noStaffRow() {
        when(staffRepository.findByUserId(100L)).thenReturn(Optional.empty());
        assertThrows(AccessDeniedException.class, () -> service.overview(principal));
    }

    @Test
    @DisplayName("Cancel: only own pending advances")
    void cancel() {
        SalaryAdvance pending = advance(7L, SalaryAdvanceService.STATUS_PENDING, "0");
        when(advanceRepository.findById(7L)).thenReturn(Optional.of(pending));
        Advance result = service.cancel(principal, 7L);
        assertEquals("Cancelled", result.status());
        assertNotNull(pending.getCancelledAt());

        SalaryAdvance other = advance(8L, SalaryAdvanceService.STATUS_PENDING, "0");
        other.setEmployeeId("EMP-9999");
        when(advanceRepository.findById(8L)).thenReturn(Optional.of(other));
        assertThrows(EntityNotFoundException.class, () -> service.cancel(principal, 8L));

        SalaryAdvance active = advance(9L, "Active", "100");
        when(advanceRepository.findById(9L)).thenReturn(Optional.of(active));
        assertThrows(UnprocessableRequestException.class, () -> service.cancel(principal, 9L));
    }
}
