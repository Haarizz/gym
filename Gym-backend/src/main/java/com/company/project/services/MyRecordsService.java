package com.company.project.services;

import com.company.project.entities.Receipt;
import com.company.project.entities.SalaryAdvance;
import com.company.project.entities.SalaryPayment;
import com.company.project.entities.SaleTransaction;
import com.company.project.entities.Staff;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.repositories.SalaryAdvanceRepository;
import com.company.project.repositories.SalaryPaymentRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.security.UserDetailsImpl;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Self-service records for My Profile: only ever the signed-in person's own data, so every role
 * can see it without the Payroll / Staff permissions that guard everyone else's.
 * <ul>
 *   <li>transactions: their salary payments and advances (when linked to a staff record), plus the
 *       receipts and POS sales recorded under their login in the last {@code days} days;</li>
 *   <li>attendance: their shift attendance for a month (staff records only).</li>
 * </ul>
 */
@Service
@Transactional(readOnly = true)
public class MyRecordsService {

    private static final int MAX_ROWS = 100;

    private final StaffRepository staffRepository;
    private final SalaryPaymentRepository salaryPaymentRepository;
    private final SalaryAdvanceRepository advanceRepository;
    private final ReceiptRepository receiptRepository;
    private final StaffProgressCalculator progressCalculator;
    private final ShiftAttendanceService attendance;
    private final ObjectMapper objectMapper;

    public MyRecordsService(StaffRepository staffRepository, SalaryPaymentRepository salaryPaymentRepository,
                            SalaryAdvanceRepository advanceRepository, ReceiptRepository receiptRepository,
                            StaffProgressCalculator progressCalculator, ShiftAttendanceService attendance,
                            ObjectMapper objectMapper) {
        this.staffRepository = staffRepository;
        this.salaryPaymentRepository = salaryPaymentRepository;
        this.advanceRepository = advanceRepository;
        this.receiptRepository = receiptRepository;
        this.progressCalculator = progressCalculator;
        this.attendance = attendance;
        this.objectMapper = objectMapper;
    }

    private Staff staffOf(UserDetailsImpl principal) {
        return staffRepository.findByUserId(principal.getId()).orElse(null);
    }

    public Map<String, Object> transactions(UserDetailsImpl principal, int days) {
        Staff staff = staffOf(principal);
        String code = staff != null ? staff.getStaffId() : null;
        String login = principal.getUsername();
        LocalDateTime since = LocalDate.now().minusDays(Math.max(1, Math.min(days, 366)) - 1L).atStartOfDay();

        List<Map<String, Object>> salary = new ArrayList<>();
        BigDecimal salaryYtd = BigDecimal.ZERO;
        if (code != null) {
            int year = LocalDate.now().getYear();
            for (SalaryPayment p : salaryPaymentRepository.findByEmployeeIdOrderByPaymentDateDesc(code)) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", p.getId());
                m.put("month", p.getMonth());
                m.put("year", p.getYear());
                m.put("net_salary", p.getNetSalary());
                m.put("payment_date", p.getPaymentDate() != null ? p.getPaymentDate().toString() : null);
                m.put("status", p.getStatus());
                m.put("method", primaryMethod(p.getSplitPaymentsJson()));
                JsonNode settlement = read(p.getSettlementJson());
                if (settlement != null) {
                    m.put("gross", settlement.path("gross").decimalValue());
                    m.put("total_deductions", settlement.path("total_deductions").decimalValue());
                }
                salary.add(m);
                if (p.getYear() != null && p.getYear() == year && p.getNetSalary() != null
                        && (p.getStatus() == null || "Paid".equalsIgnoreCase(p.getStatus()))) {
                    salaryYtd = salaryYtd.add(p.getNetSalary());
                }
            }
        }

        List<Map<String, Object>> advances = new ArrayList<>();
        BigDecimal advanceOwed = BigDecimal.ZERO;
        if (code != null) {
            for (SalaryAdvance a : advanceRepository.findAll(Sort.by(Sort.Direction.DESC, "id"))) {
                if (!code.equals(a.getEmployeeId())) continue;
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", a.getId());
                m.put("advance_type", a.getAdvanceType());
                m.put("requested_amount", a.getRequestedAmount());
                m.put("approved_amount", a.getApprovedAmount());
                m.put("balance", a.getBalance());
                m.put("total_deducted", a.getTotalDeducted());
                m.put("installment_count", a.getInstallmentCount());
                m.put("installment_amount", a.getInstallmentAmount());
                m.put("status", a.getStatus());
                m.put("request_date", a.getRequestDate() != null ? a.getRequestDate().toString() : null);
                m.put("approved_date", a.getApprovedDate() != null ? a.getApprovedDate().toString() : null);
                advances.add(m);
                if (AdvancesDeductionsService.REPAYING.contains(a.getStatus()) && a.getBalance() != null) {
                    advanceOwed = advanceOwed.add(a.getBalance());
                }
            }
        }

        // Receipts recorded under this login in the window (newest first).
        Specification<Receipt> mine = (root, query, cb) -> cb.and(
                cb.equal(root.get("createdBy"), login),
                cb.or(
                        cb.and(cb.isNotNull(root.get("transactionDate")), cb.greaterThanOrEqualTo(root.get("transactionDate"), since)),
                        cb.and(cb.isNull(root.get("transactionDate")), cb.greaterThanOrEqualTo(root.get("createdAt"), since))));
        List<Map<String, Object>> receipts = new ArrayList<>();
        BigDecimal collected = BigDecimal.ZERO;
        for (Receipt r : receiptRepository.findAll(mine, PageRequest.of(0, MAX_ROWS, Sort.by(Sort.Direction.DESC, "transactionDate", "id")))) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("receipt_no", r.getReceiptNo());
            m.put("member_name", r.getMemberName());
            m.put("plan_name", r.getPlanName());
            m.put("transaction_type", r.getTransactionType());
            m.put("amount", r.getAmount());
            m.put("paid_amount", r.getPaidAmount());
            m.put("payment_method", r.getPaymentMethod());
            m.put("status", r.getStatus());
            LocalDateTime when = r.getTransactionDate() != null ? r.getTransactionDate() : r.getCreatedAt();
            m.put("date", when != null ? when.toString() : null);
            receipts.add(m);
            if (r.getPaidAmount() != null && StaffProgressCalculator.REVENUE_RECEIPT_STATUSES.contains(r.getStatus())) {
                collected = collected.add(r.getPaidAmount());
            }
        }

        List<Map<String, Object>> sales = new ArrayList<>();
        BigDecimal posNet = BigDecimal.ZERO;
        List<SaleTransaction> posSales = new ArrayList<>(progressCalculator.posSales(login, since, LocalDateTime.now().plusMinutes(1)));
        posSales.sort(Comparator.comparing(SaleTransaction::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        for (SaleTransaction s : posSales) {
            BigDecimal total = s.getTotalAmount() != null ? s.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal refunded = s.getRefundedAmount() != null ? s.getRefundedAmount() : BigDecimal.ZERO;
            BigDecimal net = total.subtract(refunded).max(BigDecimal.ZERO);
            posNet = posNet.add(net);
            if (sales.size() >= MAX_ROWS) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("transaction_number", s.getTransactionNumber());
            m.put("member_name", s.getMemberName());
            m.put("payment_method", s.getPaymentMethod());
            m.put("total", total);
            m.put("refunded", refunded);
            m.put("net", net);
            m.put("date", s.getCreatedAt() != null ? s.getCreatedAt().toString() : null);
            sales.add(m);
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("salary_paid_ytd", salaryYtd);
        summary.put("advance_balance", advanceOwed);
        summary.put("collected", collected);
        summary.put("receipt_count", receipts.size());
        summary.put("pos_net", posNet);
        summary.put("pos_count", posSales.size());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("linked", staff != null);
        out.put("days", days);
        out.put("salary_payments", salary);
        out.put("advances", advances);
        out.put("receipts", receipts);
        out.put("pos_sales", sales);
        out.put("summary", summary);
        return out;
    }

    public Map<String, Object> attendance(UserDetailsImpl principal, YearMonth month) {
        Staff staff = staffOf(principal);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("linked", staff != null);
        out.put("month", month.toString());
        if (staff == null) return out;
        LocalDate from = month.atDay(1);
        LocalDate to = month.atEndOfMonth();
        LocalDate today = attendance.today();
        if (to.isAfter(today)) to = today;
        if (to.isBefore(from)) {
            out.put("days", List.of());
            out.put("summary", ShiftAttendanceService.summarize(List.of()));
            return out;
        }
        List<Map<String, Object>> days = attendance.dailyRecords(from, to, staff.getId());
        out.put("days", days);
        out.put("summary", ShiftAttendanceService.summarize(days));
        return out;
    }

    private String primaryMethod(String splitsJson) {
        JsonNode splits = read(splitsJson);
        if (splits == null || !splits.isArray() || splits.isEmpty()) return null;
        JsonNode best = null;
        for (JsonNode s : splits) {
            if (best == null || s.path("amount").asDouble(0) > best.path("amount").asDouble(0)) best = s;
        }
        return best != null ? best.path("mode").asText(null) : null;
    }

    private JsonNode read(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readTree(json);
        } catch (Exception e) {
            return null;
        }
    }
}
