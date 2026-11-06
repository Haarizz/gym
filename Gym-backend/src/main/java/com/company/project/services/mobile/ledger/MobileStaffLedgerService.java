package com.company.project.services.mobile.ledger;

import com.company.project.dto.mobile.ledger.StaffLedgerResponseDTO;
import com.company.project.dto.mobile.ledger.StaffLedgerResponseDTO.*;
import com.company.project.entities.*;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.*;
import com.company.project.security.UserDetailsImpl;
import com.company.project.performance.PerformanceEngine;
import com.company.project.performance.api.PerformanceViews;
import com.company.project.performance.incentives.IncentivePlan;
import com.company.project.performance.incentives.IncentivePlanBonus;
import com.company.project.performance.incentives.IncentivePlanLine;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Builds the mobile Staff Ledger from the same records the web app shows (see
 * {@link LedgerEarningsCalculator}). Nothing is estimated — missing data is reported as zero.
 */
@Service
@Transactional(readOnly = true)
public class MobileStaffLedgerService {

    private final StaffRepository staffRepository;
    private final PerformanceEngine engine;
    private final LedgerEarningsCalculator earnings;

    public MobileStaffLedgerService(
            StaffRepository staffRepository,
            PerformanceEngine engine,
            LedgerEarningsCalculator earnings) {
        this.staffRepository = staffRepository;
        this.engine = engine;
        this.earnings = earnings;
    }

    public StaffLedgerResponseDTO getStaffLedger(UserDetailsImpl principal) {
        Staff staff = requireStaff(principal);

        LocalDate today = LocalDate.now();
        YearMonth current = earnings.currentMonth();
        YearMonth previous = current.minusMonths(1);
        String monthLabel = current.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + current.getYear();

        PeriodDTO period = new PeriodDTO(current.getYear(), current.getMonthValue(), monthLabel);

        Optional<SalaryPaymentEmployee> payrollEmployee = earnings.findPayrollEmployee(staff);
        List<SalaryPayment> payments = earnings.findSalaryPayments(staff);

        // This month
        BigDecimal baseSalary = earnings.baseSalaryFor(staff, payrollEmployee);
        BigDecimal allowances = earnings.allowancesFor(payrollEmployee);
        BigDecimal commission = earnings.commissionFor(staff, current);
        BigDecimal thisMonthTotal = baseSalary.add(commission).add(allowances);

        BigDecimal lastMonthTotal = earnings.lastMonthSalary(staff, payments, current, baseSalary, allowances)
                .add(earnings.commissionFor(staff, previous));
        Integer growthPercentage = LedgerEarningsCalculator.growthPercentage(thisMonthTotal, lastMonthTotal);

        EarningsSummaryDTO summary = new EarningsSummaryDTO(
                thisMonthTotal,
                lastMonthTotal,
                growthPercentage,
                baseSalary,
                commission
        );

        // Payroll runs at month end.
        LocalDate nextPayoutDate = current.atEndOfMonth();
        long daysRemaining = Math.max(0, ChronoUnit.DAYS.between(today, nextPayoutDate));
        String growthStr = LedgerEarningsCalculator.formatGrowth(growthPercentage);
        String nextPayoutDateStr = nextPayoutDate.format(DateTimeFormatter.ofPattern("MMM d", Locale.ENGLISH));
        String daysRemainingStr = daysRemaining == 0 ? "Today" : daysRemaining + (daysRemaining == 1 ? " day" : " days");

        QuickStatsDTO quickStats = new QuickStatsDTO(growthStr, nextPayoutDateStr, daysRemainingStr);
        NextPayoutDTO nextPayout = new NextPayoutDTO(nextPayoutDate.toString(), daysRemaining);

        List<BreakdownItemDTO> breakdown = computeBreakdown(baseSalary, commission, allowances, thisMonthTotal);
        List<CommissionStructureItemDTO> commissionStructure = computeCommissionStructure(staff, current);
        List<RecentEarningDTO> recentEarnings = computeRecentEarnings(staff, payments);

        return new StaffLedgerResponseDTO(
                period,
                summary,
                quickStats,
                nextPayout,
                breakdown,
                commissionStructure,
                recentEarnings
        );
    }

    public byte[] getSalarySlip(UserDetailsImpl principal, Integer reqYear, Integer reqMonth) {
        Staff staff = requireStaff(principal);

        LocalDate today = LocalDate.now();
        YearMonth period = YearMonth.of(
                reqYear != null ? reqYear : today.getYear(),
                reqMonth != null ? reqMonth : today.getMonthValue());
        String monthName = period.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH);

        Optional<SalaryPaymentEmployee> payrollEmployee = earnings.findPayrollEmployee(staff);
        Optional<SalaryPayment> payment = earnings.findPaymentFor(earnings.findSalaryPayments(staff), period);

        BigDecimal baseSalary = earnings.baseSalaryFor(staff, payrollEmployee);
        BigDecimal allowances = earnings.allowancesFor(payrollEmployee);
        BigDecimal deductions = earnings.deductionsFor(payrollEmployee);
        BigDecimal commission = earnings.commissionFor(staff, period);
        BigDecimal grossEarnings = baseSalary.add(allowances).add(commission);
        BigDecimal netPayable = grossEarnings.subtract(deductions);

        StringBuilder sb = new StringBuilder();
        sb.append("========================================================\n");
        sb.append("                 GYMBIOS PAYROLL ADVICE                \n");
        sb.append("========================================================\n\n");
        sb.append(String.format("Employee Name  : %s\n", staff.getName()));
        sb.append(String.format("Employee ID    : %s\n", staff.getStaffId() != null ? staff.getStaffId() : "EMP-" + staff.getId()));
        sb.append(String.format("Designation    : %s\n", staff.getRole() != null ? staff.getRole() : "Staff"));
        sb.append(String.format("Branch         : %s\n", staff.getBranch() != null ? staff.getBranch() : "-"));
        sb.append(String.format("Pay Period     : %s %d\n", monthName, period.getYear()));
        sb.append(String.format("Generated On   : %s\n\n", today.format(DateTimeFormatter.ISO_LOCAL_DATE)));
        sb.append("--------------------------------------------------------\n");
        sb.append("EARNINGS                                        AMOUNT  \n");
        sb.append("--------------------------------------------------------\n");
        sb.append(String.format("Base Salary                             : %,.2f\n", baseSalary));
        sb.append(String.format("Allowances                              : %,.2f\n", allowances));
        sb.append(String.format("Sales Commission                        : %,.2f\n", commission));
        sb.append("--------------------------------------------------------\n");
        sb.append(String.format("GROSS EARNINGS                          : %,.2f\n\n", grossEarnings));
        sb.append("--------------------------------------------------------\n");
        sb.append("DEDUCTIONS                                      AMOUNT  \n");
        sb.append("--------------------------------------------------------\n");
        sb.append(String.format("TOTAL DEDUCTIONS                        : %,.2f\n\n", deductions));
        sb.append("========================================================\n");
        sb.append(String.format("NET PAYABLE                             : %,.2f\n", netPayable));
        if (payment.isPresent()) {
            sb.append(String.format("SALARY PAID                             : %,.2f\n", nz(payment.get().getNetSalary())));
        }
        sb.append("========================================================\n\n");
        if (payment.isPresent()) {
            String status = payment.get().getStatus() != null ? payment.get().getStatus() : "Paid";
            sb.append("Status: ").append(status);
            if (payment.get().getPaymentDate() != null) {
                sb.append(" on ").append(payment.get().getPaymentDate().format(DateTimeFormatter.ISO_LOCAL_DATE));
            }
            sb.append("\n");
        } else {
            sb.append("Status: Not yet processed by payroll\n");
        }
        sb.append("This is a computer-generated advice from GymBios.\n");

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private Staff requireStaff(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }
        return staffRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new EntityNotFoundException("No staff record linked to this account"));
    }

    private List<BreakdownItemDTO> computeBreakdown(
            BigDecimal baseSalary, BigDecimal commission, BigDecimal allowances, BigDecimal total) {
        List<BreakdownItemDTO> items = new ArrayList<>();
        items.add(new BreakdownItemDTO("Base Salary", baseSalary, LedgerEarningsCalculator.percentOf(baseSalary, total)));
        items.add(new BreakdownItemDTO("Commission", commission, LedgerEarningsCalculator.percentOf(commission, total)));
        items.add(new BreakdownItemDTO("Allowances", allowances, LedgerEarningsCalculator.percentOf(allowances, total)));
        return items;
    }

    /**
     * The staff member's incentive plan for the month as configured on the web (commission lines
     * and the target bonuses that are actually paid). No plan, no commission: shown as such.
     */
    private List<CommissionStructureItemDTO> computeCommissionStructure(Staff staff, YearMonth period) {
        List<CommissionStructureItemDTO> items = new ArrayList<>();
        IncentivePlan plan = engine.planFor(staff.getId(), period);
        if (plan == null) {
            items.add(new CommissionStructureItemDTO("NONE", "No incentive plan", "—"));
            return items;
        }
        List<String[]> text = PerformanceViews.structure(plan);
        int i = 0;
        for (IncentivePlanLine line : plan.getLines()) {
            if (com.company.project.performance.metric.Metric.parse(line.getMetric()).isEmpty()) continue;
            String[] t = text.get(i++);
            CommissionStructureItemDTO item = new CommissionStructureItemDTO(t[0], t[1], t[2]);
            item.setMetric(line.getMetric());
            item.setBasis(line.getBasis());
            item.setRate(line.getRate());
            item.setMinUnits(line.getMinUnits());
            item.setCapAmount(line.getCapAmount());
            items.add(item);
        }
        for (IncentivePlanBonus bonus : plan.getBonuses()) {
            if (com.company.project.performance.metric.Metric.parse(bonus.getMetric()).isEmpty()) continue;
            String[] t = text.get(i++);
            CommissionStructureItemDTO item = new CommissionStructureItemDTO(t[0], t[1], t[2]);
            item.setMetric(bonus.getMetric());
            item.setThresholdPct(bonus.getThresholdPct());
            item.setRewardType(bonus.getRewardType());
            item.setRewardValue(bonus.getRewardValue());
            items.add(item);
        }
        return items;
    }

    private static String formatPercent(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString() + "%";
    }

    private List<RecentEarningDTO> computeRecentEarnings(Staff staff, List<SalaryPayment> payments) {
        List<RecentEarningDTO> list = new ArrayList<>();
        for (LedgerEarningsCalculator.LedgerEntry e : earnings.recentEntries(staff, payments)) {
            list.add(new RecentEarningDTO(
                    e.id(),
                    e.type(),
                    e.title(),
                    e.title(),
                    e.member(),
                    "COMMISSION".equals(e.type()) ? Collections.singletonList(e.member()) : Collections.emptyList(),
                    e.date() != null ? e.date().toString() : null,
                    e.amount(),
                    e.paid() ? "paid" : "pending"
            ));
        }
        return list;
    }

    private static BigDecimal nz(BigDecimal value) {
        return LedgerEarningsCalculator.nz(value);
    }
}
