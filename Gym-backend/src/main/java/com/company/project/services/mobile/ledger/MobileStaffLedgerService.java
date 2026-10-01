package com.company.project.services.mobile.ledger;

import com.company.project.dto.mobile.ledger.StaffLedgerResponseDTO;
import com.company.project.dto.mobile.ledger.StaffLedgerResponseDTO.*;
import com.company.project.entities.*;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.*;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.StaffProgressCalculator;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
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

    private static final ObjectMapper JSON = new ObjectMapper();

    private final StaffRepository staffRepository;
    private final StaffProgressCalculator progressCalculator;
    private final LedgerEarningsCalculator earnings;

    public MobileStaffLedgerService(
            StaffRepository staffRepository,
            StaffProgressCalculator progressCalculator,
            LedgerEarningsCalculator earnings) {
        this.staffRepository = staffRepository;
        this.progressCalculator = progressCalculator;
        this.earnings = earnings;
    }

    public StaffLedgerResponseDTO getStaffLedger(UserDetailsImpl principal) {
        Staff staff = requireStaff(principal);
        String username = earnings.usernameFor(staff, principal);

        LocalDate today = LocalDate.now();
        YearMonth current = YearMonth.from(today);
        YearMonth previous = current.minusMonths(1);
        String monthLabel = current.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + current.getYear();

        PeriodDTO period = new PeriodDTO(current.getYear(), current.getMonthValue(), monthLabel);

        Optional<SalaryPaymentEmployee> payrollEmployee = earnings.findPayrollEmployee(staff);
        List<SalaryPayment> payments = earnings.findSalaryPayments(staff);

        // This month
        BigDecimal baseSalary = earnings.baseSalaryFor(staff, payrollEmployee);
        BigDecimal allowances = earnings.allowancesFor(payrollEmployee);
        BigDecimal commission = earnings.commissionFor(staff, username, current);
        BigDecimal thisMonthTotal = baseSalary.add(commission).add(allowances);

        BigDecimal lastMonthTotal = earnings.lastMonthSalary(staff, payments, current, baseSalary, allowances)
                .add(earnings.commissionFor(staff, username, previous));
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
        List<CommissionStructureItemDTO> commissionStructure = computeCommissionStructure(staff);
        List<RecentEarningDTO> recentEarnings = computeRecentEarnings(staff, username, payments);
        TaxInfoDTO taxInfo = computeTaxInfo(staff, username, current, payments);

        return new StaffLedgerResponseDTO(
                period,
                summary,
                quickStats,
                nextPayout,
                breakdown,
                commissionStructure,
                recentEarnings,
                taxInfo,
                // No tax documents are issued anywhere in the system yet.
                Collections.emptyList()
        );
    }

    public byte[] getSalarySlip(UserDetailsImpl principal, Integer reqYear, Integer reqMonth) {
        Staff staff = requireStaff(principal);
        String username = earnings.usernameFor(staff, principal);

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
        BigDecimal commission = earnings.commissionFor(staff, username, period);
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

    public byte[] getTaxDocument(UserDetailsImpl principal, String documentId) {
        requireStaff(principal);
        throw new EntityNotFoundException("Tax document not found: " + documentId);
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

    /** The staff member's commission rule as configured on the web Staff & Trainers page. */
    private List<CommissionStructureItemDTO> computeCommissionStructure(Staff staff) {
        Optional<CommissionRule> rule = progressCalculator.findCommissionRule(staff);
        List<CommissionStructureItemDTO> items = new ArrayList<>();
        items.add(new CommissionStructureItemDTO("ADMISSION", "New member admissions",
                formatPercent(progressCalculator.admissionCommissionRate(rule))));
        items.add(new CommissionStructureItemDTO("BASE", "Renewals, add-ons & walk-ins",
                formatPercent(progressCalculator.baseCommissionRate(rule))));

        String bonusesJson = rule.map(CommissionRule::getTargetBonusesJson).orElse(null);
        if (bonusesJson != null && !bonusesJson.isBlank()) {
            try {
                List<Map<String, Object>> bonuses = JSON.readValue(bonusesJson, new TypeReference<>() {});
                for (Map<String, Object> bonus : bonuses) {
                    Object threshold = bonus.get("threshold");
                    Object extra = bonus.get("bonus");
                    if (threshold == null || extra == null) continue;
                    items.add(new CommissionStructureItemDTO("TARGET_BONUS",
                            "Reach " + formatPercent(new BigDecimal(threshold.toString())) + " of target",
                            "+" + formatPercent(new BigDecimal(extra.toString()))));
                }
            } catch (Exception ignored) {
                // Malformed bonus config: show the base rates only.
            }
        }
        return items;
    }

    private static String formatPercent(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString() + "%";
    }

    private List<RecentEarningDTO> computeRecentEarnings(Staff staff, String username, List<SalaryPayment> payments) {
        List<RecentEarningDTO> list = new ArrayList<>();
        for (LedgerEarningsCalculator.LedgerEntry e : earnings.recentEntries(staff, username, payments)) {
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

    private TaxInfoDTO computeTaxInfo(Staff staff, String username, YearMonth current, List<SalaryPayment> payments) {
        int year = current.getYear();
        BigDecimal salaryPaid = earnings.salaryPaidInYear(payments, year);
        BigDecimal totalCommission = earnings.ytdCommission(staff, username, current);

        LocalDateTime startOfYear = LocalDate.of(year, 1, 1).atStartOfDay();
        LocalDateTime startOfNextMonth = current.plusMonths(1).atDay(1).atStartOfDay();
        int conversions = progressCalculator.computeConversions(staff, username, startOfYear, startOfNextMonth);

        return new TaxInfoDTO(
                String.valueOf(year),
                salaryPaid.add(totalCommission),
                // Payroll does not record tax withholding.
                BigDecimal.ZERO,
                salaryPaid,
                totalCommission,
                conversions
        );
    }

    private static BigDecimal nz(BigDecimal value) {
        return LedgerEarningsCalculator.nz(value);
    }
}
