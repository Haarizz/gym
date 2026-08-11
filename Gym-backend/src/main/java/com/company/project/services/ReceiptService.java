package com.company.project.services;

import com.company.project.dto.BillingStatsDTO;
import com.company.project.dto.MemberDueDTO;
import com.company.project.dto.PaginationDTO;
import com.company.project.dto.ReceiptResponseDTO;
import com.company.project.dto.ReceiptsPageResponseDTO;
import com.company.project.dto.SettlePaymentRequestDTO;
import com.company.project.entities.Member;
import com.company.project.entities.Receipt;
import com.company.project.exceptions.EntityNotFoundException;
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
    private final VoucherNumberService voucherNumberService;

    public ReceiptService(ReceiptRepository receiptRepository,
                          MemberRepository memberRepository,
                          FinancialEventService financialEventService,
                          @Lazy ReceiptVoucherService receiptVoucherService,
                          VoucherNumberService voucherNumberService) {
        this.receiptRepository     = receiptRepository;
        this.memberRepository      = memberRepository;
        this.financialEventService = financialEventService;
        this.receiptVoucherService = receiptVoucherService;
        this.voucherNumberService  = voucherNumberService;
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
                .orElseThrow(() -> new EntityNotFoundException("Receipt not found with id: " + id));
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

    // ── Member Statement of Account ──────────────────────────────────────────

    /**
     * Builds a member's full Statement of Account: every receipt billed/paid
     * against them, oldest-first, with a running balance. A billed-to-head member
     * (any minor, or an adult under family_head billing mode) never carries their
     * own receipts — their fees are folded into their head's bill (see
     * Receipt.minorCharges) — so their statement always comes back empty with
     * billedToHead=true and familyHeadName populated instead.
     */
    @Transactional(readOnly = true)
    public com.company.project.dto.MemberStatementResponseDTO getMemberStatement(
            Long memberDbId, LocalDateTime from, LocalDateTime to) {
        Member member = memberRepository.findById(memberDbId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found: " + memberDbId));

        com.company.project.dto.MemberStatementResponseDTO dto = new com.company.project.dto.MemberStatementResponseDTO();
        dto.setMemberDbId(String.valueOf(member.getId()));
        dto.setMemberId(member.getMemberId());
        dto.setMemberName(member.getName());
        dto.setMemberPhone(member.getPhone());
        dto.setIsMinor(Boolean.TRUE.equals(member.getIsMinor()));
        dto.setBilledToHead(member.isEffectivelyBilledToHead());

        if (member.isEffectivelyBilledToHead()) {
            String headName = null;
            if (member.getFamilyHeadId() != null) {
                headName = memberRepository.findByMemberId(member.getFamilyHeadId())
                        .map(Member::getName).orElse(null);
            }
            dto.setFamilyHeadName(headName);
            dto.setOpeningBalance(BigDecimal.ZERO);
            dto.setTotalBilled(BigDecimal.ZERO);
            dto.setTotalPaid(BigDecimal.ZERO);
            dto.setClosingBalance(BigDecimal.ZERO);
            dto.setLines(new ArrayList<>());
            return dto;
        }

        List<Receipt> receipts = receiptRepository.findByMemberDbIdOrderByTransactionDateAsc(memberDbId);
        // Fallback: handles stale/null member_db_id on older receipts, same as getPendingBillsForMember.
        if (receipts.isEmpty()) {
            receipts = receiptRepository.findByMemberNameOrderByTransactionDateAsc(member.getName());
            for (Receipt r : receipts) {
                if (r.getMemberDbId() == null || !r.getMemberDbId().equals(memberDbId)) {
                    r.setMemberDbId(memberDbId);
                    receiptRepository.save(r);
                }
            }
        }

        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        // Bills (New/Renewal/Add-on/Daily Entry) create debt; "Payment" receipts are
        // settlement vouchers created by settlePayment(). Each bill's paidAmount is
        // now an immutable record of only what it received at creation time — later
        // settlements never rewrite it, they exist purely as their own separate rows
        // with their own real date — so no cross-attribution/subtraction is needed
        // here: a bill's initial payment is just its own paidAmount, and every
        // settlement is simply its own row.
        List<Receipt> bills = receipts.stream()
                .filter(r -> !"Payment".equalsIgnoreCase(r.getTransactionType()))
                .collect(Collectors.toList());
        List<Receipt> settlements = receipts.stream()
                .filter(r -> "Payment".equalsIgnoreCase(r.getTransactionType()))
                .collect(Collectors.toList());

        List<com.company.project.dto.StatementLineDTO> allRows = new ArrayList<>();

        // Keyed by bill id so a later settlement (which only remembers
        // linkedBillId, not the minor charges themselves) can still be
        // attributed back to whichever minor's charge it paid down.
        Map<Long, Receipt> billsById = bills.stream()
                .collect(Collectors.toMap(Receipt::getId, r -> r, (a, bb) -> a));

        for (Receipt b : bills) {
            LocalDateTime txnDate = b.getTransactionDate();
            BigDecimal billAmount = b.getAmount() != null ? b.getAmount() : BigDecimal.ZERO;
            BigDecimal initialPayment = b.getPaidAmount() != null ? b.getPaidAmount() : BigDecimal.ZERO;
            List<com.company.project.dto.MinorChargeDTO> billMinorCharges = b.getMinorCharges();

            com.company.project.dto.StatementLineDTO invoiceRow = new com.company.project.dto.StatementLineDTO();
            invoiceRow.setId(b.getId());
            invoiceRow.setDate(txnDate != null ? txnDate.format(dateFmt) : null);
            invoiceRow.setReceiptNo(b.getReceiptNo());
            invoiceRow.setInvoiceNo(b.getInvoiceNo());
            invoiceRow.setType("Invoice");
            invoiceRow.setDescription(b.getPlanName() != null ? b.getPlanName() : b.getTransactionType());
            invoiceRow.setDebit(billAmount);
            invoiceRow.setCredit(BigDecimal.ZERO);
            invoiceRow.setStatus(b.getStatus());
            invoiceRow.setMinorCharges(billMinorCharges);
            allRows.add(invoiceRow);

            // Split the initial payment into one row per instrument actually used at
            // creation time (e.g. 50 via Card + 10 via Cash), not one lumped row under
            // a single method label. Walk the bill's own breakdown in order and consume
            // legs up to initialPayment's total.
            BigDecimal remaining = initialPayment;
            List<com.company.project.dto.PaymentSplitDTO> breakdown = b.getPaymentBreakdown();
            if (breakdown != null && !breakdown.isEmpty()) {
                for (com.company.project.dto.PaymentSplitDTO leg : breakdown) {
                    if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;
                    BigDecimal legAmount = leg.getAmount() != null ? leg.getAmount() : BigDecimal.ZERO;
                    BigDecimal take = legAmount.min(remaining);
                    if (take.compareTo(BigDecimal.ZERO) <= 0) continue;
                    com.company.project.dto.StatementLineDTO payRow =
                            buildPaymentRow(txnDate, dateFmt, b.getId(), b.getReceiptNo(), leg.getMethod(), take, b.getStatus());
                    payRow.setMinorCharges(scaleMinorCharges(billMinorCharges, take));
                    allRows.add(payRow);
                    remaining = remaining.subtract(take);
                }
            }
            if (remaining.compareTo(BigDecimal.ZERO) > 0) {
                com.company.project.dto.StatementLineDTO payRow =
                        buildPaymentRow(txnDate, dateFmt, b.getId(), b.getReceiptNo(), b.getPaymentMethod(), remaining, b.getStatus());
                payRow.setMinorCharges(scaleMinorCharges(billMinorCharges, remaining));
                allRows.add(payRow);
            }
        }

        for (Receipt s : settlements) {
            LocalDateTime txnDate = s.getTransactionDate();
            // A settlement only remembers which single bill it paid down
            // (linkedBillId) — recover that bill's minorCharges so a later
            // "clear dues" payment can still be traced back to the minor it
            // was actually for, e.g. "Due of Son paid by Dad".
            Receipt linkedBill = s.getLinkedBillId() != null ? billsById.get(s.getLinkedBillId()) : null;
            List<com.company.project.dto.MinorChargeDTO> linkedMinorCharges =
                    linkedBill != null ? linkedBill.getMinorCharges() : null;

            List<com.company.project.dto.PaymentSplitDTO> breakdown = s.getPaymentBreakdown();
            if (breakdown != null && !breakdown.isEmpty()) {
                for (com.company.project.dto.PaymentSplitDTO leg : breakdown) {
                    BigDecimal legAmount = leg.getAmount() != null ? leg.getAmount() : BigDecimal.ZERO;
                    if (legAmount.compareTo(BigDecimal.ZERO) <= 0) continue;
                    com.company.project.dto.StatementLineDTO payRow =
                            buildPaymentRow(txnDate, dateFmt, s.getId(), s.getReceiptNo(), leg.getMethod(), legAmount, s.getStatus());
                    payRow.setMinorCharges(scaleMinorCharges(linkedMinorCharges, legAmount));
                    allRows.add(payRow);
                }
            } else {
                BigDecimal amount = s.getAmount() != null ? s.getAmount() : BigDecimal.ZERO;
                if (amount.compareTo(BigDecimal.ZERO) > 0) {
                    com.company.project.dto.StatementLineDTO payRow =
                            buildPaymentRow(txnDate, dateFmt, s.getId(), s.getReceiptNo(), s.getPaymentMethod(), amount, s.getStatus());
                    payRow.setMinorCharges(scaleMinorCharges(linkedMinorCharges, amount));
                    allRows.add(payRow);
                }
            }
        }

        // Stable sort by date — ties (a bill's Invoice + initial-Payment row share the
        // bill's own date) keep insertion order, so Invoice always precedes its Payment.
        allRows.sort(Comparator.comparing(
                com.company.project.dto.StatementLineDTO::getDate,
                Comparator.nullsLast(Comparator.naturalOrder())));

        BigDecimal openingBalance = BigDecimal.ZERO;
        for (com.company.project.dto.StatementLineDTO row : allRows) {
            if (from != null && row.getDate() != null && LocalDateTime.parse(row.getDate() + "T00:00:00").isBefore(from)) {
                openingBalance = openingBalance.add(row.getDebit()).subtract(row.getCredit());
            }
        }

        BigDecimal running = openingBalance;
        BigDecimal totalBilled = BigDecimal.ZERO;
        BigDecimal totalPaid = BigDecimal.ZERO;
        List<com.company.project.dto.StatementLineDTO> lines = new ArrayList<>();

        for (com.company.project.dto.StatementLineDTO row : allRows) {
            LocalDateTime rowDate = row.getDate() != null ? LocalDateTime.parse(row.getDate() + "T00:00:00") : null;
            if (from != null && rowDate != null && rowDate.isBefore(from)) continue;
            if (to != null && rowDate != null && rowDate.isAfter(to)) continue;

            running = running.add(row.getDebit()).subtract(row.getCredit());
            totalBilled = totalBilled.add(row.getDebit());
            totalPaid = totalPaid.add(row.getCredit());
            row.setBalance(running);
            lines.add(row);
        }

        dto.setOpeningBalance(openingBalance);
        dto.setTotalBilled(totalBilled);
        dto.setTotalPaid(totalPaid);
        dto.setClosingBalance(running);
        dto.setLines(lines);
        return dto;
    }

    private com.company.project.dto.StatementLineDTO buildPaymentRow(
            LocalDateTime txnDate, DateTimeFormatter dateFmt, Long receiptId, String receiptNo,
            String method, BigDecimal amount, String status) {
        com.company.project.dto.StatementLineDTO row = new com.company.project.dto.StatementLineDTO();
        row.setId(receiptId);
        row.setDate(txnDate != null ? txnDate.format(dateFmt) : null);
        row.setReceiptNo(receiptNo);
        row.setType("Payment");
        row.setDescription("Payment received" + (method != null ? " (" + method + ")" : ""));
        row.setDebit(BigDecimal.ZERO);
        row.setCredit(amount);
        row.setPaymentMethod(method);
        row.setStatus(status);
        return row;
    }

    /**
     * Re-labels a bill's minorCharges for a single Payment row that only
     * covers part of that bill (e.g. a bill folding in one minor's AED 25
     * add-on gets paid in two legs of AED 10 and AED 15) — the row should
     * show the amount actually credited in THAT row, not the minor's whole
     * original charge amount. Only rewritten when there's exactly one minor
     * charge on the bill (the common case for both single add-ons and single
     * renewals); a bill folding in multiple minors' charges at once falls
     * back to showing their original amounts as-is (same best-effort
     * attribution limit as the settlement/bill date-window matching above).
     */
    private List<com.company.project.dto.MinorChargeDTO> scaleMinorCharges(
            List<com.company.project.dto.MinorChargeDTO> original, BigDecimal rowAmount) {
        if (original == null || original.isEmpty() || rowAmount == null || rowAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        if (original.size() == 1) {
            com.company.project.dto.MinorChargeDTO src = original.get(0);
            return List.of(new com.company.project.dto.MinorChargeDTO(
                    src.getMemberId(), src.getMemberDbId(), src.getName(), rowAmount, true));
        }
        return original;
    }

    // ── Write ───────────────────────────────────────────────────────────────

    public ReceiptResponseDTO createReceipt(Receipt receipt) {
        Receipt saved = receiptRepository.save(receipt);
        saved.setReceiptNo("RCPT-" + String.format("%010d", saved.getId()));
        saved.setInvoiceNo(voucherNumberService.next("INV"));
        saved = receiptRepository.save(saved);
        return ReceiptResponseDTO.fromEntity(saved);
    }

    /**
     * Normalizes payment method casing (e.g. "cash" -> "Cash") so downstream
     * consumers can rely on consistent capitalization regardless of source casing.
     */
    private String normalizePaymentMethod(String paymentMethod) {
        if (paymentMethod == null || paymentMethod.isBlank()) {
            return "Cash";
        }
        String trimmed = paymentMethod.trim();
        return Character.toUpperCase(trimmed.charAt(0)) + trimmed.substring(1).toLowerCase();
    }

    /**
     * Called from MemberService after creating or renewing a member.
     */
    public Receipt createReceiptForMember(Member member, String transactionType, String paymentStatus) {
        return createReceiptForMember(member, transactionType, paymentStatus, null, null, null);
    }

    public Receipt createReceiptForMember(Member member, String transactionType, String paymentStatus,
                                          List<com.company.project.dto.PaymentSplitDTO> paymentBreakdown) {
        return createReceiptForMember(member, transactionType, paymentStatus, paymentBreakdown, null, null);
    }

    /**
     * Records the invoice total, the amount actually received, and the true
     * remainder as separate fields — a partial/credit payment (e.g. AED 5 received
     * against a AED 45 invoice) must show paidAmount=5, not 0 or the full 45.
     * paidAmount is derived from member.outstandingBalance (invoice − outstanding)
     * rather than from the coarse paid/pending paymentStatus string, so a partial
     * amount is captured correctly regardless of which bucket the member's overall
     * status falls into.
     */
    public Receipt createReceiptForMember(Member member, String transactionType, String paymentStatus,
                                          List<com.company.project.dto.PaymentSplitDTO> paymentBreakdown,
                                          String bankAccountCode, String bankAccountName) {
        return createReceiptForMember(member, transactionType, paymentStatus, paymentBreakdown,
                bankAccountCode, bankAccountName, null, null);
    }

    /**
     * Same as above, but lets the caller override the invoice total and attach an
     * itemized minorCharges breakdown — used when a family head's bill folds in
     * one or more minor family members' fees, so the receipt's amount covers the
     * combined household charge rather than just member.getMembershipFee().
     */
    public Receipt createReceiptForMember(Member member, String transactionType, String paymentStatus,
                                          List<com.company.project.dto.PaymentSplitDTO> paymentBreakdown,
                                          String bankAccountCode, String bankAccountName,
                                          BigDecimal amountOverride,
                                          List<com.company.project.dto.MinorChargeDTO> minorCharges) {
        Receipt r = new Receipt();
        r.setTransactionDate(LocalDateTime.now());
        r.setMemberDbId(member.getId());
        r.setMemberId(member.getMemberId());
        r.setMemberName(member.getName());
        r.setMemberPhone(member.getPhone());
        r.setTransactionType(transactionType);

        BigDecimal totalAmount = amountOverride != null ? amountOverride
                : (member.getMembershipFee() != null ? member.getMembershipFee() : BigDecimal.ZERO);
        BigDecimal outstanding = member.getOutstandingBalance() != null ? member.getOutstandingBalance() : BigDecimal.ZERO;
        BigDecimal paidAmount = totalAmount.subtract(outstanding).max(BigDecimal.ZERO);

        r.setAmount(totalAmount);
        r.setMinorCharges(minorCharges);
        // The actual method the received portion moved through (Cash/Card/Bank Transfer/
        // Cheque). "Credit" only ever appears here when nothing has been received yet.
        r.setPaymentMethod(normalizePaymentMethod(member.getPaymentMethodUsed()));
        r.setPaymentBreakdown(paymentBreakdown);
        r.setPaidAmount(paidAmount);
        // Initial rollup state = exactly what this transaction paid; later
        // settlements advance this field without ever rewriting paidAmount itself.
        r.setTotalPaidToDate(paidAmount);
        // member.outstandingBalance is already finalized by the caller (MemberService)
        // before this method runs, so it reflects the true balance after this bill.
        r.setBalanceAfter(member.getOutstandingBalance() != null ? member.getOutstandingBalance() : BigDecimal.ZERO);
        if (paidAmount.compareTo(BigDecimal.ZERO) <= 0) {
            r.setStatus("Pending");
        } else if (paidAmount.compareTo(totalAmount) >= 0) {
            r.setStatus("Paid");
        } else {
            r.setStatus("Partial");
        }
        r.setBankAccountCode(bankAccountCode);
        r.setBankAccountName(bankAccountName);
        // A pending/partial balance is due on the member's payment due date, not the
        // membership renewal date — only fall back to the renewal date once fully paid.
        r.setDueDate(paidAmount.compareTo(totalAmount) < 0 && member.getNextPaymentDate() != null
                ? member.getNextPaymentDate()
                : (member.getMembershipEndDate() != null ? member.getMembershipEndDate() : member.getExpiryDate()));
        r.setPlanName(member.getMembershipPlan());
        r.setValidFrom(member.getMembershipStartDate());
        r.setValidTill(member.getMembershipEndDate() != null ? member.getMembershipEndDate() : member.getExpiryDate());
        r.setMembershipType(member.getMembershipType());
        r.setProcessedBy("Admin");

        Receipt saved = receiptRepository.save(r);
        saved.setReceiptNo("RCPT-" + String.format("%010d", saved.getId()));
        saved.setInvoiceNo(voucherNumberService.next("INV"));
        return receiptRepository.save(saved);
    }

    /**
     * A walk-in/day-pass visitor has no Member row (memberDbId/memberId are left
     * null), so this bypasses createReceiptForMember's Member-keyed logic entirely
     * — but still lands in the same `receipts` table with transactionType
     * "Daily Entry" (an existing, previously-unused category — see the field
     * comment on Receipt.transactionType and the "Daily Entry" filter already
     * present on the Billing/Member Receipts pages) so it shows up in Billing's
     * Member Receipts list and Monthly Collection stat exactly like a member
     * payment, instead of only being visible in the separate Receipt Voucher module.
     */
    public Receipt createWalkInReceipt(String visitorName, String visitorPhone, String planName,
                                       BigDecimal amount, BigDecimal paidAmount, String paymentMethod,
                                       List<com.company.project.dto.PaymentSplitDTO> paymentBreakdown,
                                       String remarks) {
        BigDecimal totalAmount = amount != null ? amount : BigDecimal.ZERO;
        BigDecimal paid = paidAmount != null ? paidAmount.max(BigDecimal.ZERO).min(totalAmount) : BigDecimal.ZERO;

        Receipt r = new Receipt();
        r.setTransactionDate(LocalDateTime.now());
        r.setMemberName(visitorName);
        r.setMemberPhone(visitorPhone);
        r.setTransactionType("Daily Entry");
        r.setAmount(totalAmount);
        r.setPaymentMethod(normalizePaymentMethod(paymentMethod));
        r.setPaymentBreakdown(paymentBreakdown);
        r.setPaidAmount(paid);
        r.setTotalPaidToDate(paid);
        r.setBalanceAfter(totalAmount.subtract(paid));
        r.setStatus(paid.compareTo(BigDecimal.ZERO) <= 0 ? "Pending" : (paid.compareTo(totalAmount) >= 0 ? "Paid" : "Partial"));
        r.setPlanName(planName);
        r.setValidFrom(LocalDateTime.now());
        r.setMembershipType("Walk-In");
        r.setProcessedBy("Admin");
        r.setRemarks(remarks);

        Receipt saved = receiptRepository.save(r);
        saved.setReceiptNo("RCPT-" + String.format("%010d", saved.getId()));
        saved.setInvoiceNo(voucherNumberService.next("INV"));
        saved = receiptRepository.save(saved);

        if (paid.compareTo(BigDecimal.ZERO) > 0) {
            financialEventService.onMemberPaymentReceived(saved);
        }
        return saved;
    }

    /**
     * Bills a single charge (e.g. a minor family member's renewal fee) onto their
     * guardian's account: the receipt's member fields are the guardian's — the
     * minor never gets their own receipt/ledger entry — with minorCharges
     * itemizing which family member the charge is actually for.
     */
    public Receipt createMinorChargeReceipt(Member guardian, Member minor, BigDecimal fee, boolean paid,
                                            String transactionType,
                                            List<com.company.project.dto.PaymentSplitDTO> paymentBreakdown,
                                            String bankAccountCode, String bankAccountName) {
        return createMinorChargeReceipt(guardian, minor, fee, paid ? fee : BigDecimal.ZERO,
                transactionType, null, paymentBreakdown, bankAccountCode, bankAccountName);
    }

    /**
     * Same as above, but takes a genuine partial paidAmount (e.g. AED 10 received
     * now against a AED 25 add-on) instead of a binary paid/unpaid flag, and an
     * optional description overriding the default plan-name label (used e.g. for
     * an add-on bought for a minor: "Add-on: Personal Training" rather than the
     * minor's membership plan name).
     */
    public Receipt createMinorChargeReceipt(Member guardian, Member minor, BigDecimal fee, BigDecimal paidAmount,
                                            String transactionType, String description,
                                            List<com.company.project.dto.PaymentSplitDTO> paymentBreakdown,
                                            String bankAccountCode, String bankAccountName) {
        Receipt r = new Receipt();
        r.setTransactionDate(LocalDateTime.now());
        r.setMemberDbId(guardian.getId());
        r.setMemberId(guardian.getMemberId());
        r.setMemberName(guardian.getName());
        r.setMemberPhone(guardian.getPhone());
        r.setTransactionType(transactionType);

        BigDecimal amount = fee != null ? fee : BigDecimal.ZERO;
        BigDecimal paid = paidAmount != null ? paidAmount.max(BigDecimal.ZERO).min(amount) : BigDecimal.ZERO;
        boolean fullyPaid = paid.compareTo(amount) >= 0;

        r.setAmount(amount);
        r.setPaymentMethod(normalizePaymentMethod(guardian.getPaymentMethodUsed()));
        r.setPaymentBreakdown(paymentBreakdown);
        r.setPaidAmount(paid);
        r.setTotalPaidToDate(paid);
        r.setBalanceAfter(guardian.getOutstandingBalance() != null ? guardian.getOutstandingBalance() : BigDecimal.ZERO);
        r.setStatus(paid.compareTo(BigDecimal.ZERO) <= 0 ? "Pending" : (fullyPaid ? "Paid" : "Partial"));
        r.setBankAccountCode(bankAccountCode);
        r.setBankAccountName(bankAccountName);
        r.setDueDate(fullyPaid ? null : guardian.getNextPaymentDate());
        r.setPlanName(description != null ? description : minor.getMembershipPlan());
        r.setValidFrom(minor.getMembershipStartDate());
        r.setValidTill(minor.getMembershipEndDate() != null ? minor.getMembershipEndDate() : minor.getExpiryDate());
        r.setMembershipType(guardian.getMembershipType());
        r.setProcessedBy("Admin");
        r.setRemarks("Charge for family member: " + minor.getName()
                + (minor.getRelationshipToHead() != null ? " (" + minor.getRelationshipToHead() + ")" : ""));
        r.setMinorCharges(List.of(new com.company.project.dto.MinorChargeDTO(
                minor.getMemberId(), minor.getId(), minor.getName(), amount, fullyPaid)));

        Receipt saved = receiptRepository.save(r);
        saved.setReceiptNo("RCPT-" + String.format("%010d", saved.getId()));
        saved.setInvoiceNo(voucherNumberService.next("INV"));
        return receiptRepository.save(saved);
    }

    /**
     * Settle payment: apply payments to pending receipts, update member balance,
     * and create a settlement receipt documenting the transaction.
     */
    public ReceiptResponseDTO settlePayment(SettlePaymentRequestDTO req) {
        Member member = memberRepository.findById(req.getMemberDbId())
                .orElseThrow(() -> new EntityNotFoundException("Member not found: " + req.getMemberDbId()));

        BigDecimal totalPaid = BigDecimal.ZERO;
        Long soleBillId = null;
        boolean singleBill = req.getBillPayments() != null && req.getBillPayments().size() == 1;

        if (req.getBillPayments() != null) {
            for (SettlePaymentRequestDTO.BillPayment bp : req.getBillPayments()) {
                if (bp.getPayAmount() == null || bp.getPayAmount().compareTo(BigDecimal.ZERO) <= 0) continue;

                Receipt existing = receiptRepository.findById(bp.getReceiptId())
                        .orElseThrow(() -> new EntityNotFoundException("Receipt not found: " + bp.getReceiptId()));

                // The bill's own transaction facts — paidAmount, paymentMethod,
                // paymentBreakdown, balanceAfter — are an immutable record of what
                // happened when THIS receipt was created. A later settlement must
                // NEVER rewrite them (that used to merge unrelated payment events into
                // one row, e.g. "Paid in 2 payments: 25 Cash + 25 Bank Transfer").
                // This settlement gets its own separate receipt below, with its own
                // number, date, method and amount. Only the bill's live rollup state —
                // how much has been paid toward it in total, and whether it's now
                // fully settled — may still advance, the same way
                // Member.outstandingBalance does.
                BigDecimal billPaidSoFar = existing.getTotalPaidToDate() != null
                        ? existing.getTotalPaidToDate()
                        : (existing.getPaidAmount() != null ? existing.getPaidAmount() : BigDecimal.ZERO);
                BigDecimal newBillPaid = billPaidSoFar.add(bp.getPayAmount());
                existing.setTotalPaidToDate(newBillPaid);

                BigDecimal fullAmount = existing.getAmount() != null ? existing.getAmount() : BigDecimal.ZERO;
                existing.setStatus(newBillPaid.compareTo(fullAmount) >= 0 ? "Paid" : "Partial");

                receiptRepository.save(existing);
                totalPaid = totalPaid.add(bp.getPayAmount());
                if (singleBill) soleBillId = existing.getId();
            }
        }

        // Update member financial fields
        BigDecimal currentBalance = member.getOutstandingBalance() != null ? member.getOutstandingBalance() : BigDecimal.ZERO;
        member.setOutstandingBalance(currentBalance.subtract(totalPaid).max(BigDecimal.ZERO));
        member.setLastPaymentDate(LocalDateTime.now());
        member.setPaymentMethodUsed(req.getPaymentMethod());
        if (member.getOutstandingBalance().compareTo(BigDecimal.ZERO) == 0) {
            member.setPaymentStatus("paid");
        } else if (totalPaid.compareTo(BigDecimal.ZERO) > 0) {
            member.setPaymentStatus("partial");
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
        settlement.setPaymentMethod(normalizePaymentMethod(req.getPaymentMethod()));
        settlement.setPaymentBreakdown(req.getPaymentBreakdown());
        settlement.setStatus("Paid");
        settlement.setPlanName(member.getMembershipPlan());
        settlement.setValidFrom(member.getMembershipStartDate());
        settlement.setValidTill(member.getMembershipEndDate() != null ? member.getMembershipEndDate() : member.getExpiryDate());
        settlement.setMembershipType(member.getMembershipType());
        settlement.setProcessedBy("Admin");
        settlement.setRemarks(req.getRemarks());
        settlement.setLinkedBillId(soleBillId);
        // member.outstandingBalance was just finalized above (post-settlement), so this
        // is the true "remaining due after this payment" snapshot for the receipt row.
        settlement.setBalanceAfter(member.getOutstandingBalance());

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
                    req.getRemarks(),
                    req.getPaymentBreakdown()
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
                monthlyMap.computeIfPresent(key, (k, v) -> v.add(r.getPaidAmount() != null ? r.getPaidAmount() : BigDecimal.ZERO));
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
        for (Member m : memberRepository.findPendingMembersWithBalance(now, sevenDaysLater)) {
            String statusLabel = "partial".equalsIgnoreCase(m.getPaymentStatus()) ? "Partial" : "Pending";
            result.add(buildDueDTO(m, statusLabel, now, dateFmt));
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
        boolean hasOwnBalance = m.getOutstandingBalance() != null && m.getOutstandingBalance().compareTo(BigDecimal.ZERO) > 0;
        dto.setAmount(hasOwnBalance ? m.getOutstandingBalance() : m.getMembershipFee());
        // Distinguishes an unpaid balance still owed on the CURRENT cycle (Membership
        // Due — e.g. a partial payment at registration/last renewal) from a member
        // who paid their current cycle in full but whose cycle is now ending/ended
        // and needs to pay again to renew (Renewal Due).
        dto.setDueType(hasOwnBalance ? "Membership Due" : "Renewal Due");
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
