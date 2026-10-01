package com.company.project.services.mobile.ledger;

import com.company.project.dto.mobile.ledger.trainer.TrainerLedgerResponseDTO;
import com.company.project.dto.mobile.ledger.trainer.TrainerLedgerResponseDTO.*;
import com.company.project.entities.*;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.TrainingSessionRepository;
import com.company.project.security.UserDetailsImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Builds the mobile Trainer Ledger from the same records the web app shows (see
 * {@link LedgerEarningsCalculator}). Nothing is estimated — missing data is reported as zero.
 */
@Service
@Transactional(readOnly = true)
public class MobileTrainerLedgerService {

    private final StaffRepository staffRepository;
    private final TrainingSessionRepository trainingSessionRepository;
    private final LedgerEarningsCalculator earnings;

    public MobileTrainerLedgerService(StaffRepository staffRepository,
                                      TrainingSessionRepository trainingSessionRepository,
                                      LedgerEarningsCalculator earnings) {
        this.staffRepository = staffRepository;
        this.trainingSessionRepository = trainingSessionRepository;
        this.earnings = earnings;
    }

    public TrainerLedgerResponseDTO getTrainerLedger(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }

        Staff staff = staffRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new EntityNotFoundException("No staff record linked to this account"));
        String username = earnings.usernameFor(staff, principal);

        LocalDate today = LocalDate.now();
        YearMonth current = YearMonth.from(today);

        Optional<SalaryPaymentEmployee> payrollEmployee = earnings.findPayrollEmployee(staff);
        List<SalaryPayment> payments = earnings.findSalaryPayments(staff);

        // This month. PT session payouts are not calculated anywhere in the system, so they are not
        // part of earnings.
        BigDecimal baseSalary = earnings.baseSalaryFor(staff, payrollEmployee);
        BigDecimal allowances = earnings.allowancesFor(payrollEmployee);
        BigDecimal commission = earnings.commissionFor(staff, username, current);
        BigDecimal thisMonthTotal = baseSalary.add(commission).add(allowances);

        BigDecimal lastMonthTotal = earnings.lastMonthSalary(staff, payments, current, baseSalary, allowances)
                .add(earnings.commissionFor(staff, username, current.minusMonths(1)));
        Integer growthPercentage = LedgerEarningsCalculator.growthPercentage(thisMonthTotal, lastMonthTotal);

        // Paid = what web payroll has recorded as paid for this month; the rest is still pending.
        BigDecimal paid = earnings.findPaymentFor(payments, current)
                .filter(LedgerEarningsCalculator::isPaid)
                .map(p -> LedgerEarningsCalculator.nz(p.getNetSalary()))
                .orElse(BigDecimal.ZERO);
        BigDecimal pending = thisMonthTotal.subtract(paid).max(BigDecimal.ZERO);

        TrainerEarningsSummaryDTO summary = new TrainerEarningsSummaryDTO(
                thisMonthTotal,
                lastMonthTotal,
                pending,
                paid
        );

        // Payroll runs at month end.
        LocalDate nextPayoutDate = current.atEndOfMonth();
        long daysRemaining = Math.max(0, ChronoUnit.DAYS.between(today, nextPayoutDate));
        String nextPayoutDateStr = nextPayoutDate.format(DateTimeFormatter.ofPattern("MMM d", Locale.ENGLISH));
        String daysRemainingStr = daysRemaining == 0 ? "Today" : daysRemaining + (daysRemaining == 1 ? " day" : " days");

        TrainerQuickLedgerStatsDTO quickStats = new TrainerQuickLedgerStatsDTO(
                LedgerEarningsCalculator.formatGrowth(growthPercentage), nextPayoutDateStr, daysRemainingStr);

        List<TrainerEarningsBreakdownItemDTO> breakdown = List.of(
                breakdownItem("Base Salary", baseSalary, thisMonthTotal),
                breakdownItem("Commission", commission, thisMonthTotal),
                breakdownItem("Allowances", allowances, thisMonthTotal)
        );

        List<TrainerRecentTransactionDTO> recentTransactions = new ArrayList<>();
        for (LedgerEarningsCalculator.LedgerEntry e : earnings.recentEntries(staff, username, payments)) {
            recentTransactions.add(new TrainerRecentTransactionDTO(
                    e.id(),
                    e.date() != null ? e.date().toString() : null,
                    e.title(),
                    e.member(),
                    e.amount(),
                    e.paid() ? "paid" : "pending"
            ));
        }

        TrainerTaxInformationDTO taxInfo = computeTaxInfo(staff, username, current, payments);

        return new TrainerLedgerResponseDTO(
                summary,
                quickStats,
                breakdown,
                recentTransactions,
                taxInfo,
                // No tax documents are issued anywhere in the system yet.
                Collections.emptyList()
        );
    }

    private static TrainerEarningsBreakdownItemDTO breakdownItem(String category, BigDecimal amount, BigDecimal total) {
        return new TrainerEarningsBreakdownItemDTO(category, amount,
                (int) Math.round(LedgerEarningsCalculator.percentOf(amount, total)));
    }

    private TrainerTaxInformationDTO computeTaxInfo(Staff staff, String username, YearMonth current, List<SalaryPayment> payments) {
        BigDecimal ytdEarnings = earnings.salaryPaidInYear(payments, current.getYear())
                .add(earnings.ytdCommission(staff, username, current));

        LocalDate startOfYear = LocalDate.of(current.getYear(), 1, 1);
        int completedSessions = (int) trainingSessionRepository
                .countByTrainer_IdAndStatusAndDateBetween(staff.getId(), "completed", startOfYear, LocalDate.now());

        return new TrainerTaxInformationDTO(
                ytdEarnings.toPlainString(),
                completedSessions,
                // Per-session pay is not calculated anywhere in the system.
                null,
                // No trainer-client assignment exists in the schema (same as Trainer Performance).
                0
        );
    }
}
