package com.company.project.services.pos;

import com.company.project.dto.PaymentSplitDTO;
import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.*;
import com.company.project.entities.AccountHead;
import com.company.project.entities.CashMovement;
import com.company.project.entities.Member;
import com.company.project.entities.PosCashMovementCategory;
import com.company.project.entities.PosCorrection;
import com.company.project.entities.PosDayClose;
import com.company.project.entities.PosSession;
import com.company.project.entities.SaleTransaction;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.exceptions.SupervisorApprovalRequiredException;
import com.company.project.repositories.AccountHeadRepository;
import com.company.project.repositories.CashMovementRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.PosCorrectionRepository;
import com.company.project.repositories.PosDayCloseRepository;
import com.company.project.repositories.PosSessionRepository;
import com.company.project.repositories.SaleTransactionRepository;
import com.company.project.services.FinancialEventService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

import static com.company.project.services.pos.PosSupport.*;

/**
 * Maker-checker corrections of posted POS records (BillBull's POS Administration › Corrections).
 * A cashier or manager raises a request with a reason; a supervisor other than the requester
 * approves or rejects it; an approved request is applied straight away — the record is changed,
 * the ledger difference is journaled, the back-office invoice and the session / day-close
 * reconciliation are refreshed. A request that can no longer be applied ends FAILED with the
 * reason and may be retried.
 * <ul>
 *   <li>SALE · PAYMENT_MODE — re-split a paid sale across Cash / Card / Online (same total).</li>
 *   <li>SALE · CUSTOMER — attach, change or remove the member on a sale.</li>
 *   <li>CASH_MOVEMENT · CATEGORY — move a cash in / out to another category (re-posted when the
 *       ledger account changes).</li>
 *   <li>SESSION · DENOMINATION — fix a closed session's counted cash.</li>
 * </ul>
 */
@Service
@Transactional
public class PosCorrectionService {

    public static final String REQUESTED = "REQUESTED";
    public static final String PENDING = "PENDING_APPROVAL";
    public static final String APPROVED = "APPROVED";
    public static final String APPLIED = "APPLIED";
    public static final String REJECTED = "REJECTED";
    public static final String CANCELLED = "CANCELLED";
    public static final String FAILED = "FAILED";
    private static final List<String> OPEN_STATUSES = List.of(REQUESTED, PENDING, APPROVED);
    private static final List<String> STATUSES = List.of(REQUESTED, PENDING, APPROVED, APPLIED, REJECTED, CANCELLED, FAILED);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final PosCorrectionRepository repository;
    private final SaleTransactionRepository saleRepo;
    private final CashMovementRepository movementRepo;
    private final PosSessionRepository sessionRepo;
    private final PosDayCloseRepository dayCloseRepo;
    private final MemberRepository memberRepo;
    private final AccountHeadRepository accountRepo;
    private final PosCashCategoryService categoryService;
    private final PosReportService reportService;
    private final PosInvoiceService invoiceService;
    private final FinancialEventService financialEventService;
    private final PosAuditService auditService;
    private final PosSupport support;

    public PosCorrectionService(PosCorrectionRepository repository, SaleTransactionRepository saleRepo,
                                CashMovementRepository movementRepo, PosSessionRepository sessionRepo,
                                PosDayCloseRepository dayCloseRepo, MemberRepository memberRepo,
                                AccountHeadRepository accountRepo, PosCashCategoryService categoryService,
                                PosReportService reportService, PosInvoiceService invoiceService,
                                FinancialEventService financialEventService, PosAuditService auditService,
                                PosSupport support) {
        this.repository = repository;
        this.saleRepo = saleRepo;
        this.movementRepo = movementRepo;
        this.sessionRepo = sessionRepo;
        this.dayCloseRepo = dayCloseRepo;
        this.memberRepo = memberRepo;
        this.accountRepo = accountRepo;
        this.categoryService = categoryService;
        this.reportService = reportService;
        this.invoiceService = invoiceService;
        this.financialEventService = financialEventService;
        this.auditService = auditService;
        this.support = support;
    }

    // ── Request ─────────────────────────────────────────────────────────────

    public CorrectionDTO create(PosRequests.CorrectionCreate req) {
        Long branchId = support.requireBranch();
        String targetType = upper(req.targetType());
        String type = upper(req.correctionType());
        if (req.targetId() == null) throw new BusinessRuleViolationException("Pick the record to correct.");
        String reason = trimToNull(req.reason());
        if (reason == null || reason.length() < 5) {
            throw new BusinessRuleViolationException("Explain the correction (at least 5 characters).");
        }
        if (!repository.findByTargetTypeAndTargetIdAndStatusIn(targetType, req.targetId(), OPEN_STATUSES).isEmpty()) {
            throw new BusinessRuleViolationException("This record already has a correction waiting — finish or cancel it first.");
        }

        Draft d = switch (targetType + ":" + type) {
            case "SALE:PAYMENT_MODE" -> draftPaymentMode(sale(req.targetId()), req.paymentAllocations());
            case "SALE:CUSTOMER" -> draftCustomer(sale(req.targetId()), req.memberId());
            case "CASH_MOVEMENT:CATEGORY" -> draftCategory(movement(req.targetId()), req.categoryId());
            case "SESSION:DENOMINATION" -> draftDenomination(session(req.targetId()), req.closingCash(), req.closingDenominations());
            default -> throw new BusinessRuleViolationException("Unsupported correction: " + targetType + " / " + type + ".");
        };

        PosCorrection c = new PosCorrection();
        c.setBranchId(branchId);
        c.setTargetType(targetType);
        c.setTargetId(req.targetId());
        c.setTargetLabel(d.label);
        c.setCorrectionType(type);
        c.setOriginalJson(json(d.original));
        c.setCorrectedJson(json(d.corrected));
        c.setDifferenceAmount(d.difference);
        c.setSummary(d.summary);
        c.setReason(reason);
        c.setStatus(REQUESTED);
        c.setRequestedBy(support.currentUsername());
        c.setRequestedAt(LocalDateTime.now());
        if (Boolean.TRUE.equals(req.submit())) {
            c.setStatus(PENDING);
            c.setSubmittedAt(LocalDateTime.now());
        }
        c = repository.save(c);
        c.setRequestNumber("COR-" + LocalDateTime.now().format(DateTimeFormatter.BASIC_ISO_DATE) + "-"
                + String.format("%05d", c.getId()));
        c = repository.save(c);
        audit("CORRECTION_REQUEST", c, d.summary + " | " + reason, null);
        return toDto(c);
    }

    public CorrectionDTO submit(Long id) {
        PosCorrection c = find(id);
        mineOrSupervisor(c, "submit");
        if (!REQUESTED.equals(c.getStatus())) throw new BusinessRuleViolationException("Only a draft request can be submitted.");
        c.setStatus(PENDING);
        c.setSubmittedAt(LocalDateTime.now());
        c = repository.save(c);
        audit("CORRECTION_SUBMIT", c, c.getSummary(), null);
        return toDto(c);
    }

    public CorrectionDTO cancel(Long id) {
        PosCorrection c = find(id);
        mineOrSupervisor(c, "cancel");
        if (!REQUESTED.equals(c.getStatus()) && !PENDING.equals(c.getStatus())) {
            throw new BusinessRuleViolationException("A " + c.getStatus().toLowerCase(Locale.ROOT).replace('_', ' ')
                    + " correction cannot be cancelled.");
        }
        c.setStatus(CANCELLED);
        c.setCancelledBy(support.currentUsername());
        c.setCancelledAt(LocalDateTime.now());
        c = repository.save(c);
        audit("CORRECTION_CANCEL", c, c.getSummary(), null);
        return toDto(c);
    }

    // ── Decide ──────────────────────────────────────────────────────────────

    /** Approves and applies. A request that no longer fits the record ends FAILED (retry with {@link #apply}). */
    public CorrectionDTO approve(Long id, PosRequests.CorrectionDecision req) {
        PosCorrection c = find(id);
        checker(c);
        if (!PENDING.equals(c.getStatus())) throw new BusinessRuleViolationException("Only a submitted request can be approved.");
        c.setStatus(APPROVED);
        c.setApprovedBy(support.currentUsername());
        c.setApprovedAt(LocalDateTime.now());
        c.setApprovalNotes(req == null ? null : trimToNull(req.notes()));
        audit("CORRECTION_APPROVE", c, c.getSummary(), c.getApprovedBy());
        return toDto(execute(c));
    }

    public CorrectionDTO reject(Long id, PosRequests.CorrectionDecision req) {
        PosCorrection c = find(id);
        checker(c);
        if (!PENDING.equals(c.getStatus())) throw new BusinessRuleViolationException("Only a submitted request can be rejected.");
        String notes = req == null ? null : trimToNull(req.notes());
        if (notes == null) throw new BusinessRuleViolationException("Give a reason for rejecting the correction.");
        c.setStatus(REJECTED);
        c.setRejectedBy(support.currentUsername());
        c.setRejectedAt(LocalDateTime.now());
        c.setRejectionReason(notes);
        c = repository.save(c);
        audit("CORRECTION_REJECT", c, notes, c.getRejectedBy());
        return toDto(c);
    }

    /** Retries an approved or failed request. */
    public CorrectionDTO apply(Long id) {
        PosCorrection c = find(id);
        if (!support.isSupervisor()) throw new SupervisorApprovalRequiredException("Only a supervisor can apply a correction.");
        if (!APPROVED.equals(c.getStatus()) && !FAILED.equals(c.getStatus())) {
            throw new BusinessRuleViolationException("Only an approved or failed correction can be applied.");
        }
        return toDto(execute(c));
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public CorrectionsPage list(String status, String targetType, String search, int page, int size) {
        String st = upper(status);
        String tt = upper(targetType);
        String q = trimToNull(search);
        Specification<PosCorrection> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (!st.isEmpty() && !"ALL".equals(st)) {
                if ("OPEN".equals(st)) p.add(root.get("status").in(OPEN_STATUSES));
                else p.add(cb.equal(root.get("status"), st));
            }
            if (!tt.isEmpty() && !"ALL".equals(tt)) p.add(cb.equal(root.get("targetType"), tt));
            if (q != null) {
                String like = "%" + q.toLowerCase(Locale.ROOT) + "%";
                p.add(cb.or(cb.like(cb.lower(root.get("requestNumber")), like),
                        cb.like(cb.lower(root.get("targetLabel")), like),
                        cb.like(cb.lower(root.get("requestedBy")), like),
                        cb.like(cb.lower(root.get("summary")), like)));
            }
            return cb.and(p.toArray(new Predicate[0]));
        };
        int safeSize = Math.min(Math.max(size, 1), 100);
        Page<PosCorrection> result = repository.findAll(spec,
                PageRequest.of(Math.max(page, 1) - 1, safeSize, Sort.by(Sort.Direction.DESC, "id")));
        return new CorrectionsPage(result.getContent().stream().map(this::toDto).toList(),
                new PageMeta(page, safeSize, result.getTotalElements(), result.getTotalPages()));
    }

    @Transactional(readOnly = true)
    public List<CorrectionDTO> forTarget(String targetType, Long targetId) {
        return repository.findByTargetTypeAndTargetIdOrderByCreatedAtDesc(upper(targetType), targetId)
                .stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public CorrectionDTO get(Long id) {
        return toDto(find(id));
    }

    @Transactional(readOnly = true)
    public CorrectionDashboard dashboard() {
        List<PosCorrection> all = repository.findAll();
        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (String s : STATUSES) byStatus.put(s, 0L);
        Map<String, Long> byType = new LinkedHashMap<>();
        long mine = 0;
        BigDecimal applied = BigDecimal.ZERO;
        for (PosCorrection c : all) {
            byStatus.merge(c.getStatus(), 1L, Long::sum);
            byType.merge(c.getCorrectionType(), 1L, Long::sum);
            if (canDecide(c)) mine++;
            if (APPLIED.equals(c.getStatus())) applied = applied.add(nz(c.getDifferenceAmount()));
        }
        return new CorrectionDashboard(byStatus, byType, mine, r2(applied));
    }

    // ── Drafts (validation + snapshots, no changes) ─────────────────────────

    private static final class Draft {
        String label;
        String summary;
        BigDecimal difference;
        Map<String, Object> original = new LinkedHashMap<>();
        Map<String, Object> corrected = new LinkedHashMap<>();
        /** PAYMENT_MODE: the new legs. */
        List<PaymentSplitDTO> legs;
    }

    private Draft draftPaymentMode(SaleTransaction t, List<PosRequests.PaymentAllocation> allocations) {
        assertCorrectableSale(t);
        List<PaymentSplitDTO> old = PosReportService.legsOf(t);
        for (PaymentSplitDTO l : old) {
            String b = PosReportService.bucket(l.getMethod());
            if (!PosReportService.CASH.equals(b) && !PosReportService.CARD.equals(b) && !PosReportService.ONLINE.equals(b)) {
                throw new BusinessRuleViolationException("Only Cash, Card and Online payments can be corrected — "
                        + t.getTransactionNumber() + " has a " + l.getMethod() + " payment.");
            }
        }
        if (allocations == null || allocations.isEmpty()) throw new BusinessRuleViolationException("Enter the corrected payment split.");
        BigDecimal total = r2(t.getTotalAmount());
        BigDecimal cash = BigDecimal.ZERO;
        List<PaymentSplitDTO> nonCash = new ArrayList<>();
        for (PosRequests.PaymentAllocation a : allocations) {
            String type = upper(a.type());
            BigDecimal amount = r2(a.amount());
            if (amount.signum() <= 0) continue;
            switch (type) {
                case "CASH" -> cash = cash.add(amount);
                case "CARD" -> {
                    PaymentSplitDTO leg = new PaymentSplitDTO(PosCheckoutService.LEG_CARD, amount, trimToNull(a.reference()));
                    leg.setCardType(trimToNull(a.subtype()));
                    nonCash.add(leg);
                }
                case "ONLINE" -> {
                    if (a.bankAccountId() == null) throw new BusinessRuleViolationException("Select the bank account that received the online payment.");
                    AccountHead bank = accountRepo.findById(a.bankAccountId())
                            .orElseThrow(() -> new EntityNotFoundException("Bank account not found: " + a.bankAccountId()));
                    PaymentSplitDTO leg = new PaymentSplitDTO(PosCheckoutService.LEG_ONLINE, amount, trimToNull(a.reference()));
                    leg.setBankAccountCode(bank.getCode());
                    leg.setBankAccountName(bank.getName());
                    leg.setOnlinePaymentType(trimToNull(a.subtype()));
                    nonCash.add(leg);
                }
                default -> throw new BusinessRuleViolationException("A payment can only be corrected to Cash, Card or Online.");
            }
        }
        BigDecimal sum = cash;
        for (PaymentSplitDTO l : nonCash) sum = sum.add(l.getAmount());
        if (sum.compareTo(total) != 0) {
            throw new BusinessRuleViolationException("The corrected payments (" + r2(sum) + ") must add up to the sale total (" + total + ").");
        }
        List<PaymentSplitDTO> legs = new ArrayList<>();
        if (cash.signum() > 0) legs.add(new PaymentSplitDTO(PosCheckoutService.LEG_CASH, cash, null));
        legs.addAll(nonCash);
        if (sameLegs(old, legs)) throw new BusinessRuleViolationException("The corrected payment is the same as the original.");

        Draft d = new Draft();
        d.label = t.getTransactionNumber();
        d.legs = legs;
        d.original.put("payment_method", t.getPaymentMethod());
        d.original.put("payment_summary", t.getPaymentSummary());
        d.original.put("legs", legsJson(old));
        d.corrected.put("payment_method", methodOf(legs));
        d.corrected.put("payment_summary", PosCheckoutService.summarize(legs));
        d.corrected.put("legs", legsJson(legs));
        BigDecimal oldCash = cashOf(old), newCash = cashOf(legs);
        d.difference = r2(newCash.subtract(oldCash));
        d.summary = "Payment " + describeLegs(old) + " → " + describeLegs(legs);
        return d;
    }

    private Draft draftCustomer(SaleTransaction t, Long memberId) {
        assertCorrectableSale(t);
        for (PaymentSplitDTO l : PosReportService.legsOf(t)) {
            String b = PosReportService.bucket(l.getMethod());
            if (PosReportService.CREDIT.equals(b) || PosReportService.WALLET.equals(b)) {
                throw new BusinessRuleViolationException("The customer of a credit or wallet sale cannot be changed.");
            }
        }
        Member m = memberId == null ? null : memberRepo.findById(memberId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + memberId));
        if (Objects.equals(t.getMemberId(), memberId)) throw new BusinessRuleViolationException("That is already the sale's customer.");
        Draft d = new Draft();
        d.label = t.getTransactionNumber();
        d.original.put("member_id", t.getMemberId());
        d.original.put("member_name", t.getMemberName());
        d.original.put("member_code", t.getMemberCode());
        d.original.put("member_phone", t.getMemberPhone());
        d.corrected.put("member_id", m == null ? null : m.getId());
        d.corrected.put("member_name", m == null ? "Walk-in Customer" : m.getName());
        d.corrected.put("member_code", m == null ? null : m.getMemberId());
        d.corrected.put("member_phone", m == null ? null : m.getPhone());
        d.summary = "Customer " + Optional.ofNullable(t.getMemberName()).orElse("Walk-in Customer") + " → "
                + (m == null ? "Walk-in Customer" : m.getName());
        return d;
    }

    private Draft draftCategory(CashMovement mv, Long categoryId) {
        if (categoryId == null) throw new BusinessRuleViolationException("Pick the corrected category.");
        PosCashMovementCategory c = categoryService.resolve(mv.getType(), categoryId, null);
        if (Objects.equals(mv.getCategoryId(), c.getId())) throw new BusinessRuleViolationException("The movement is already in that category.");
        Draft d = new Draft();
        d.label = ("DROP_IN".equals(mv.getType()) ? "Cash in" : "Cash out") + " #" + mv.getId()
                + sessionSuffix(mv.getPosSessionId());
        d.original.put("category_id", mv.getCategoryId());
        d.original.put("category", mv.getCategory());
        d.original.put("account_code", mv.getPostedAccountCode());
        d.original.put("account_name", mv.getPostedAccountName());
        d.corrected.put("category_id", c.getId());
        d.corrected.put("category", c.getName());
        d.corrected.put("account_code", c.getAccountCode());
        d.corrected.put("account_name", c.getAccountName());
        d.difference = BigDecimal.ZERO;
        d.summary = "Category " + Optional.ofNullable(mv.getCategory()).orElse("(none)") + " → " + c.getName()
                + " (" + r2(mv.getAmount()) + ")";
        return d;
    }

    private Draft draftDenomination(PosSession s, BigDecimal closingCash, String denominations) {
        if (!"CLOSED".equals(s.getStatus())) {
            throw new BusinessRuleViolationException("Only a closed session's count can be corrected — "
                    + s.getSessionNumber() + " is still " + s.getStatus().toLowerCase(Locale.ROOT) + ".");
        }
        if (closingCash == null) throw new BusinessRuleViolationException("Enter the corrected counted cash.");
        BigDecimal counted = r2(closingCash);
        if (counted.signum() < 0) throw new BusinessRuleViolationException("Counted cash cannot be negative.");
        BigDecimal before = r2(s.getClosingCash());
        if (counted.compareTo(before) == 0 && Objects.equals(trimToNull(denominations), trimToNull(s.getClosingDenominations()))) {
            throw new BusinessRuleViolationException("The corrected count is the same as the original.");
        }
        BigDecimal expected = r2(s.getExpectedCash());
        Draft d = new Draft();
        d.label = s.getSessionNumber();
        d.original.put("closing_cash", before);
        d.original.put("closing_denominations", s.getClosingDenominations());
        d.original.put("cash_variance", r2(s.getCashVariance()));
        d.corrected.put("closing_cash", counted);
        d.corrected.put("closing_denominations", trimToNull(denominations));
        d.corrected.put("cash_variance", r2(counted.subtract(expected)));
        d.difference = r2(counted.subtract(before));
        d.summary = "Counted cash " + before + " → " + counted + " (variance " + r2(s.getCashVariance()) + " → "
                + r2(counted.subtract(expected)) + ")";
        return d;
    }

    // ── Apply ───────────────────────────────────────────────────────────────

    /**
     * Applies an approved correction. Every check runs again first, against the record as it is
     * now, before anything changes — so a failure leaves the record untouched and the request FAILED.
     */
    private PosCorrection execute(PosCorrection c) {
        String journal;
        try {
            Map<String, Object> corrected = read(c.getCorrectedJson());
            journal = switch (c.getTargetType() + ":" + c.getCorrectionType()) {
                case "SALE:PAYMENT_MODE" -> applyPaymentMode(c, corrected);
                case "SALE:CUSTOMER" -> applyCustomer(c, corrected);
                case "CASH_MOVEMENT:CATEGORY" -> applyCategory(c, corrected);
                case "SESSION:DENOMINATION" -> applyDenomination(c, corrected);
                default -> throw new BusinessRuleViolationException("Unsupported correction.");
            };
        } catch (BusinessRuleViolationException | EntityNotFoundException e) {
            c.setStatus(FAILED);
            c.setExecutionError(e.getMessage());
            c = repository.save(c);
            audit("CORRECTION_FAILED", c, e.getMessage(), null);
            return c;
        }
        c.setStatus(APPLIED);
        c.setAppliedBy(support.currentUsername());
        c.setAppliedAt(LocalDateTime.now());
        c.setJournalReference(journal);
        c.setExecutionError(null);
        c = repository.save(c);
        audit("CORRECTION_APPLY", c, c.getSummary() + (journal != null ? " | journal " + journal : ""), c.getApprovedBy());
        return c;
    }

    @SuppressWarnings("unchecked")
    private String applyPaymentMode(PosCorrection c, Map<String, Object> corrected) {
        SaleTransaction t = sale(c.getTargetId());
        Map<String, Object> original = read(c.getOriginalJson());
        List<PaymentSplitDTO> current = PosReportService.legsOf(t);
        if (!sameLegs(current, fromJson((List<Map<String, Object>>) original.get("legs")))) {
            throw new BusinessRuleViolationException(t.getTransactionNumber() + "'s payment changed after the request was raised.");
        }
        assertCorrectableSale(t);
        List<PaymentSplitDTO> legs = fromJson((List<Map<String, Object>>) corrected.get("legs"));
        if (legs.stream().map(PaymentSplitDTO::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add)
                .compareTo(r2(t.getTotalAmount())) != 0) {
            throw new BusinessRuleViolationException("The corrected payments no longer add up to the sale total.");
        }
        // Ledger: take the money off the accounts it was posted to, put it on the corrected ones.
        Map<String, BigDecimal> net = new LinkedHashMap<>();
        Map<String, String> names = new HashMap<>();
        for (PaymentSplitDTO l : current) addNet(net, names, FinancialEventService.legAccount(legForLedger(l)), l.getAmount().negate());
        for (PaymentSplitDTO l : legs) addNet(net, names, FinancialEventService.legAccount(legForLedger(l)), l.getAmount());

        t.setPaymentBreakdown(legs);
        t.setPaymentMethod(methodOf(legs));
        t.setPaymentSummary(PosCheckoutService.summarize(legs));
        t.setPaymentAllocations(null);
        t.setReceivedAmount(r2(t.getTotalAmount()));
        t.setChangeAmount(BigDecimal.ZERO);
        saleRepo.save(t);
        invoiceService.sync(t);
        refreshSession(t.getPosSessionId());

        return financialEventService.postPosEntry("PosCorrection", c.getId(),
                "POS correction " + c.getRequestNumber() + " — payment of " + t.getTransactionNumber(),
                t.getBusinessDate(), lines(net, names, "Payment correction " + t.getTransactionNumber()));
    }

    private String applyCustomer(PosCorrection c, Map<String, Object> corrected) {
        SaleTransaction t = sale(c.getTargetId());
        Map<String, Object> original = read(c.getOriginalJson());
        if (!Objects.equals(asLong(original.get("member_id")), t.getMemberId())) {
            throw new BusinessRuleViolationException(t.getTransactionNumber() + "'s customer changed after the request was raised.");
        }
        assertCorrectableSale(t);
        Long memberId = asLong(corrected.get("member_id"));
        if (memberId != null) memberRepo.findById(memberId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + memberId));
        t.setMemberId(memberId);
        t.setMemberName((String) corrected.get("member_name"));
        t.setMemberCode((String) corrected.get("member_code"));
        t.setMemberPhone((String) corrected.get("member_phone"));
        saleRepo.save(t);
        invoiceService.sync(t);
        return null;
    }

    private String applyCategory(PosCorrection c, Map<String, Object> corrected) {
        CashMovement mv = movement(c.getTargetId());
        Map<String, Object> original = read(c.getOriginalJson());
        if (!Objects.equals(asLong(original.get("category_id")), mv.getCategoryId())) {
            throw new BusinessRuleViolationException("The movement's category changed after the request was raised.");
        }
        PosCashMovementCategory cat = categoryService.resolve(mv.getType(), asLong(corrected.get("category_id")), null);
        String oldAccount = mv.getPostedAccountCode(), oldName = mv.getPostedAccountName();
        String newAccount = cat.getAccountCode(), newName = cat.getAccountName();

        mv.setCategoryId(cat.getId());
        mv.setCategory(cat.getName());
        mv.setPostedAccountCode(newAccount);
        mv.setPostedAccountName(newName);
        movementRepo.save(mv);
        if (Objects.equals(oldAccount, newAccount)) return null;

        // DROP_IN was DR Cash / CR account; CASH_OUT was DR account / CR Cash. An unmapped
        // category posts nothing, so its side is Cash in Hand (the drawer) itself.
        boolean in = "DROP_IN".equals(mv.getType());
        String cash = FinancialEventService.ACC_CASH_IN_HAND;
        String[] from = oldAccount != null ? new String[]{oldAccount, oldName} : new String[]{cash, "Cash in Hand"};
        String[] to = newAccount != null ? new String[]{newAccount, newName} : new String[]{cash, "Cash in Hand"};
        BigDecimal amt = r2(mv.getAmount());
        Map<String, BigDecimal> net = new LinkedHashMap<>();
        Map<String, String> names = new HashMap<>();
        // net > 0 = debit. Cash in: undo CR from (debit it), CR to. Cash out: undo DR from, DR to.
        addNet(net, names, from, in ? amt : amt.negate());
        addNet(net, names, to, in ? amt.negate() : amt);
        return financialEventService.postPosEntry("PosCorrection", c.getId(),
                "POS correction " + c.getRequestNumber() + " — " + c.getTargetLabel() + " re-categorised",
                support.today(), lines(net, names, "Cash category correction"));
    }

    private String applyDenomination(PosCorrection c, Map<String, Object> corrected) {
        PosSession s = session(c.getTargetId());
        Map<String, Object> original = read(c.getOriginalJson());
        if (!"CLOSED".equals(s.getStatus())) throw new BusinessRuleViolationException(s.getSessionNumber() + " is no longer closed.");
        if (asMoney(original.get("closing_cash")).compareTo(r2(s.getClosingCash())) != 0) {
            throw new BusinessRuleViolationException(s.getSessionNumber() + "'s count changed after the request was raised.");
        }
        s.setClosingCash(asMoney(corrected.get("closing_cash")));
        s.setClosingDenominations((String) corrected.get("closing_denominations"));
        sessionRepo.save(s);
        refreshSession(s.getId());
        return null;
    }

    /** A closed session's expected cash and variance follow its (corrected) sales and count; so does its day close. */
    private void refreshSession(Long sessionId) {
        if (sessionId == null) return;
        PosSession s = sessionRepo.findById(sessionId).orElse(null);
        if (s == null || !"CLOSED".equals(s.getStatus())) return;
        BigDecimal expected = reportService.expectedCash(s.getId());
        s.setExpectedCash(expected);
        s.setCashVariance(r2(nz(s.getClosingCash()).subtract(expected)));
        sessionRepo.save(s);
        if (s.getBusinessDate() == null) return;
        PosDayClose dc = dayCloseRepo.findFirstByBusinessDate(s.getBusinessDate()).orElse(null);
        if (dc == null) return;
        List<PosSession> day = sessionRepo.findByBusinessDateOrderByOpenedAtAsc(s.getBusinessDate());
        BigDecimal exp = BigDecimal.ZERO, counted = BigDecimal.ZERO;
        for (PosSession x : day) {
            exp = exp.add(nz(x.getExpectedCash()));
            counted = counted.add(nz(x.getClosingCash()));
        }
        dc.setExpectedCash(r2(exp));
        dc.setCountedCash(r2(counted));
        dc.setCashVariance(r2(counted.subtract(exp)));
        dayCloseRepo.save(dc);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private void assertCorrectableSale(SaleTransaction t) {
        if (!"COMPLETED".equals(t.getStatus())) {
            throw new BusinessRuleViolationException(t.getTransactionNumber() + " is " + t.getStatus().toLowerCase(Locale.ROOT) + ".");
        }
        if (nz(t.getRefundedAmount()).signum() > 0) {
            throw new BusinessRuleViolationException(t.getTransactionNumber() + " has returns against it — correct it before refunding, or refund and re-ring it.");
        }
    }

    /** A Cash leg posts to Cash in Hand; card and online to their bank account (as at checkout). */
    private static PaymentSplitDTO legForLedger(PaymentSplitDTO l) {
        String b = PosReportService.bucket(l.getMethod());
        PaymentSplitDTO x = new PaymentSplitDTO(PosReportService.CASH.equals(b) ? "CASH" : PosReportService.CARD.equals(b) ? "CARD" : "ONLINE",
                l.getAmount(), null);
        x.setBankAccountCode(l.getBankAccountCode());
        x.setBankAccountName(l.getBankAccountName());
        return x;
    }

    private static void addNet(Map<String, BigDecimal> net, Map<String, String> names, String[] account, BigDecimal amount) {
        net.merge(account[0], amount, BigDecimal::add);
        names.putIfAbsent(account[0], account[1]);
    }

    private static List<FinancialEventService.PosLine> lines(Map<String, BigDecimal> net, Map<String, String> names, String what) {
        List<FinancialEventService.PosLine> out = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> e : net.entrySet()) {
            BigDecimal v = r2(e.getValue());
            if (v.signum() == 0) continue;
            out.add(new FinancialEventService.PosLine(e.getKey(), names.get(e.getKey()),
                    v.signum() > 0 ? v : BigDecimal.ZERO, v.signum() < 0 ? v.negate() : BigDecimal.ZERO, what));
        }
        return out;
    }

    private static boolean sameLegs(List<PaymentSplitDTO> a, List<PaymentSplitDTO> b) {
        return key(a).equals(key(b));
    }

    private static List<String> key(List<PaymentSplitDTO> legs) {
        List<String> k = new ArrayList<>();
        for (PaymentSplitDTO l : legs) {
            k.add(PosReportService.bucket(l.getMethod()) + "|" + r2(l.getAmount()) + "|"
                    + Objects.toString(trimToNull(l.getBankAccountCode()), "") + "|" + Objects.toString(trimToNull(l.getCardType()), ""));
        }
        Collections.sort(k);
        return k;
    }

    private static BigDecimal cashOf(List<PaymentSplitDTO> legs) {
        return legs.stream().filter(l -> PosReportService.CASH.equals(PosReportService.bucket(l.getMethod())))
                .map(l -> nz(l.getAmount())).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static String methodOf(List<PaymentSplitDTO> legs) {
        Set<String> kinds = new LinkedHashSet<>();
        for (PaymentSplitDTO l : legs) kinds.add(PosReportService.bucket(l.getMethod()));
        return kinds.size() == 1 ? kinds.iterator().next().toUpperCase(Locale.ROOT) : "MIXED";
    }

    private static String describeLegs(List<PaymentSplitDTO> legs) {
        List<String> parts = new ArrayList<>();
        for (PaymentSplitDTO l : legs) {
            String b = PosReportService.bucket(l.getMethod());
            parts.add(b.charAt(0) + b.substring(1).toLowerCase(Locale.ROOT) + " " + r2(l.getAmount()));
        }
        return String.join(" + ", parts);
    }

    private static List<Map<String, Object>> legsJson(List<PaymentSplitDTO> legs) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (PaymentSplitDTO l : legs) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("method", l.getMethod());
            m.put("amount", r2(l.getAmount()));
            m.put("reference", l.getReference());
            m.put("card_type", l.getCardType());
            m.put("bank_account_code", l.getBankAccountCode());
            m.put("bank_account_name", l.getBankAccountName());
            m.put("online_payment_type", l.getOnlinePaymentType());
            out.add(m);
        }
        return out;
    }

    private static List<PaymentSplitDTO> fromJson(List<Map<String, Object>> rows) {
        List<PaymentSplitDTO> out = new ArrayList<>();
        if (rows == null) return out;
        for (Map<String, Object> m : rows) {
            PaymentSplitDTO l = new PaymentSplitDTO((String) m.get("method"), asMoney(m.get("amount")), (String) m.get("reference"));
            l.setCardType((String) m.get("card_type"));
            l.setBankAccountCode((String) m.get("bank_account_code"));
            l.setBankAccountName((String) m.get("bank_account_name"));
            l.setOnlinePaymentType((String) m.get("online_payment_type"));
            out.add(l);
        }
        return out;
    }

    private String sessionSuffix(Long sessionId) {
        if (sessionId == null) return "";
        return sessionRepo.findById(sessionId).map(s -> " · " + s.getSessionNumber()).orElse("");
    }

    private void mineOrSupervisor(PosCorrection c, String what) {
        if (!support.currentUsername().equals(c.getRequestedBy()) && !support.isSupervisor()) {
            throw new BusinessRuleViolationException("Only " + c.getRequestedBy() + " or a supervisor can " + what + " this request.");
        }
    }

    /** Maker-checker: a supervisor, and not the one who raised it. */
    private void checker(PosCorrection c) {
        if (!support.isSupervisor()) throw new SupervisorApprovalRequiredException("Only a supervisor can decide on a correction.");
        if (support.currentUsername().equals(c.getRequestedBy())) {
            throw new BusinessRuleViolationException("You raised this request — another supervisor has to approve or reject it.");
        }
    }

    private boolean canDecide(PosCorrection c) {
        return PENDING.equals(c.getStatus()) && support.isSupervisor() && !support.currentUsername().equals(c.getRequestedBy());
    }

    private void audit(String action, PosCorrection c, String details, String approvedBy) {
        auditService.log(action, "PosCorrection", c.getId(), c.getRequestNumber(), null, c.getDifferenceAmount(),
                c.getTargetLabel() + " · " + details, approvedBy, null);
    }

    private PosCorrection find(Long id) {
        return repository.findById(id).orElseThrow(() -> new EntityNotFoundException("Correction not found with id: " + id));
    }

    private SaleTransaction sale(Long id) {
        return saleRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Sale not found with id: " + id));
    }

    private CashMovement movement(Long id) {
        return movementRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Cash movement not found with id: " + id));
    }

    private PosSession session(Long id) {
        return sessionRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("POS session not found with id: " + id));
    }

    private CorrectionDTO toDto(PosCorrection c) {
        return new CorrectionDTO(c.getId(), c.getRequestNumber(), c.getTargetType(), c.getTargetId(), c.getTargetLabel(),
                c.getCorrectionType(), c.getOriginalJson(), c.getCorrectedJson(), c.getDifferenceAmount(), c.getSummary(),
                c.getReason(), c.getStatus(), c.getRequestedBy(), c.getRequestedAt(), c.getSubmittedAt(), c.getApprovedBy(),
                c.getApprovedAt(), c.getApprovalNotes(), c.getRejectedBy(), c.getRejectedAt(), c.getRejectionReason(),
                c.getAppliedBy(), c.getAppliedAt(), c.getJournalReference(), c.getExecutionError(), c.getCancelledBy(),
                c.getCancelledAt(), canDecide(c));
    }

    private static String upper(String s) {
        return s == null ? "" : s.trim().toUpperCase(Locale.ROOT);
    }

    private static String json(Object o) {
        try {
            return MAPPER.writeValueAsString(o);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> read(String s) {
        try {
            return MAPPER.readValue(s, Map.class);
        } catch (Exception e) {
            throw new BusinessRuleViolationException("The correction's saved values are unreadable.");
        }
    }

    private static Long asLong(Object o) {
        return o == null ? null : o instanceof Number n ? n.longValue() : Long.valueOf(o.toString());
    }

    private static BigDecimal asMoney(Object o) {
        return o == null ? BigDecimal.ZERO : r2(new BigDecimal(o.toString()));
    }
}
