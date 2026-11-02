package com.company.project.services.mobile.ledger;

import com.company.project.dto.mobile.ledger.MobileSalaryAdvanceDTOs.Advance;
import com.company.project.dto.mobile.ledger.MobileSalaryAdvanceDTOs.CreateRequest;
import com.company.project.dto.mobile.ledger.MobileSalaryAdvanceDTOs.Limits;
import com.company.project.dto.mobile.ledger.MobileSalaryAdvanceDTOs.Overview;
import com.company.project.entities.SalaryAdvance;
import com.company.project.entities.Staff;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.exceptions.UnprocessableRequestException;
import com.company.project.repositories.SalaryAdvanceRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.SalaryAdvanceService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Salary advance requests made by staff and trainers from the mobile app, always scoped to
 * the signed-in person's own Staff row. Rules: amount and reason only (the approver sets the
 * repayment plan), one pending request at a time, and
 * amount ≤ base salary − outstanding balance of Active/Approved advances.
 */
@Service
@Transactional
public class MobileSalaryAdvanceService {

    static final int MAX_REASON_LENGTH = 500;
    private static final List<String> REPAYING_STATUSES = List.of("Active", "Approved");

    private final StaffRepository staffRepository;
    private final SalaryAdvanceRepository advanceRepository;
    private final SalaryAdvanceService salaryAdvanceService;
    private final LedgerEarningsCalculator earnings;

    public MobileSalaryAdvanceService(StaffRepository staffRepository,
                                      SalaryAdvanceRepository advanceRepository,
                                      SalaryAdvanceService salaryAdvanceService,
                                      LedgerEarningsCalculator earnings) {
        this.staffRepository = staffRepository;
        this.advanceRepository = advanceRepository;
        this.salaryAdvanceService = salaryAdvanceService;
        this.earnings = earnings;
    }

    @Transactional(readOnly = true)
    public Overview overview(UserDetailsImpl principal) {
        Staff staff = requireStaff(principal);
        List<SalaryAdvance> advances = staff.getStaffId() != null
                ? advanceRepository.findByEmployeeIdOrderByRequestDateDescIdDesc(staff.getStaffId())
                : List.of();
        return new Overview(limitsFor(staff, advances), advances.stream().map(Advance::from).toList());
    }

    public Advance create(UserDetailsImpl principal, CreateRequest request) {
        Staff staff = requireStaff(principal);
        if (request == null || request.getAmount() == null || request.getAmount().signum() <= 0) {
            throw new IllegalArgumentException("Enter an amount greater than zero.");
        }
        String reason = request.getReason() != null ? request.getReason().trim() : "";
        if (reason.isEmpty()) {
            throw new IllegalArgumentException("Please give a reason for the advance.");
        }
        if (reason.length() > MAX_REASON_LENGTH) {
            throw new IllegalArgumentException("Reason must be " + MAX_REASON_LENGTH + " characters or fewer.");
        }
        BigDecimal amount = request.getAmount();
        if (amount.scale() > 2) {
            throw new IllegalArgumentException("Amount can have at most 2 decimal places.");
        }

        List<SalaryAdvance> advances = staff.getStaffId() != null
                ? advanceRepository.findByEmployeeIdOrderByRequestDateDescIdDesc(staff.getStaffId())
                : List.of();
        Limits limits = limitsFor(staff, advances);
        if (!limits.canRequest()) {
            throw new UnprocessableRequestException(limits.reasonBlocked());
        }
        if (amount.compareTo(limits.available()) > 0) {
            throw new UnprocessableRequestException("You can request up to "
                    + salaryAdvanceService.money(limits.available(), staff.getBranchId()) + ".");
        }

        SalaryAdvance advance = new SalaryAdvance();
        // Identity always comes from the signed-in person's Staff row, never from the client.
        advance.setEmployeeId(staff.getStaffId());
        advance.setEmployeeName(staff.getName());
        advance.setDepartment(staff.getDepartment());
        if (staff.getBranchId() != null) advance.setBranchId(staff.getBranchId());
        advance.setRequestDate(LocalDate.now());
        advance.setAdvanceType("Salary Advance");
        advance.setRequestedAmount(amount);
        advance.setApprovedAmount(BigDecimal.ZERO);
        advance.setApprovalStatus("Pending");
        advance.setRemarks(reason);
        advance.setTotalDeducted(BigDecimal.ZERO);
        advance.setBalance(BigDecimal.ZERO);
        // The approver sets installments, start month and auto-deduct.
        advance.setInstallmentCount(0);
        advance.setInstallmentAmount(BigDecimal.ZERO);
        advance.setStartMonth(null);
        advance.setDeductionMode("Monthly");
        advance.setAutoDeduct(true);
        advance.setStatus(SalaryAdvanceService.STATUS_PENDING);
        advance.setRequestedVia("app");
        advance.setRequestedByUserId(principal.getId());
        SalaryAdvance saved = advanceRepository.save(advance);

        salaryAdvanceService.notifyApprovers(saved, SalaryAdvanceService.approverRequestsLink());
        return Advance.from(saved);
    }

    public Advance cancel(UserDetailsImpl principal, Long id) {
        Staff staff = requireStaff(principal);
        SalaryAdvance advance = advanceRepository.findById(id)
                .filter(a -> a.getEmployeeId() != null && a.getEmployeeId().equals(staff.getStaffId()))
                .orElseThrow(() -> new EntityNotFoundException("Salary advance not found"));
        if (!SalaryAdvanceService.STATUS_PENDING.equalsIgnoreCase(advance.getStatus())) {
            throw new UnprocessableRequestException("Only a pending request can be withdrawn.");
        }
        advance.setStatus(SalaryAdvanceService.STATUS_CANCELLED);
        advance.setApprovalStatus(SalaryAdvanceService.STATUS_CANCELLED);
        advance.setCancelledAt(LocalDateTime.now());
        return Advance.from(advanceRepository.save(advance));
    }

    private Limits limitsFor(Staff staff, List<SalaryAdvance> advances) {
        BigDecimal baseSalary = earnings.baseSalaryFor(staff, earnings.findPayrollEmployee(staff));
        BigDecimal outstanding = advances.stream()
                .filter(a -> a.getStatus() != null && REPAYING_STATUSES.stream().anyMatch(s -> s.equalsIgnoreCase(a.getStatus())))
                .map(a -> a.getBalance() != null ? a.getBalance() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        boolean hasPending = advances.stream()
                .anyMatch(a -> SalaryAdvanceService.STATUS_PENDING.equalsIgnoreCase(a.getStatus()));
        BigDecimal available = baseSalary.subtract(outstanding).max(BigDecimal.ZERO);

        String blocked = null;
        if (staff.getStaffId() == null || staff.getStaffId().isBlank()) {
            blocked = "Your staff profile has no employee ID — contact HR.";
        } else if (baseSalary.signum() <= 0) {
            blocked = "Salary not set up — contact HR.";
        } else if (hasPending) {
            blocked = "You already have a request waiting for approval.";
        } else if (available.signum() <= 0) {
            blocked = "Your outstanding advances already equal your base salary.";
        }
        return new Limits(baseSalary, outstanding, available, hasPending, blocked == null, blocked);
    }

    private Staff requireStaff(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new AccessDeniedException("Not signed in");
        }
        return staffRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new AccessDeniedException("No staff record linked to this account"));
    }
}
