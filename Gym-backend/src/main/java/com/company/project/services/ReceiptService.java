package com.company.project.services;

import com.company.project.dto.BillingStatsDTO;
import com.company.project.dto.MemberDueDTO;
import com.company.project.dto.PaginationDTO;
import com.company.project.dto.ReceiptResponseDTO;
import com.company.project.dto.ReceiptsPageResponseDTO;
import com.company.project.dto.SettlePaymentRequestDTO;
import com.company.project.entities.Member;
import com.company.project.entities.Receipt;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReceiptRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class ReceiptService {

    private final ReceiptRepository receiptRepository;
    private final MemberRepository memberRepository;
    private final FinancialEventService financialEventService;
    private final ReceiptVoucherService receiptVoucherService;

    public ReceiptService(ReceiptRepository receiptRepository,
                          MemberRepository memberRepository,
                          FinancialEventService financialEventService,
                          @Lazy ReceiptVoucherService receiptVoucherService) {
        this.receiptRepository     = receiptRepository;
        this.memberRepository      = memberRepository;
        this.financialEventService = financialEventService;
        this.receiptVoucherService = receiptVoucherService;
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ReceiptsPageResponseDTO getReceipts(String search, String transactionType,
                                               String status, int page, int limit) {
        Specification<Receipt> spec = buildSpec(search, transactionType, status);
        Pageable pageable = PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Receipt> receiptPage = receiptRepository.findAll(spec, pageable);

        List<ReceiptResponseDTO> dtos = receiptPage.getContent().stream()
                .map(ReceiptResponseDTO::fromEntity)
                .collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO(
                page, limit,
                receiptPage.getTotalElements(),
                receiptPage.getTotalPages()
        );

        return new ReceiptsPageResponseDTO(dtos, pagination);
    }

    @Transactional(readOnly = true)
    public ReceiptResponseDTO getReceiptById(Long id) {
        Receipt receipt = receiptRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Receipt not found with id: " + id));
        return ReceiptResponseDTO.fromEntity(receipt);
    }

    @Transactional(readOnly = true)
    public List<ReceiptResponseDTO> getPendingBillsForMember(Long memberDbId) {
        List<Receipt> bills = receiptRepository.findPendingByMember(memberDbId);

        // Fallback: if no bills found by DB id, search by member name.
        // Handles stale member_db_id (e.g. member re-created with new DB id).
        // Also self-heals by writing the correct member_db_id back to those receipts.
        if (bills.isEmpty()) {
            Optional<Member> memberOpt = memberRepository.findById(memberDbId);
            if (memberOpt.isPresent()) {
                Member member = memberOpt.get();
                bills = receiptRepository.findPendingByMemberName(member.getName());
                // Self-heal: stamp the correct member_db_id so future lookups hit the fast path
                for (Receipt r : bills) {
                    if (r.getMemberDbId() == null || !r.getMemberDbId().equals(memberDbId)) {
                        r.setMemberDbId(memberDbId);
                        receiptRepository.save(r);
                    }
                }
            }
        }

        return bills.stream()
                .map(ReceiptResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    // ── Write ───────────────────────────────────────────────────────────────

    public ReceiptResponseDTO createReceipt(Receipt receipt) {
        Receipt saved = receiptRepository.save(receipt);
        saved.setReceiptNo("RCPT-" + String.format("%010d", saved.getId()));
        saved = receiptRepository.save(saved);
        return ReceiptResponseDTO.fromEntity(saved);
    }

    /**
     * Called from MemberService after creating or renewing a member.
     */
    public Receipt createReceiptForMember(Member member, String transactionType, String paymentStatus) {
        Receipt r = new Receipt();
        r.setTransactionDate(LocalDateTime.now());
        r.setMemberDbId(member.getId());
        r.setMemberId(member.getMemberId());
        r.setMemberName(member.getName());
        r.setMemberPhone(member.getPhone());
        r.setTransactionType(transactionType);
        r.setAmount(member.getMembershipFee() != null ? member.getMembershipFee() : BigDecimal.ZERO);
        r.setPaymentMethod(member.getPaymentMethodUsed() != null ? member.getPaymentMethodUsed() : "Cash");
        boolean isPaid = "paid".equalsIgnoreCase(paymentStatus);
        r.setStatus(isPaid ? "Paid" : "Pending");
        r.setPaidAmount(isPaid ? r.getAmount() : BigDecimal.ZERO);
        r.setDueDate(member.getMembershipEndDate() != null ? member.getMembershipEndDate() : member.getExpiryDate());
        r.setPlanName(member.getMembershipPlan());
        r.setValidFrom(member.getMembershipStartDate());
        r.setValidTill(member.getMembershipEndDate() != null ? member.getMembershipEndDate() : member.getExpiryDate());
        r.setMembershipType(member.getMembershipType());
        r.setProcessedBy("Admin");

        Receipt saved = receiptRepository.save(r);
        saved.setReceiptNo("RCPT-" + String.format("%010d", saved.getId()));
        return receiptRepository.save(saved);
    }

    /**
     * Settle payment: apply payments to pending receipts, update member balance,
     * and create a settlement receipt documenting the transaction.
     */
    public ReceiptResponseDTO settlePayment(SettlePaymentRequestDTO req) {
        Member member = memberRepository.findById(req.getMemberDbId())
                .orElseThrow(() -> new RuntimeException("Member not found: " + req.getMemberDbId()));

        BigDecimal totalPaid = BigDecimal.ZERO;

        if (req.getBillPayments() != null) {
            for (SettlePaymentRequestDTO.BillPayment bp : req.getBillPayments()) {
                if (bp.getPayAmount() == null || bp.getPayAmount().compareTo(BigDecimal.ZERO) <= 0) continue;

                Receipt existing = receiptRepository.findById(bp.getReceiptId())
                        .orElseThrow(() -> new RuntimeException("Receipt not found: " + bp.getReceiptId()));

                BigDecimal currentPaid = existing.getPaidAmount() != null ? existing.getPaidAmount() : BigDecimal.ZERO;
                BigDecimal newPaid = currentPaid.add(bp.getPayAmount());
                existing.setPaidAmount(newPaid);

                BigDecimal fullAmount = existing.getAmount() != null ? existing.getAmount() : BigDecimal.ZERO;
                existing.setStatus(newPaid.compareTo(fullAmount) >= 0 ? "Paid" : "Partial");
                receiptRepository.save(existing);
                totalPaid = totalPaid.add(bp.getPayAmount());
            }
        }

        // Update member financial fields
        BigDecimal currentBalance = member.getOutstandingBalance() != null ? member.getOutstandingBalance() : BigDecimal.ZERO;
        member.setOutstandingBalance(currentBalance.subtract(totalPaid).max(BigDecimal.ZERO));
        member.setLastPaymentDate(LocalDateTime.now());
        member.setPaymentMethodUsed(req.getPaymentMethod());
        if (member.getOutstandingBalance().compareTo(BigDecimal.ZERO) == 0) {
            member.setPaymentStatus("paid");
        }
        memberRepository.save(member);

        // Create a settlement receipt
        Receipt settlement = new Receipt();
        settlement.setTransactionDate(LocalDateTime.now());
        settlement.setMemberDbId(member.getId());
        settlement.setMemberId(member.getMemberId());
        settlement.setMemberName(member.getName());
        settlement.setMemberPhone(member.getPhone());
        settlement.setTransactionType("Payment");
        settlement.setAmount(totalPaid);
        settlement.setPaidAmount(totalPaid);
        settlement.setPaymentMethod(req.getPaymentMethod());
        settlement.setStatus("Paid");
        settlement.setPlanName(member.getMembershipPlan());
        settlement.setValidFrom(member.getMembershipStartDate());
        settlement.setValidTill(member.getMembershipEndDate() != null ? member.getMembershipEndDate() : member.getExpiryDate());
        settlement.setMembershipType(member.getMembershipType());
        settlement.setProcessedBy("Admin");
        settlement.setRemarks(req.getRemarks());

        Receipt saved = receiptRepository.save(settlement);
        saved.setReceiptNo("RCPT-" + String.format("%010d", saved.getId()));
        saved = receiptRepository.save(saved);

        // Generate journal entry: DR Cash/Bank, CR Membership Revenue
        financialEventService.onMemberPaymentReceived(saved);

        // Create receipt voucher document for UI display
        if (totalPaid.compareTo(BigDecimal.ZERO) > 0) {
            receiptVoucherService.createVoucherFromModule(
                    "Payment Settlement – " + member.getName(),
                    "Membership",
                    member.getName(),
                    member.getId(),
                    totalPaid,
                    req.getPaymentMethod(),
                    saved.getReceiptNo(),
                    saved.getReceiptNo(),
                    req.getRemarks()
            );
        }

        return ReceiptResponseDTO.fromEntity(saved);
    }

    // ── Billing Stats ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public BillingStatsDTO getBillingStats() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfMonth = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime endOfMonth = startOfMonth.plusMonths(1);

        BigDecimal monthlyCollection = receiptRepository.sumPaidInPeriod(startOfMonth, endOfMonth);
        if (monthlyCollection == null) monthlyCollection = BigDecimal.ZERO;

        long overdueCount = memberRepository.countOverdueMembers();
        BigDecimal overdueAmount = memberRepository.sumOverdueBalance();
        if (overdueAmount == null) overdueAmount = BigDecimal.ZERO;

        LocalDateTime sevenDaysLater = now.plusDays(7);
        long dueSoonCount = memberRepository.countDueSoonMembers(now, sevenDaysLater);

        BigDecimal pendingThisMonth = receiptRepository.sumPendingInPeriod(startOfMonth, endOfMonth);
        if (pendingThisMonth == null) pendingThisMonth = BigDecimal.ZERO;
        BigDecimal totalExpected = monthlyCollection.add(pendingThisMonth);
        double collectionRate = totalExpected.compareTo(BigDecimal.ZERO) > 0
                ? monthlyCollection.divide(totalExpected, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)).doubleValue()
                : 100.0;

        // Last 12 months chart
        LocalDateTime yearAgo = startOfMonth.minusMonths(11);
        List<Receipt> paidReceipts = receiptRepository.findPaidSince(yearAgo);

        DateTimeFormatter labelFmt = DateTimeFormatter.ofPattern("MMM yyyy");
        Map<String, BigDecimal> monthlyMap = new LinkedHashMap<>();
        for (int i = 11; i >= 0; i--) {
            monthlyMap.put(startOfMonth.minusMonths(i).format(labelFmt), BigDecimal.ZERO);
        }
        for (Receipt r : paidReceipts) {
            if (r.getTransactionDate() != null) {
                String key = r.getTransactionDate().format(labelFmt);
                monthlyMap.computeIfPresent(key, (k, v) -> v.add(r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO));
            }
        }

        BigDecimal target = new BigDecimal("50000");
        List<BillingStatsDTO.MonthlyData> monthlyData = monthlyMap.entrySet().stream()
                .map(e -> new BillingStatsDTO.MonthlyData(e.getKey(), e.getValue(), target))
                .collect(Collectors.toList());

        // Payment method breakdown this month
        Map<String, BigDecimal> breakdown = new LinkedHashMap<>();
        for (Object[] row : receiptRepository.getPaymentMethodBreakdown(startOfMonth, endOfMonth)) {
            String method = row[0] != null ? (String) row[0] : "Unknown";
            BigDecimal total = row[2] instanceof BigDecimal ? (BigDecimal) row[2]
                    : BigDecimal.valueOf(((Number) row[2]).doubleValue());
            breakdown.put(method, total);
        }

        BillingStatsDTO stats = new BillingStatsDTO();
        stats.setMonthlyCollection(monthlyCollection);
        stats.setMonthlyTarget(target);
        stats.setOverdueCount(overdueCount);
        stats.setOverdueAmount(overdueAmount);
        stats.setDueSoonCount(dueSoonCount);
        stats.setCollectionRate(Math.min(collectionRate, 100.0));
        stats.setMonthlyData(monthlyData);
        stats.setPaymentMethodBreakdown(breakdown);
        return stats;
    }

    // ── Member Dues ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MemberDueDTO> getMemberDues() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime sevenDaysLater = now.plusDays(7);
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        List<MemberDueDTO> result = new ArrayList<>();
        for (Member m : memberRepository.findOverdueMembers()) {
            result.add(buildDueDTO(m, "Overdue", now, dateFmt));
        }
        for (Member m : memberRepository.findDueSoonMembers(now, sevenDaysLater)) {
            result.add(buildDueDTO(m, "Due Soon", now, dateFmt));
        }
        return result;
    }

    private MemberDueDTO buildDueDTO(Member m, String status, LocalDateTime now,
                                     DateTimeFormatter dateFmt) {
        MemberDueDTO dto = new MemberDueDTO();
        dto.setId(m.getId());
        dto.setMemberId(m.getMemberId());
        dto.setMemberName(m.getName());
        dto.setMemberEmail(m.getEmail());
        dto.setMemberPhone(m.getPhone());
        dto.setMembership(m.getMembershipPlan());
        dto.setAmount(m.getOutstandingBalance() != null && m.getOutstandingBalance().compareTo(BigDecimal.ZERO) > 0
                ? m.getOutstandingBalance() : m.getMembershipFee());
        dto.setDueDate(m.getNextPaymentDate() != null ? m.getNextPaymentDate().format(dateFmt) : null);
        dto.setStatus(status);
        if ("Overdue".equals(status) && m.getNextPaymentDate() != null) {
            long days = ChronoUnit.DAYS.between(m.getNextPaymentDate().toLocalDate(), now.toLocalDate());
            dto.setDaysOverdue((int) Math.max(0, days));
        }
        dto.setLastPayment(m.getLastPaymentDate() != null ? m.getLastPaymentDate().format(dateFmt) : null);
        return dto;
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private Specification<Receipt> buildSpec(String search, String transactionType, String status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("receiptNo")), pattern),
                        cb.like(cb.lower(root.get("memberId")), pattern),
                        cb.like(cb.lower(root.get("memberName")), pattern),
                        cb.like(cb.lower(root.get("memberPhone")), pattern)
                ));
            }
            if (transactionType != null && !transactionType.isBlank()) {
                predicates.add(cb.equal(root.get("transactionType"), transactionType));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
