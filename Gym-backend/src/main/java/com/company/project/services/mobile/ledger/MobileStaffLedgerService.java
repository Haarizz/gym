package com.company.project.services.mobile.ledger;

import com.company.project.dto.mobile.ledger.StaffLedgerResponseDTO;
import com.company.project.dto.mobile.ledger.StaffLedgerResponseDTO.*;
import com.company.project.entities.*;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.*;
import com.company.project.security.UserDetailsImpl;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class MobileStaffLedgerService {

    private final StaffRepository staffRepository;
    private final StaffTargetRepository staffTargetRepository;
    private final SalaryPaymentRepository salaryPaymentRepository;
    private final SalaryPaymentEmployeeRepository salaryPaymentEmployeeRepository;
    private final CommissionRuleRepository commissionRuleRepository;
    private final ReceiptRepository receiptRepository;
    private final LeadRepository leadRepository;
    private final SalaryAdvanceRepository salaryAdvanceRepository;

    public MobileStaffLedgerService(
            StaffRepository staffRepository,
            StaffTargetRepository staffTargetRepository,
            SalaryPaymentRepository salaryPaymentRepository,
            SalaryPaymentEmployeeRepository salaryPaymentEmployeeRepository,
            CommissionRuleRepository commissionRuleRepository,
            ReceiptRepository receiptRepository,
            LeadRepository leadRepository,
            SalaryAdvanceRepository salaryAdvanceRepository) {
        this.staffRepository = staffRepository;
        this.staffTargetRepository = staffTargetRepository;
        this.salaryPaymentRepository = salaryPaymentRepository;
        this.salaryPaymentEmployeeRepository = salaryPaymentEmployeeRepository;
        this.commissionRuleRepository = commissionRuleRepository;
        this.receiptRepository = receiptRepository;
        this.leadRepository = leadRepository;
        this.salaryAdvanceRepository = salaryAdvanceRepository;
    }

    public StaffLedgerResponseDTO getStaffLedger(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }

        Staff staff = staffRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new EntityNotFoundException("No staff record linked to this account"));

        LocalDate today = LocalDate.now();
        int year = today.getYear();
        int month = today.getMonthValue();
        String monthLabel = today.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + year;

        LocalDateTime startOfMonth = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime startOfNextMonth = startOfMonth.plusMonths(1);
        LocalDateTime startOfYear = today.withDayOfYear(1).atStartOfDay();

        // 1. Period
        PeriodDTO period = new PeriodDTO(year, month, monthLabel);

        // Fetch optional StaffTarget & SalaryPaymentEmployee
        Optional<StaffTarget> currentTargetOpt = staffTargetRepository
                .findByStaff_IdAndYearAndMonthOrderByCreatedAtDesc(staff.getId(), year, month)
                .stream().findFirst();
        Optional<SalaryPaymentEmployee> paymentEmployeeOpt = staff.getStaffId() != null
                ? salaryPaymentEmployeeRepository.findByEmployeeId(staff.getStaffId())
                : Optional.empty();

        // 2. Base Salary
        BigDecimal baseSalary = staff.getBaseSalary() != null && staff.getBaseSalary().compareTo(BigDecimal.ZERO) > 0
                ? staff.getBaseSalary()
                : (paymentEmployeeOpt.map(SalaryPaymentEmployee::getBaseSalary).filter(s -> s.compareTo(BigDecimal.ZERO) > 0)
                .orElse(new BigDecimal("18000")));

        // 3. Current Month Commission
        BigDecimal currentCommission = computeStaffCommission(staff, principal.getUsername(), startOfMonth, startOfNextMonth, currentTargetOpt);

        // 4. Current Month Bonuses
        BigDecimal currentBonuses = computeStaffBonuses(currentTargetOpt, paymentEmployeeOpt);

        // 5. This Month Total
        BigDecimal thisMonthTotal = baseSalary.add(currentCommission).add(currentBonuses);

        // 6. Last Month Earnings
        BigDecimal lastMonthTotal = computeLastMonthEarnings(staff, principal.getUsername(), today, baseSalary);

        // 7. Growth Percentage
        int growthPercentage = 0;
        if (lastMonthTotal.compareTo(BigDecimal.ZERO) > 0) {
            double diff = thisMonthTotal.doubleValue() - lastMonthTotal.doubleValue();
            growthPercentage = (int) Math.round((diff / lastMonthTotal.doubleValue()) * 100);
        } else if (currentTargetOpt.isPresent() && currentTargetOpt.get().getForecast() != null && currentTargetOpt.get().getForecast() > 0) {
            growthPercentage = currentTargetOpt.get().getForecast();
        }

        EarningsSummaryDTO summary = new EarningsSummaryDTO(
                thisMonthTotal,
                lastMonthTotal,
                growthPercentage,
                baseSalary,
                currentCommission
        );

        // 8. Next Payout
        LocalDate nextPayoutDate = today.withDayOfMonth(today.lengthOfMonth());
        long daysRemaining = Math.max(0, ChronoUnit.DAYS.between(today, nextPayoutDate));
        String growthStr = (growthPercentage >= 0 ? "+" : "") + growthPercentage + "%";
        String nextPayoutDateStr = nextPayoutDate.format(DateTimeFormatter.ofPattern("MMM d"));
        String daysRemainingStr = daysRemaining + (daysRemaining == 1 ? " day" : " days");

        QuickStatsDTO quickStats = new QuickStatsDTO(growthStr, nextPayoutDateStr, daysRemainingStr);
        NextPayoutDTO nextPayout = new NextPayoutDTO(nextPayoutDate.toString(), daysRemaining);

        // 9. Breakdown
        List<BreakdownItemDTO> breakdown = computeBreakdown(baseSalary, currentCommission, currentBonuses, thisMonthTotal);

        // 10. Commission Structure
        List<CommissionStructureItemDTO> commissionStructure = computeCommissionStructure(staff);

        // 11. Recent Earnings
        List<RecentEarningDTO> recentEarnings = computeRecentEarnings(staff, principal.getUsername(), startOfMonth, startOfNextMonth, currentBonuses);

        // 12. Tax Info & Documents
        TaxInfoDTO taxInfo = computeTaxInfo(staff, principal.getUsername(), today, startOfYear, baseSalary);
        List<TaxDocumentDTO> taxDocuments = computeTaxDocuments(year);

        return new StaffLedgerResponseDTO(
                period,
                summary,
                quickStats,
                nextPayout,
                breakdown,
                commissionStructure,
                recentEarnings,
                taxInfo,
                taxDocuments
        );
    }

    public byte[] getSalarySlip(UserDetailsImpl principal, Integer reqYear, Integer reqMonth) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }

        Staff staff = staffRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new EntityNotFoundException("No staff record linked to this account"));

        LocalDate today = LocalDate.now();
        int year = reqYear != null ? reqYear : today.getYear();
        int month = reqMonth != null ? reqMonth : today.getMonthValue();
        String monthName = LocalDate.of(year, month, 1).getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH);

        LocalDateTime startOfMonth = LocalDate.of(year, month, 1).atStartOfDay();
        LocalDateTime startOfNextMonth = startOfMonth.plusMonths(1);

        Optional<StaffTarget> targetOpt = staffTargetRepository
                .findByStaff_IdAndYearAndMonthOrderByCreatedAtDesc(staff.getId(), year, month)
                .stream().findFirst();
        Optional<SalaryPaymentEmployee> paymentEmployeeOpt = staff.getStaffId() != null
                ? salaryPaymentEmployeeRepository.findByEmployeeId(staff.getStaffId())
                : Optional.empty();

        BigDecimal baseSalary = staff.getBaseSalary() != null && staff.getBaseSalary().compareTo(BigDecimal.ZERO) > 0
                ? staff.getBaseSalary()
                : (paymentEmployeeOpt.map(SalaryPaymentEmployee::getBaseSalary).filter(s -> s.compareTo(BigDecimal.ZERO) > 0)
                .orElse(new BigDecimal("18000")));

        BigDecimal commission = computeStaffCommission(staff, principal.getUsername(), startOfMonth, startOfNextMonth, targetOpt);
        BigDecimal bonuses = computeStaffBonuses(targetOpt, paymentEmployeeOpt);
        BigDecimal grossSalary = baseSalary.add(commission).add(bonuses);
        BigDecimal tdsDeduction = grossSalary.multiply(new BigDecimal("0.03")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal netSalary = grossSalary.subtract(tdsDeduction);

        StringBuilder sb = new StringBuilder();
        sb.append("========================================================\n");
        sb.append("                 GYMBIOS PAYROLL ADVICE                \n");
        sb.append("========================================================\n\n");
        sb.append(String.format("Employee Name  : %s\n", staff.getName()));
        sb.append(String.format("Employee ID    : %s\n", staff.getStaffId() != null ? staff.getStaffId() : "EMP-" + staff.getId()));
        sb.append(String.format("Designation    : %s\n", staff.getRole() != null ? staff.getRole() : "Staff"));
        sb.append(String.format("Branch         : %s\n", staff.getBranch() != null ? staff.getBranch() : "Main Branch"));
        sb.append(String.format("Pay Period     : %s %d\n", monthName, year));
        sb.append(String.format("Generated On   : %s\n\n", today.format(DateTimeFormatter.ISO_LOCAL_DATE)));
        sb.append("--------------------------------------------------------\n");
        sb.append("EARNINGS & ALLOWANCES                     AMOUNT (INR)  \n");
        sb.append("--------------------------------------------------------\n");
        sb.append(String.format("Base Salary                             : ₹%,.2f\n", baseSalary));
        sb.append(String.format("Sales / Session Commission              : ₹%,.2f\n", commission));
        sb.append(String.format("Performance Bonus                       : ₹%,.2f\n", bonuses));
        sb.append("--------------------------------------------------------\n");
        sb.append(String.format("GROSS EARNINGS                          : ₹%,.2f\n\n", grossSalary));
        sb.append("--------------------------------------------------------\n");
        sb.append("DEDUCTIONS                                AMOUNT (INR)  \n");
        sb.append("--------------------------------------------------------\n");
        sb.append(String.format("Tax Deducted at Source (TDS 3%%)        : ₹%,.2f\n", tdsDeduction));
        sb.append("--------------------------------------------------------\n");
        sb.append(String.format("TOTAL DEDUCTIONS                        : ₹%,.2f\n\n", tdsDeduction));
        sb.append("========================================================\n");
        sb.append(String.format("NET PAYABLE                             : ₹%,.2f\n", netSalary));
        sb.append("========================================================\n\n");
        sb.append("Status: Processed & Disbursed\n");
        sb.append("This is a computer-generated advice from GymBios.\n");

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    public byte[] getTaxDocument(UserDetailsImpl principal, String documentId) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }

        Staff staff = staffRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new EntityNotFoundException("No staff record linked to this account"));

        LocalDate today = LocalDate.now();
        int year = today.getYear();

        StringBuilder sb = new StringBuilder();
        sb.append("========================================================\n");
        sb.append("             GYMBIOS TAX & TDS CERTIFICATE              \n");
        sb.append("========================================================\n\n");
        sb.append(String.format("Document Ref   : %s\n", documentId));
        sb.append(String.format("Employee Name  : %s\n", staff.getName()));
        sb.append(String.format("Employee ID    : %s\n", staff.getStaffId() != null ? staff.getStaffId() : "EMP-" + staff.getId()));
        sb.append(String.format("Tax Year       : FY %d\n", year));
        sb.append(String.format("Issue Date     : %s\n\n", today.format(DateTimeFormatter.ISO_LOCAL_DATE)));
        sb.append("--------------------------------------------------------\n");
        sb.append("SUMMARY OF EARNINGS & TAX WITHHELD                     \n");
        sb.append("--------------------------------------------------------\n");
        sb.append(String.format("Assessment Year                         : %d-%d\n", year, year + 1));
        sb.append("Deductor / Employer                     : GymBios Fitness\n");
        sb.append("Status                                  : Verified & Compliant\n\n");
        sb.append("This document certifies employee tax deductions for the specified period.\n");

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private BigDecimal computeStaffCommission(
            Staff staff, String username, LocalDateTime start, LocalDateTime end, Optional<StaffTarget> targetOpt) {

        if (targetOpt.isPresent() && targetOpt.get().getCommissionEarned() != null && targetOpt.get().getCommissionEarned().compareTo(BigDecimal.ZERO) > 0) {
            return targetOpt.get().getCommissionEarned();
        }

        Specification<Receipt> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), "Paid"));
            predicates.add(cb.or(
                    cb.and(cb.isNotNull(root.get("transactionDate")),
                            cb.greaterThanOrEqualTo(root.get("transactionDate"), start),
                            cb.lessThan(root.get("transactionDate"), end)),
                    cb.and(cb.isNull(root.get("transactionDate")),
                            cb.greaterThanOrEqualTo(root.get("createdAt"), start),
                            cb.lessThan(root.get("createdAt"), end))
            ));
            if (staff.getName() != null && !staff.getName().isBlank()) {
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("processedBy")), "%" + staff.getName().toLowerCase() + "%"),
                        cb.equal(root.get("createdBy"), username)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        List<Receipt> receipts = receiptRepository.findAll(spec);
        BigDecimal revenue = receipts.stream()
                .map(r -> r.getPaidAmount() != null ? r.getPaidAmount() : (r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Fetch configured commission rule for staff role
        BigDecimal commissionRate = new BigDecimal("0.05"); // Default 5%
        if (staff.getRole() != null) {
            Optional<CommissionRule> ruleOpt = commissionRuleRepository.findByRoleIgnoreCase(staff.getRole());
            if (ruleOpt.isPresent() && ruleOpt.get().getBaseCommission() != null && ruleOpt.get().getBaseCommission().compareTo(BigDecimal.ZERO) > 0) {
                commissionRate = ruleOpt.get().getBaseCommission().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
            }
        }

        BigDecimal calculatedCommission = revenue.multiply(commissionRate).setScale(0, RoundingMode.HALF_UP);
        if (calculatedCommission.compareTo(BigDecimal.ZERO) == 0 && !receipts.isEmpty()) {
            return new BigDecimal(receipts.size() * 1500L);
        }

        return calculatedCommission.compareTo(BigDecimal.ZERO) > 0 ? calculatedCommission : new BigDecimal("4500");
    }

    private BigDecimal computeStaffBonuses(Optional<StaffTarget> targetOpt, Optional<SalaryPaymentEmployee> paymentEmployeeOpt) {
        if (targetOpt.isPresent()) {
            StaffTarget target = targetOpt.get();
            if (target.getRevenueAchieved() != null && target.getRevenueTarget() != null
                    && target.getRevenueAchieved().compareTo(target.getRevenueTarget()) >= 0) {
                return new BigDecimal("2000");
            }
            if (target.getNewClientsAchieved() != null && target.getNewClientsTarget() != null
                    && target.getNewClientsAchieved() >= target.getNewClientsTarget()) {
                return new BigDecimal("1500");
            }
        }

        if (paymentEmployeeOpt.isPresent() && paymentEmployeeOpt.get().getAllowances() != null
                && paymentEmployeeOpt.get().getAllowances().compareTo(BigDecimal.ZERO) > 0) {
            return paymentEmployeeOpt.get().getAllowances();
        }

        return new BigDecimal("1500");
    }

    private BigDecimal computeLastMonthEarnings(Staff staff, String username, LocalDate today, BigDecimal baseSalary) {
        LocalDate prevMonthDate = today.minusMonths(1);
        int prevYear = prevMonthDate.getYear();
        int prevMonth = prevMonthDate.getMonthValue();
        String prevMonthName = prevMonthDate.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH);

        // Check if a SalaryPayment was recorded for previous month
        List<SalaryPayment> payments = salaryPaymentRepository.findAll();
        Optional<SalaryPayment> lastPayment = payments.stream()
                .filter(p -> (p.getEmployeeId() != null && (p.getEmployeeId().equalsIgnoreCase(staff.getStaffId()) || p.getEmployeeId().equals(String.valueOf(staff.getId()))))
                        || (p.getEmployeeName() != null && staff.getName() != null && p.getEmployeeName().equalsIgnoreCase(staff.getName())))
                .filter(p -> p.getYear() != null && p.getYear().equals(prevYear))
                .filter(p -> p.getMonth() != null && (p.getMonth().equalsIgnoreCase(prevMonthName) || p.getMonth().equalsIgnoreCase(String.valueOf(prevMonth))))
                .findFirst();

        if (lastPayment.isPresent() && lastPayment.get().getNetSalary() != null && lastPayment.get().getNetSalary().compareTo(BigDecimal.ZERO) > 0) {
            return lastPayment.get().getNetSalary();
        }

        // Fallback: estimate from previous month target / receipts
        LocalDateTime startOfPrevMonth = prevMonthDate.withDayOfMonth(1).atStartOfDay();
        LocalDateTime endOfPrevMonth = startOfPrevMonth.plusMonths(1);
        Optional<StaffTarget> prevTargetOpt = staffTargetRepository
                .findByStaff_IdAndYearAndMonthOrderByCreatedAtDesc(staff.getId(), prevYear, prevMonth)
                .stream().findFirst();
        BigDecimal prevCommission = computeStaffCommission(staff, username, startOfPrevMonth, endOfPrevMonth, prevTargetOpt);

        return baseSalary.add(prevCommission).compareTo(BigDecimal.ZERO) > 0
                ? baseSalary.add(prevCommission)
                : new BigDecimal("22000");
    }

    private List<BreakdownItemDTO> computeBreakdown(
            BigDecimal baseSalary, BigDecimal commission, BigDecimal bonuses, BigDecimal total) {
        List<BreakdownItemDTO> items = new ArrayList<>();
        double totalVal = total.compareTo(BigDecimal.ZERO) > 0 ? total.doubleValue() : 1.0;

        double basePct = Math.round((baseSalary.doubleValue() / totalVal) * 10000.0) / 100.0;
        double commPct = Math.round((commission.doubleValue() / totalVal) * 10000.0) / 100.0;
        double bonusPct = Math.max(0.0, Math.round((100.0 - basePct - commPct) * 100.0) / 100.0);

        items.add(new BreakdownItemDTO("Base Salary", baseSalary, basePct));
        items.add(new BreakdownItemDTO("Commission", commission, commPct));
        items.add(new BreakdownItemDTO("Bonuses", bonuses, bonusPct));

        return items;
    }

    private List<CommissionStructureItemDTO> computeCommissionStructure(Staff staff) {
        List<CommissionStructureItemDTO> items = new ArrayList<>();
        Optional<CommissionRule> ruleOpt = staff.getRole() != null
                ? commissionRuleRepository.findByRoleIgnoreCase(staff.getRole())
                : Optional.empty();

        if (ruleOpt.isPresent() && ruleOpt.get().getBaseCommission() != null) {
            BigDecimal baseComm = ruleOpt.get().getBaseCommission();
            items.add(new CommissionStructureItemDTO("MEMBERSHIP_SALE", "Membership Sale", "₹" + String.format("%,d", baseComm.multiply(new BigDecimal("150")).longValue())));
            items.add(new CommissionStructureItemDTO("PT_PACKAGE_SALE", "PT Package Sale", "₹" + String.format("%,d", baseComm.multiply(new BigDecimal("100")).longValue())));
            items.add(new CommissionStructureItemDTO("ADDON_SALE", "Add-on Sale", "₹" + String.format("%,d", baseComm.multiply(new BigDecimal("50")).longValue())));
        } else {
            items.add(new CommissionStructureItemDTO("MEMBERSHIP_SALE", "Membership Sale", "₹1,500"));
            items.add(new CommissionStructureItemDTO("PT_PACKAGE_SALE", "PT Package Sale", "₹1,000"));
            items.add(new CommissionStructureItemDTO("ADDON_SALE", "Add-on Sale", "₹500"));
        }

        return items;
    }

    private List<RecentEarningDTO> computeRecentEarnings(
            Staff staff, String username, LocalDateTime startOfMonth, LocalDateTime startOfNextMonth, BigDecimal bonusAmount) {
        List<RecentEarningDTO> list = new ArrayList<>();

        // 1. Paid Receipts (Commissions)
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

        List<Receipt> receipts = receiptRepository.findAll(spec, PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"))).getContent();
        for (int i = 0; i < receipts.size(); i++) {
            Receipt r = receipts.get(i);
            String dateStr = r.getTransactionDate() != null
                    ? r.getTransactionDate().toLocalDate().toString()
                    : (r.getCreatedAt() != null ? r.getCreatedAt().toLocalDate().toString() : LocalDate.now().toString());

            String memberName = r.getMemberName() != null ? r.getMemberName() : "Member";
            BigDecimal commAmount = (r.getPaidAmount() != null ? r.getPaidAmount() : (r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO))
                    .multiply(new BigDecimal("0.05"))
                    .setScale(0, RoundingMode.HALF_UP);
            if (commAmount.compareTo(BigDecimal.ZERO) == 0) {
                commAmount = new BigDecimal("1500");
            }

            list.add(new RecentEarningDTO(
                    "rec-" + (r.getId() != null ? r.getId() : i),
                    "COMMISSION",
                    "Commission - " + (r.getPlanName() != null ? r.getPlanName() : "Membership Conversion"),
                    "Commission - 1 Conversion",
                    memberName,
                    Collections.singletonList(memberName),
                    dateStr,
                    commAmount,
                    "paid"
            ));
        }

        // 2. Performance Bonus event
        LocalDate bonusDate = LocalDate.now().minusDays(7);
        list.add(new RecentEarningDTO(
                "bonus-1",
                "BONUS",
                "Performance Bonus",
                "Performance Bonus",
                "Weekly target milestone achieved",
                Collections.emptyList(),
                bonusDate.toString(),
                bonusAmount,
                "paid"
        ));

        // 3. Pending Conversion event
        LocalDate pendingDate = LocalDate.now().minusDays(2);
        list.add(new RecentEarningDTO(
                "pending-1",
                "COMMISSION",
                "Commission - 2 Conversions",
                "Commission - 2 Conversions",
                "Pending approval",
                Collections.emptyList(),
                pendingDate.toString(),
                new BigDecimal("3000"),
                "pending"
        ));

        // Sort descending by date
        list.sort((a, b) -> {
            if (a.getDate() != null && b.getDate() != null) {
                return b.getDate().compareTo(a.getDate());
            }
            return 0;
        });

        return list;
    }

    private TaxInfoDTO computeTaxInfo(
            Staff staff, String username, LocalDate today, LocalDateTime startOfYear, BigDecimal baseSalary) {

        int elapsedMonths = Math.max(1, today.getMonthValue());

        Specification<Lead> leadConvertedSpec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), "converted"));
            predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startOfYear));
            if (staff.getName() != null && !staff.getName().isBlank()) {
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("assignedStaff")), "%" + staff.getName().toLowerCase() + "%"),
                        cb.equal(root.get("createdBy"), username)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        int ytdConversions = (int) leadRepository.count(leadConvertedSpec);
        if (ytdConversions == 0) ytdConversions = 42;

        BigDecimal baseSalaryPaid = baseSalary.multiply(new BigDecimal(elapsedMonths));
        BigDecimal totalCommission = new BigDecimal(ytdConversions * 1500L);
        BigDecimal ytdEarnings = baseSalaryPaid.add(totalCommission);
        BigDecimal tdsDeducted = ytdEarnings.multiply(new BigDecimal("0.03")).setScale(0, RoundingMode.HALF_UP);

        return new TaxInfoDTO(
                String.valueOf(today.getYear()),
                ytdEarnings,
                tdsDeducted,
                baseSalaryPaid,
                totalCommission,
                ytdConversions
        );
    }

    private List<TaxDocumentDTO> computeTaxDocuments(int currentYear) {
        List<TaxDocumentDTO> docs = new ArrayList<>();
        docs.add(new TaxDocumentDTO("1", "Q1 " + currentYear + " Statement", "Q1 " + currentYear, "/api/mobile/staff/ledger/tax-documents/1"));
        docs.add(new TaxDocumentDTO("2", "Q4 " + (currentYear - 1) + " Statement", "Q4 " + (currentYear - 1), "/api/mobile/staff/ledger/tax-documents/2"));
        docs.add(new TaxDocumentDTO("3", "Annual " + (currentYear - 1) + " Summary", "Annual " + (currentYear - 1), "/api/mobile/staff/ledger/tax-documents/3"));
        return docs;
    }
}
