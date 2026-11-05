package com.company.project.services.mobile.ledger;

import com.company.project.entities.*;
import com.company.project.performance.PerformanceClock;
import com.company.project.performance.PerformanceEngine;
import com.company.project.performance.PeriodResult;
import com.company.project.performance.events.PerformanceEvent;
import com.company.project.performance.events.PerformanceEventRepository;
import com.company.project.performance.events.SourceLabels;
import com.company.project.performance.incentives.IncentiveCalculator;
import com.company.project.performance.incentives.IncentivePlan;
import com.company.project.performance.metric.Metric;
import com.company.project.performance.settlement.SettlementView;
import com.company.project.repositories.SalaryPaymentEmployeeRepository;
import com.company.project.repositories.SalaryPaymentRepository;
import com.company.project.security.UserDetailsImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.*;

/**
 * Earnings figures shared by the mobile Staff and Trainer ledgers, from the same records the web
 * shows: staff/payroll salary settings, salary payments recorded in web payroll, and commission
 * from the {@link PerformanceEngine} — the frozen amount for decided months, so the phone always
 * shows what payroll pays. Missing data is reported as zero.
 */
@Component
@Transactional(readOnly = true)
public class LedgerEarningsCalculator {

    private static final int RECENT_ACTIVITY_LIMIT = 15;
    private static final int RECENT_PAYMENTS_LIMIT = 6;

    /** One line in a ledger's recent earnings list. */
    public record LedgerEntry(String id, String type, String title, String member, LocalDate date,
                              BigDecimal amount, boolean paid) {}

    private final SalaryPaymentRepository salaryPaymentRepository;
    private final SalaryPaymentEmployeeRepository salaryPaymentEmployeeRepository;
    private final PerformanceEngine engine;
    private final PerformanceEventRepository events;
    private final SourceLabels sourceLabels;
    private final PerformanceClock clock;

    public LedgerEarningsCalculator(
            SalaryPaymentRepository salaryPaymentRepository,
            SalaryPaymentEmployeeRepository salaryPaymentEmployeeRepository,
            PerformanceEngine engine,
            PerformanceEventRepository events,
            SourceLabels sourceLabels,
            PerformanceClock clock) {
        this.salaryPaymentRepository = salaryPaymentRepository;
        this.salaryPaymentEmployeeRepository = salaryPaymentEmployeeRepository;
        this.engine = engine;
        this.events = events;
        this.sourceLabels = sourceLabels;
        this.clock = clock;
    }

    /** The login used to attribute activity to an account. */
    public String usernameFor(Staff staff, UserDetailsImpl principal) {
        if (staff.getAppUsername() != null) return staff.getAppUsername();
        return principal.getUsername() != null ? principal.getUsername() : "";
    }

    public YearMonth currentMonth() {
        return clock.currentMonth(null);
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

    /** The month's figures from the engine (frozen once decided). */
    public PeriodResult periodFor(Staff staff, YearMonth period) {
        return engine.evaluate(staff.getId(), period);
    }

    /** Commission for a month: the approved/paid amount once decided, the live estimate before. */
    public BigDecimal commissionFor(Staff staff, YearMonth period) {
        PeriodResult r = periodFor(staff, period);
        return r != null ? r.commission() : BigDecimal.ZERO;
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

    /** Commission from January through {@code current}. */
    public BigDecimal ytdCommission(Staff staff, YearMonth current) {
        BigDecimal total = BigDecimal.ZERO;
        for (Map<Long, PeriodResult> month : engine.evaluate(List.of(staff.getId()), YearMonth.of(current.getYear(), 1), current).values()) {
            PeriodResult r = month.get(staff.getId());
            if (r != null) total = total.add(r.commission());
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
     * Recorded salary payments plus the person's recently credited activity (each sale, session or
     * conversion from the performance ledger) with what it earns at their plan's rates, newest
     * first. Activity counts as paid once its month's commission has been paid.
     */
    public List<LedgerEntry> recentEntries(Staff staff, List<SalaryPayment> payments) {
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

        YearMonth current = currentMonth();
        PerformanceClock.Window window = new PerformanceClock.Window(
                clock.window(current.minusMonths(2), null).start(), clock.window(current, null).end()).upToNow();
        List<PerformanceEvent> activity = events.findForStaff(staff.getId(), window.start(), window.end(),
                PageRequest.of(0, RECENT_ACTIVITY_LIMIT));
        Map<String, Map<Long, SourceLabels.Label>> labels = sourceLabels.describe(activity);
        Map<YearMonth, IncentivePlan> plans = new HashMap<>();
        Map<YearMonth, Boolean> paidMonths = new HashMap<>();
        for (PerformanceEvent e : activity) {
            YearMonth month = clock.monthOf(e.getOccurredAt(), e.getBranchId());
            IncentivePlan plan = plans.computeIfAbsent(month, m -> engine.planFor(staff.getId(), m));
            BigDecimal earned = IncentiveCalculator.perActivity(plan, e.getMetric(), e.getQuantity(), e.getAmount());
            boolean paid = paidMonths.computeIfAbsent(month, m -> {
                PeriodResult r = periodFor(staff, m);
                return r != null && SettlementView.PAID.equals(r.settlement().status());
            });
            SourceLabels.Label label = labels.getOrDefault(e.getSourceType(), Map.of()).get(e.getSourceId());
            Metric metric = Metric.parse(e.getMetric()).orElse(null);
            String what = metric != null ? metric.label() : e.getMetric();
            String title = (e.getRevision() > 0 ? "Correction - " : "Commission - ") + what
                    + (label != null && label.title() != null ? " (" + label.title() + ")" : "");
            list.add(new LedgerEntry(
                    "event-" + e.getId(),
                    "COMMISSION",
                    title,
                    label != null && label.person() != null ? label.person() : what,
                    e.getOccurredAt().toLocalDate(),
                    earned,
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
