package com.company.project.services.mobile.ledger;

import com.company.project.entities.*;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.repositories.SalaryPaymentEmployeeRepository;
import com.company.project.repositories.SalaryPaymentRepository;
import com.company.project.repositories.StaffTargetRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.StaffProgressCalculator;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.*;

/**
 * Earnings figures shared by the mobile Staff and Trainer ledgers, derived only from records the
 * web app also shows: staff/payroll salary settings, salary payments recorded in web payroll, and
 * commission computed by {@link StaffProgressCalculator} exactly as the web Targets pages do.
 * Nothing is estimated — missing data is reported as zero.
 */
@Component
@Transactional(readOnly = true)
public class LedgerEarningsCalculator {

    private static final int RECENT_RECEIPTS_LIMIT = 10;
    private static final int RECENT_PAYMENTS_LIMIT = 6;

    /** One line in a ledger's recent earnings list. */
    public record LedgerEntry(String id, String type, String title, String member, LocalDate date,
                              BigDecimal amount, boolean paid) {}

    private final StaffTargetRepository staffTargetRepository;
    private final SalaryPaymentRepository salaryPaymentRepository;
    private final SalaryPaymentEmployeeRepository salaryPaymentEmployeeRepository;
    private final ReceiptRepository receiptRepository;
    private final StaffProgressCalculator progressCalculator;

    public LedgerEarningsCalculator(
            StaffTargetRepository staffTargetRepository,
            SalaryPaymentRepository salaryPaymentRepository,
            SalaryPaymentEmployeeRepository salaryPaymentEmployeeRepository,
            ReceiptRepository receiptRepository,
            StaffProgressCalculator progressCalculator) {
        this.staffTargetRepository = staffTargetRepository;
        this.salaryPaymentRepository = salaryPaymentRepository;
        this.salaryPaymentEmployeeRepository = salaryPaymentEmployeeRepository;
        this.receiptRepository = receiptRepository;
        this.progressCalculator = progressCalculator;
    }

    /** Same identity the web Targets pages use to attribute receipts and leads. */
    public String usernameFor(Staff staff, UserDetailsImpl principal) {
        if (staff.getAppUsername() != null) return staff.getAppUsername();
        return principal.getUsername() != null ? principal.getUsername() : "";
    }

    public Optional<SalaryPaymentEmployee> findPayrollEmployee(Staff staff) {
        return staff.getStaffId() != null
                ? salaryPaymentEmployeeRepository.findByEmployeeId(staff.getStaffId())
                : Optional.empty();
    }

    public BigDecimal baseSalaryFor(Staff staff, Optional<SalaryPaymentEmployee> payrollEmployee) {
        if (staff.getBaseSalary() != null && staff.getBaseSalary().compareTo(BigDecimal.ZERO) > 0) {
            return staff.getBaseSalary();
        }
        return payrollEmployee.map(SalaryPaymentEmployee::getBaseSalary).map(LedgerEarningsCalculator::nz).orElse(BigDecimal.ZERO);
    }

    public BigDecimal allowancesFor(Optional<SalaryPaymentEmployee> payrollEmployee) {
        return payrollEmployee.map(SalaryPaymentEmployee::getAllowances).map(LedgerEarningsCalculator::nz).orElse(BigDecimal.ZERO);
    }

    public BigDecimal deductionsFor(Optional<SalaryPaymentEmployee> payrollEmployee) {
        return payrollEmployee.map(SalaryPaymentEmployee::getDeductions).map(LedgerEarningsCalculator::nz).orElse(BigDecimal.ZERO);
    }

    /** Salary payments recorded in web payroll for this staff member, newest period first. */
    public List<SalaryPayment> findSalaryPayments(Staff staff) {
        List<SalaryPayment> payments = new ArrayList<>();
        for (SalaryPayment p : salaryPaymentRepository.findAll()) {
            boolean idMatch = p.getEmployeeId() != null
                    && ((staff.getStaffId() != null && p.getEmployeeId().equalsIgnoreCase(staff.getStaffId()))
                    || p.getEmployeeId().equals(String.valueOf(staff.getId())));
            boolean nameMatch = p.getEmployeeName() != null && staff.getName() != null
                    && p.getEmployeeName().equalsIgnoreCase(staff.getName());
            if (idMatch || nameMatch) payments.add(p);
        }
        payments.sort(Comparator.comparing(LedgerEarningsCalculator::paymentPeriodStart, Comparator.nullsLast(Comparator.reverseOrder())));
        return payments;
    }

    public Optional<SalaryPayment> findPaymentFor(List<SalaryPayment> payments, YearMonth period) {
        return payments.stream()
                .filter(p -> period.equals(paymentPeriod(p)))
                .findFirst();
    }

    public static YearMonth paymentPeriod(SalaryPayment p) {
        if (p.getYear() == null || p.getMonth() == null) return null;
        String m = p.getMonth().trim();
        try {
            return YearMonth.of(p.getYear(), Integer.parseInt(m));
        } catch (RuntimeException ignored) {
            // Web payroll stores the month name, e.g. "October".
        }
        for (Month month : Month.values()) {
            if (month.getDisplayName(TextStyle.FULL, Locale.ENGLISH).equalsIgnoreCase(m)) {
                return YearMonth.of(p.getYear(), month);
            }
        }
        return null;
    }

    private static LocalDate paymentPeriodStart(SalaryPayment p) {
        YearMonth period = paymentPeriod(p);
        return period != null ? period.atDay(1) : p.getPaymentDate();
    }

    public static boolean isPaid(SalaryPayment p) {
        return "paid".equalsIgnoreCase(p.getStatus());
    }

    /**
     * Commission for a month exactly as the web Targets pages report it: the live figure from
     * paid sales, floored at whatever was stored on that month's target.
     */
    public BigDecimal commissionFor(Staff staff, String username, YearMonth period) {
        LocalDateTime start = period.atDay(1).atStartOfDay();
        LocalDateTime end = period.plusMonths(1).atDay(1).atStartOfDay();
        BigDecimal live = progressCalculator.computeCommission(staff, username, start, end);
        BigDecimal stored = staffTargetRepository
                .findByStaff_IdAndYearAndMonthOrderByCreatedAtDesc(staff.getId(), period.getYear(), period.getMonthValue())
                .stream().findFirst()
                .map(StaffTarget::getCommissionEarned)
                .map(LedgerEarningsCalculator::nz)
                .orElse(BigDecimal.ZERO);
        return live.max(stored);
    }

    /**
     * Salary for the month before {@code current}: the recorded payment if payroll ran, otherwise
     * the configured salary — but only when the staff member had already joined by then.
     */
    public BigDecimal lastMonthSalary(Staff staff, List<SalaryPayment> payments, YearMonth current,
                                      BigDecimal baseSalary, BigDecimal allowances) {
        Optional<SalaryPayment> payment = findPaymentFor(payments, current.minusMonths(1));
        if (payment.isPresent()) {
            return nz(payment.get().getNetSalary());
        }
        if (staff.getJoinDate() != null && staff.getJoinDate().isBefore(current.atDay(1))) {
            return baseSalary.add(allowances);
        }
        return BigDecimal.ZERO;
    }

    /** Commission earned from January through {@code current}, month by month as the web reports it. */
    public BigDecimal ytdCommission(Staff staff, String username, YearMonth current) {
        BigDecimal total = BigDecimal.ZERO;
        for (int m = 1; m <= current.getMonthValue(); m++) {
            total = total.add(commissionFor(staff, username, YearMonth.of(current.getYear(), m)));
        }
        return total;
    }

    /** Salary actually paid (status Paid) in web payroll for the given year. */
    public BigDecimal salaryPaidInYear(List<SalaryPayment> payments, int year) {
        return payments.stream()
                .filter(p -> p.getYear() != null && p.getYear() == year)
                .filter(LedgerEarningsCalculator::isPaid)
                .map(p -> nz(p.getNetSalary()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Recorded salary payments plus commission on the staff member's most recent paid sales at
     * their role's rates, newest first. Commission counts as paid once payroll has been run for
     * the month of the sale.
     */
    public List<LedgerEntry> recentEntries(Staff staff, String username, List<SalaryPayment> payments) {
        List<LedgerEntry> list = new ArrayList<>();

        for (SalaryPayment p : payments.subList(0, Math.min(RECENT_PAYMENTS_LIMIT, payments.size()))) {
            YearMonth period = paymentPeriod(p);
            String periodLabel = period != null
                    ? period.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + period.getYear()
                    : (p.getMonth() != null ? p.getMonth() : "");
            LocalDate date = p.getPaymentDate() != null ? p.getPaymentDate()
                    : (period != null ? period.atEndOfMonth() : null);
            list.add(new LedgerEntry(
                    "salary-" + p.getId(),
                    "SALARY",
                    "Salary - " + periodLabel,
                    p.getNotes() != null && !p.getNotes().isBlank() ? p.getNotes() : "Payroll",
                    date,
                    nz(p.getNetSalary()),
                    isPaid(p)
            ));
        }

        Specification<Receipt> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), "Paid"));
            if (staff.getName() != null && !staff.getName().isBlank()) {
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("processedBy")), "%" + staff.getName().toLowerCase() + "%"),
                        cb.equal(root.get("createdBy"), username)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Optional<CommissionRule> rule = progressCalculator.findCommissionRule(staff);
        BigDecimal admissionRate = progressCalculator.admissionCommissionRate(rule);
        BigDecimal baseRate = progressCalculator.baseCommissionRate(rule);

        List<Receipt> receipts = receiptRepository
                .findAll(spec, PageRequest.of(0, RECENT_RECEIPTS_LIMIT, Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent();
        for (Receipt r : receipts) {
            BigDecimal revenue = r.getPaidAmount() != null ? r.getPaidAmount() : nz(r.getAmount());
            boolean admission = "New".equals(r.getTransactionType());
            BigDecimal commission = progressCalculator.commissionOn(revenue, admission ? admissionRate : baseRate);
            if (commission.compareTo(BigDecimal.ZERO) <= 0) continue;

            LocalDate date = r.getTransactionDate() != null ? r.getTransactionDate().toLocalDate()
                    : (r.getCreatedAt() != null ? r.getCreatedAt().toLocalDate() : null);
            boolean paid = date != null && findPaymentFor(payments, YearMonth.from(date))
                    .map(LedgerEarningsCalculator::isPaid)
                    .orElse(false);

            list.add(new LedgerEntry(
                    "rec-" + r.getId(),
                    "COMMISSION",
                    "Commission - " + (r.getPlanName() != null ? r.getPlanName() : (admission ? "New Admission" : "Sale")),
                    r.getMemberName() != null ? r.getMemberName() : "Member",
                    date,
                    commission,
                    paid
            ));
        }

        list.sort(Comparator.comparing(LedgerEntry::date, Comparator.nullsLast(Comparator.reverseOrder())));
        return list;
    }

    /** Month-over-month growth, or null when there were no earnings last month to compare against. */
    public static Integer growthPercentage(BigDecimal thisMonth, BigDecimal lastMonth) {
        if (lastMonth.compareTo(BigDecimal.ZERO) <= 0) return null;
        double diff = thisMonth.doubleValue() - lastMonth.doubleValue();
        return (int) Math.round((diff / lastMonth.doubleValue()) * 100);
    }

    public static String formatGrowth(Integer growthPercentage) {
        if (growthPercentage == null) return "—";
        return (growthPercentage >= 0 ? "+" : "") + growthPercentage + "%";
    }

    public static double percentOf(BigDecimal part, BigDecimal total) {
        if (total.compareTo(BigDecimal.ZERO) <= 0) return 0.0;
        return Math.round((part.doubleValue() / total.doubleValue()) * 10000.0) / 100.0;
    }

    public static BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
