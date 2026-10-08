package com.company.project.services.pos;

import com.company.project.dto.PaymentSplitDTO;
import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.TransactionDTO;
import com.company.project.entities.*;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.*;
import com.company.project.services.FinancialEventService;
import com.company.project.services.ReceiptVoucherService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

import static com.company.project.services.pos.PosSupport.*;

/**
 * POS checkout (ported from BillBull's PosCheckoutController/SalesInvoice flow).
 *
 * Everything money-related is recomputed server-side from the product catalogue:
 * list price (or a supervisor-approved override), line discount, bill discount
 * spread pro-rata over the lines, then VAT per line at the product's own rate —
 * added on top (exclusive) or extracted from the price (inclusive, per POS
 * settings). Tenders come in as an ordered allocation list (Cash / Card / Online /
 * Credit); cash is the only tender that may exceed the balance (the excess is
 * change). Each tender becomes a ledger leg: Online legs post to their receiving
 * bank account, Credit legs to Accounts Receivable against the member.
 */
@Service
@Transactional
public class PosCheckoutService {

    static final String LEG_CASH = "Cash";
    static final String LEG_CARD = "Card";
    static final String LEG_ONLINE = "Online Payment";
    static final String LEG_CREDIT = "Credit";
    static final String LEG_WALLET = "Wallet";
    static final String RECEIVABLE_CODE = FinancialEventService.ACC_RECEIVABLE;
    static final String RECEIVABLE_NAME = "Accounts Receivable";

    private static final String STOCK_CHECK_SETTING_KEY = "stock_check_enabled";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final SaleTransactionRepository saleRepo;
    private final SaleTransactionItemRepository itemRepo;
    private final ProductRepository productRepo;
    private final ProductStockRepository stockRepo;
    private final ProductCategoryRepository categoryRepo;
    private final PosSessionRepository sessionRepo;
    private final PosHeldSaleRepository heldRepo;
    private final MemberRepository memberRepo;
    private final AccountHeadRepository accountHeadRepo;
    private final FinancialSettingRepository financialSettingRepo;
    private final FinancialEventService financialEventService;
    private final ReceiptVoucherService receiptVoucherService;
    private final PosSettingsService settingsService;
    private final PosAuditService auditService;
    private final PosSupport support;
    private final PosMapper mapper;
    private final PosInvoiceService invoiceService;
    private final PosPromotionService promotionService;
    /** Optional (absent in unit tests): business-day window gate. */
    private PosSessionControlService controlService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setControlService(@org.springframework.context.annotation.Lazy PosSessionControlService controlService) {
        this.controlService = controlService;
    }

    /** Optional (absent in unit tests): branch tax policy — Settings › Tax Configuration. */
    private com.company.project.services.TaxPolicyService taxPolicy;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setTaxPolicy(@org.springframework.context.annotation.Lazy com.company.project.services.TaxPolicyService taxPolicy) {
        this.taxPolicy = taxPolicy;
    }

    /** Optional (absent in unit tests): refuses selling on a blocked / retired terminal. */
    private PosTerminalService terminalService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setTerminalService(@org.springframework.context.annotation.Lazy PosTerminalService terminalService) {
        this.terminalService = terminalService;
    }

    public PosCheckoutService(SaleTransactionRepository saleRepo, SaleTransactionItemRepository itemRepo,
                              ProductRepository productRepo, ProductStockRepository stockRepo,
                              ProductCategoryRepository categoryRepo, PosSessionRepository sessionRepo,
                              PosHeldSaleRepository heldRepo, MemberRepository memberRepo,
                              AccountHeadRepository accountHeadRepo, FinancialSettingRepository financialSettingRepo,
                              FinancialEventService financialEventService, ReceiptVoucherService receiptVoucherService,
                              PosSettingsService settingsService, PosAuditService auditService,
                              PosSupport support, PosMapper mapper, PosInvoiceService invoiceService,
                              PosPromotionService promotionService) {
        this.saleRepo = saleRepo;
        this.itemRepo = itemRepo;
        this.productRepo = productRepo;
        this.stockRepo = stockRepo;
        this.categoryRepo = categoryRepo;
        this.sessionRepo = sessionRepo;
        this.heldRepo = heldRepo;
        this.memberRepo = memberRepo;
        this.accountHeadRepo = accountHeadRepo;
        this.financialSettingRepo = financialSettingRepo;
        this.financialEventService = financialEventService;
        this.receiptVoucherService = receiptVoucherService;
        this.settingsService = settingsService;
        this.auditService = auditService;
        this.support = support;
        this.mapper = mapper;
        this.invoiceService = invoiceService;
        this.promotionService = promotionService;
    }

    /** Sales Settings › "Stock Check". Defaults to ON until explicitly turned off. */
    boolean isStockCheckEnabled() {
        return financialSettingRepo.findBySettingKey(STOCK_CHECK_SETTING_KEY)
                .map(FinancialSetting::getSettingValue)
                .map(value -> !"false".equalsIgnoreCase(value))
                .orElse(true);
    }

    // ── Checkout ────────────────────────────────────────────────────────────

    public TransactionDTO checkout(PosRequests.Checkout req) {
        support.requireBranch();
        PosSettings settings = settingsService.current();
        boolean taxInclusive = Boolean.TRUE.equals(settings.getTaxInclusive());

        if (controlService != null) controlService.assertDayOpen();
        PosSession session = resolveSellingSession(req.posSessionId());

        if (req.items() == null || req.items().isEmpty()) {
            throw new BusinessRuleViolationException("Add at least one item to the sale.");
        }

        // ── Customer ────────────────────────────────────────────────────────
        List<PosRequests.PaymentAllocation> allocations = req.paymentAllocations() == null
                ? List.of() : req.paymentAllocations().stream().filter(Objects::nonNull).toList();
        Member member = req.memberId() != null
                ? memberRepo.findById(req.memberId())
                    .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + req.memberId()))
                : null;
        Member creditMember = resolveCreditMember(allocations);
        if (creditMember != null) {
            if (member == null) member = creditMember;
            else if (!member.getId().equals(creditMember.getId())) {
                throw new BusinessRuleViolationException(
                        "The credit customer must be the sale's customer (" + member.getName() + ").");
            }
        }
        if (member == null && Boolean.TRUE.equals(settings.getRequireCustomer())) {
            throw new BusinessRuleViolationException("Select a member for this sale (POS settings require a customer).");
        }

        // ── Lines ───────────────────────────────────────────────────────────
        BigDecimal maxDiscountPct = settings.getMaxCashierDiscountPercent() != null
                ? settings.getMaxCashierDiscountPercent() : BigDecimal.TEN;
        boolean needsPriceApproval = false;
        boolean needsDiscountApproval = false;
        List<String> approvalNotes = new ArrayList<>();
        Map<Long, String> categoryNames = new HashMap<>();
        List<Line> lines = new ArrayList<>();

        for (PosRequests.CheckoutItem in : req.items()) {
            if (in == null || in.productId() == null) throw new BusinessRuleViolationException("Every line needs a product.");
            int qty = in.quantity() == null ? 0 : in.quantity();
            if (qty <= 0) throw new BusinessRuleViolationException("Quantity must be at least 1.");
            Product product = productRepo.findById(in.productId())
                    .orElseThrow(() -> new EntityNotFoundException("Product not found with id: " + in.productId()));
            if (Boolean.FALSE.equals(product.getIsActive())) {
                throw new BusinessRuleViolationException(product.getName() + " is inactive and cannot be sold.");
            }

            BigDecimal listPrice = r2(product.getSellingPrice());
            BigDecimal unitPrice = listPrice;
            boolean overridden = false;
            if (Boolean.TRUE.equals(in.priceOverridden()) && in.unitPrice() != null
                    && r2(in.unitPrice()).compareTo(listPrice) != 0) {
                if (!Boolean.TRUE.equals(settings.getAllowPriceOverride())) {
                    throw new BusinessRuleViolationException("Price overrides are disabled in POS settings.");
                }
                if (in.unitPrice().signum() < 0) throw new BusinessRuleViolationException("Price cannot be negative.");
                unitPrice = r2(in.unitPrice());
                overridden = true;
                if (Boolean.TRUE.equals(settings.getRequireSupervisorForPriceOverride())) needsPriceApproval = true;
                approvalNotes.add(product.getName() + " price " + listPrice + " → " + unitPrice);
            }

            BigDecimal gross = r2(unitPrice.multiply(BigDecimal.valueOf(qty)));
            BigDecimal discPct = BigDecimal.ZERO;
            BigDecimal discAmt;
            if (positive(in.discountAmount())) {
                discAmt = r2(in.discountAmount());
                if (discAmt.compareTo(gross) > 0) {
                    throw new BusinessRuleViolationException("Discount on " + product.getName() + " exceeds the line amount.");
                }
                discPct = gross.signum() == 0 ? BigDecimal.ZERO
                        : discAmt.multiply(HUNDRED).divide(gross, 2, RoundingMode.HALF_UP);
            } else {
                discPct = nz(in.discountPercent());
                if (discPct.signum() < 0 || discPct.compareTo(HUNDRED) > 0) {
                    throw new BusinessRuleViolationException("Discount must be between 0 and 100%.");
                }
                discAmt = r2(gross.multiply(discPct).divide(HUNDRED, 2, RoundingMode.HALF_UP));
            }
            if (discPct.signum() > 0 && Boolean.FALSE.equals(product.getAllowDiscount())) {
                throw new BusinessRuleViolationException("Discounts are not allowed on " + product.getName() + ".");
            }
            // A product's maximum discount is its own limit; products without one use the cashier limit.
            BigDecimal productMax = nz(product.getMaxDiscountPercent());
            BigDecimal limit = productMax.signum() > 0 ? productMax : maxDiscountPct;
            if (discPct.compareTo(limit) > 0) {
                needsDiscountApproval = true;
                approvalNotes.add(product.getName() + " discount " + discPct.stripTrailingZeros().toPlainString() + "%"
                        + (productMax.signum() > 0 ? " (product max " + productMax.stripTrailingZeros().toPlainString() + "%)" : ""));
            }

            String categoryName = product.getCategoryId() == null ? null
                    : categoryNames.computeIfAbsent(product.getCategoryId(),
                        id -> categoryRepo.findById(id).map(ProductCategory::getName).orElse(null));

            Line line = new Line();
            line.product = product;
            line.request = in;
            line.qty = qty;
            line.listPrice = listPrice;
            line.unitPrice = unitPrice;
            line.overridden = overridden;
            line.gross = gross;
            line.discountPercent = r2(discPct);
            line.discountAmount = discAmt;
            line.net = gross.subtract(discAmt);
            line.taxRate = taxPolicy != null ? taxPolicy.salesRate(product) : nz(product.getTaxRate());
            line.categoryName = categoryName;
            lines.add(line);
        }

        // ── Bill discount, spread pro-rata over line nets ──────────────────
        BigDecimal billBase = lines.stream().map(l -> l.net).reduce(BigDecimal.ZERO, BigDecimal::add);
        String billType = trimToNull(req.billDiscountType());
        BigDecimal billValue = nz(req.billDiscountValue());
        BigDecimal billDiscount = BigDecimal.ZERO;
        if (billType != null && billValue.signum() > 0) {
            billType = billType.toUpperCase(Locale.ROOT);
            if ("PERCENT".equals(billType)) {
                if (billValue.compareTo(HUNDRED) > 0) throw new BusinessRuleViolationException("Bill discount cannot exceed 100%.");
                billDiscount = r2(billBase.multiply(billValue).divide(HUNDRED, 2, RoundingMode.HALF_UP));
            } else if ("AMOUNT".equals(billType)) {
                if (billValue.compareTo(billBase) > 0) throw new BusinessRuleViolationException("Bill discount exceeds the sale amount.");
                billDiscount = r2(billValue);
            } else {
                throw new BusinessRuleViolationException("Bill discount type must be PERCENT or AMOUNT.");
            }
            BigDecimal billPct = billBase.signum() == 0 ? BigDecimal.ZERO
                    : billDiscount.multiply(HUNDRED).divide(billBase, 2, RoundingMode.HALF_UP);
            if (billPct.compareTo(maxDiscountPct) > 0) {
                needsDiscountApproval = true;
                approvalNotes.add("Bill discount " + billPct.stripTrailingZeros().toPlainString() + "%");
            }
        } else {
            billType = null;
            billValue = null;
        }
        // ── Promotion / coupon code: on the basket left after the bill discount ─
        BigDecimal promoBase = billBase.subtract(billDiscount);
        PosPromotionService.Applied promo = promotionService.preview(trimToNull(req.discountCode()), req.promotionId(), promoBase);
        BigDecimal promoDiscount = promo != null ? promo.discount() : BigDecimal.ZERO;
        spreadBillDiscount(lines, billDiscount.add(promoDiscount), billBase);

        // ── VAT per line ────────────────────────────────────────────────────
        for (Line l : lines) {
            BigDecimal afterBill = l.net.subtract(l.billShare);
            if (taxInclusive) {
                BigDecimal divisor = BigDecimal.ONE.add(l.taxRate.divide(HUNDRED, 6, RoundingMode.HALF_UP));
                l.taxable = afterBill.divide(divisor, 2, RoundingMode.HALF_UP);
                l.tax = afterBill.subtract(l.taxable);
            } else {
                l.taxable = afterBill;
                l.tax = r2(afterBill.multiply(l.taxRate).divide(HUNDRED, 2, RoundingMode.HALF_UP));
            }
        }

        BigDecimal subtotal = sum(lines, l -> l.gross);
        BigDecimal lineDiscount = sum(lines, l -> l.discountAmount);
        BigDecimal taxable = sum(lines, l -> l.taxable);
        BigDecimal tax = sum(lines, l -> l.tax);
        BigDecimal total = taxable.add(tax);

        // ── Approvals ───────────────────────────────────────────────────────
        String approvedBy = null;
        if (needsPriceApproval || needsDiscountApproval) {
            String what = needsPriceApproval && needsDiscountApproval ? "this price override and discount"
                    : needsPriceApproval ? "this price override"
                    : "a discount above the allowed limit (" + String.join("; ", approvalNotes) + ")";
            approvedBy = support.approve(settings, true, req.supervisorPin(), what);
        }

        // ── Tenders ─────────────────────────────────────────────────────────
        Tender tender = allocations.isEmpty()
                ? legacyTender(req, total)
                : allocate(allocations, total, settings, member);

        // ── Stock ───────────────────────────────────────────────────────────
        boolean stockCheck = isStockCheckEnabled();
        if (stockCheck) {
            Map<Long, Integer> needed = new LinkedHashMap<>();
            for (Line l : lines) needed.merge(l.product.getId(), l.qty, Integer::sum);
            for (Line l : lines) {
                Long warehouseId = l.request.warehouseId();
                int qtyNeeded = needed.getOrDefault(l.product.getId(), 0);
                if (qtyNeeded == 0) continue;
                int available;
                if (warehouseId != null) {
                    available = stockRepo.findByProductIdAndWarehouseId(l.product.getId(), warehouseId)
                            .map(s -> s.getCurrentStock() == null ? 0 : s.getCurrentStock()).orElse(0);
                } else {
                    available = stockRepo.findByProductId(l.product.getId()).stream()
                            .mapToInt(s -> s.getCurrentStock() == null ? 0 : s.getCurrentStock()).sum();
                }
                if (available < qtyNeeded) {
                    throw new BusinessRuleViolationException("Insufficient stock for " + l.product.getName()
                            + ". Available: " + available + ", requested: " + qtyNeeded + ".");
                }
                needed.put(l.product.getId(), 0);
            }
        }

        // ── Persist ─────────────────────────────────────────────────────────
        SaleTransaction t = new SaleTransaction();
        t.setPosSessionId(session != null ? session.getId() : req.posSessionId());
        t.setMemberId(member != null ? member.getId() : null);
        t.setMemberName(member != null ? member.getName()
                : Optional.ofNullable(trimToNull(req.memberName())).orElse("Walk-in Customer"));
        t.setMemberCode(member != null ? member.getMemberId() : null);
        t.setMemberPhone(member != null ? member.getPhone() : null);
        t.setPaymentMethod(tender.paymentMethod);
        t.setPaymentBreakdown(tender.legs.isEmpty() ? null : tender.legs);
        t.setPaymentAllocations(tender.allocationsJson);
        t.setPaymentSummary(tender.summary);
        t.setSubtotal(subtotal);
        t.setLineDiscountAmount(lineDiscount);
        t.setBillDiscountType(billType);
        t.setBillDiscountValue(billValue);
        t.setBillDiscountAmount(billDiscount);
        t.setDiscountAmount(lineDiscount.add(billDiscount).add(promoDiscount));
        if (promo != null) {
            t.setDiscountCode(promo.code());
            t.setCodeDiscountAmount(promoDiscount);
            t.setPromotionId(promo.promotionId());
            t.setPromotionName(promo.name());
        }
        t.setTaxableAmount(taxable);
        t.setTaxAmount(tax);
        t.setTaxInclusive(taxInclusive);
        t.setTotalAmount(total);
        t.setTotalCogs(sum(lines, l -> r2(nz(l.product.getCostPrice()).multiply(BigDecimal.valueOf(l.qty)))));
        t.setReceivedAmount(tender.received);
        t.setChangeAmount(tender.change);
        t.setCreditAmount(tender.credit);
        t.setCreditSettledAmount(BigDecimal.ZERO);
        t.setRefundedAmount(BigDecimal.ZERO);
        t.setReturnStatus("NONE");
        t.setStatus("COMPLETED");
        t.setNotes(trimToNull(req.notes()));
        t.setCashierName(support.currentDisplayName());
        t.setTerminalName(session != null && session.getTerminalName() != null
                ? session.getTerminalName() : trimToNull(req.terminalName()));
        t.setBusinessDate(session != null && session.getBusinessDate() != null ? session.getBusinessDate() : support.today());
        t.setReprintCount(0);
        t.setApprovedBy(approvedBy);
        t = saleRepo.save(t);
        t.setTransactionNumber("TXN-" + String.format("%010d", t.getId()));
        t = saleRepo.save(t);

        List<SaleTransactionItem> savedItems = new ArrayList<>();
        for (Line l : lines) {
            SaleTransactionItem item = new SaleTransactionItem();
            item.setTransactionId(t.getId());
            item.setProductId(l.product.getId());
            item.setProductName(l.product.getName());
            item.setProductSku(l.product.getSku());
            item.setBarcode(l.product.getBarcode());
            item.setCategoryName(l.categoryName);
            item.setQuantity(l.qty);
            item.setReturnedQuantity(0);
            item.setListPrice(l.listPrice);
            item.setUnitPrice(l.unitPrice);
            item.setPriceOverridden(l.overridden);
            item.setDiscountPercent(l.discountPercent);
            item.setDiscountAmount(l.discountAmount);
            item.setBillDiscountShare(l.billShare);
            item.setTaxRate(l.taxRate);
            item.setTaxableAmount(l.taxable);
            item.setTaxAmount(l.tax);
            item.setTotalAmount(l.taxable);
            item.setCostPrice(r2(l.product.getCostPrice()));
            item.setWarehouseId(l.request.warehouseId());
            if (stockCheck) {
                Long used = deductStock(l.product, l.request.warehouseId(), l.qty);
                if (item.getWarehouseId() == null) item.setWarehouseId(used);
            }
            savedItems.add(itemRepo.save(item));
        }

        // ── Ledger + receipt voucher + back-office invoice ─────────────────
        financialEventService.onSaleCompleted(t);
        invoiceService.sync(t);
        BigDecimal paid = total.subtract(tender.credit);
        if (paid.signum() > 0) {
            List<PaymentSplitDTO> paidLegs = tender.legs.stream()
                    .filter(leg -> !LEG_CREDIT.equals(leg.getMethod())).toList();
            receiptVoucherService.createVoucherFromModule(
                    "POS Sale – " + t.getTransactionNumber(), "POS", t.getMemberName(), t.getMemberId(),
                    paid, tender.voucherMode, t.getTransactionNumber(), t.getTransactionNumber(), t.getNotes(),
                    paidLegs.size() > 1 ? paidLegs : null, t.getBranchId());
        }

        promotionService.redeem(promo, member != null ? member.getId() : null, t.getMemberName());
        if (tender.wallet.signum() > 0) promotionService.debitWallet(member, tender.wallet, t.getId(), t.getTransactionNumber());

        if (req.heldSaleId() != null) {
            heldRepo.findById(req.heldSaleId()).ifPresent(heldRepo::delete);
        }

        auditService.log("SALE", "SaleTransaction", t.getId(), t.getTransactionNumber(), t.getPosSessionId(),
                total, tender.summary + (approvalNotes.isEmpty() ? "" : " | approved: " + String.join("; ", approvalNotes)),
                approvedBy, t.getTerminalName());
        if (approvedBy != null) {
            auditService.log(needsPriceApproval ? "PRICE_OVERRIDE" : "DISCOUNT_OVERRIDE", "SaleTransaction", t.getId(),
                    t.getTransactionNumber(), t.getPosSessionId(), total, String.join("; ", approvalNotes),
                    approvedBy, t.getTerminalName());
        }

        return mapper.transaction(t, savedItems, List.of());
    }

    // ── Session gate ────────────────────────────────────────────────────────

    /** The session a sale is rung up in: must be open, the caller's own (or a supervisor), and on today's business day. */
    private PosSession resolveSellingSession(Long sessionId) {
        if (sessionId == null) return null;
        PosSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("POS session not found with id: " + sessionId));
        if ("SUSPENDED".equals(session.getStatus())) {
            throw new BusinessRuleViolationException("Session " + session.getSessionNumber() + " is suspended. Resume it to continue selling.");
        }
        if (!"OPEN".equals(session.getStatus())) {
            throw new BusinessRuleViolationException("Session " + session.getSessionNumber() + " is closed. Open a new session to continue selling.");
        }
        if (session.getClosingStartedAt() != null) {
            throw new BusinessRuleViolationException("Session " + session.getSessionNumber()
                    + " is being closed — finish the close (X-Report) or ask a supervisor to cancel it.");
        }
        if (session.getOpenedBy() != null && !session.getOpenedBy().equals(support.currentUsername()) && !support.isSupervisor()) {
            throw new BusinessRuleViolationException("Session " + session.getSessionNumber() + " belongs to " + session.getOpenedBy() + ".");
        }
        if (session.getBusinessDate() != null && session.getBusinessDate().isBefore(support.today())) {
            throw new BusinessRuleViolationException("Session " + session.getSessionNumber() + " is still open from "
                    + session.getBusinessDate() + ". Close it (X-Report) before selling on a new business day.");
        }
        if (terminalService != null) terminalService.assertCanSell(session);
        session.setLastActivityAt(java.time.LocalDateTime.now());
        return session;
    }

    // ── Tenders ─────────────────────────────────────────────────────────────

    private Member resolveCreditMember(List<PosRequests.PaymentAllocation> allocations) {
        for (PosRequests.PaymentAllocation a : allocations) {
            if (!"CREDIT".equalsIgnoreCase(a.type())) continue;
            String code = trimToNull(a.customerCode());
            if (code == null) throw new BusinessRuleViolationException("Select the customer for the credit payment.");
            Optional<Member> found = Optional.empty();
            if (code.matches("\\d+")) found = memberRepo.findById(Long.parseLong(code));
            if (found.isEmpty()) found = memberRepo.findByMemberId(code);
            return found.orElseThrow(() -> new EntityNotFoundException("Credit customer not found: " + code));
        }
        return null;
    }

    private Tender allocate(List<PosRequests.PaymentAllocation> allocations, BigDecimal total,
                            PosSettings settings, Member member) {
        BigDecimal cash = BigDecimal.ZERO, card = BigDecimal.ZERO, online = BigDecimal.ZERO, credit = BigDecimal.ZERO,
                wallet = BigDecimal.ZERO;
        List<PaymentSplitDTO> nonCash = new ArrayList<>();
        Set<String> types = new LinkedHashSet<>();
        List<Map<String, Object>> wire = new ArrayList<>();

        for (PosRequests.PaymentAllocation a : allocations) {
            String type = a.type() == null ? "" : a.type().trim().toUpperCase(Locale.ROOT);
            BigDecimal amount = r2(a.amount());
            if (amount.signum() <= 0) throw new BusinessRuleViolationException("Every payment line needs an amount above zero.");
            Map<String, Object> w = new LinkedHashMap<>();
            w.put("type", type);
            w.put("subtype", a.subtype());
            w.put("amount", amount);
            w.put("reference", a.reference());
            switch (type) {
                case "CASH" -> cash = cash.add(amount);
                case "CARD" -> {
                    card = card.add(amount);
                    PaymentSplitDTO leg = new PaymentSplitDTO(LEG_CARD, amount, trimToNull(a.reference()));
                    leg.setCardType(trimToNull(a.subtype()));
                    nonCash.add(leg);
                }
                case "ONLINE" -> {
                    if (a.bankAccountId() == null) throw new BusinessRuleViolationException("Select the bank account that received the online payment.");
                    AccountHead bank = accountHeadRepo.findById(a.bankAccountId())
                            .orElseThrow(() -> new EntityNotFoundException("Bank account not found: " + a.bankAccountId()));
                    online = online.add(amount);
                    PaymentSplitDTO leg = new PaymentSplitDTO(LEG_ONLINE, amount, trimToNull(a.reference()));
                    leg.setBankAccountCode(bank.getCode());
                    leg.setBankAccountName(bank.getName());
                    leg.setOnlinePaymentType(trimToNull(a.subtype()));
                    nonCash.add(leg);
                    w.put("bank_account_name", bank.getCode() + " - " + bank.getName());
                }
                case "CREDIT" -> {
                    if (!Boolean.TRUE.equals(settings.getAllowCreditSales())) {
                        throw new BusinessRuleViolationException("Credit sales are disabled in POS settings.");
                    }
                    if (member == null) throw new BusinessRuleViolationException("Credit sales need a member.");
                    credit = credit.add(amount);
                    PaymentSplitDTO leg = new PaymentSplitDTO(LEG_CREDIT, amount, member.getMemberId());
                    leg.setBankAccountCode(RECEIVABLE_CODE);
                    leg.setBankAccountName(RECEIVABLE_NAME);
                    nonCash.add(leg);
                    w.put("customer_name", member.getName());
                }
                case "WALLET" -> {
                    if (member == null) throw new BusinessRuleViolationException("Wallet payments need a member.");
                    BigDecimal balance = nz(member.getWalletBalance());
                    if (wallet.add(amount).compareTo(balance) > 0) {
                        throw new BusinessRuleViolationException(member.getName() + "'s wallet balance is only " + r2(balance) + ".");
                    }
                    wallet = wallet.add(amount);
                    nonCash.add(new PaymentSplitDTO(LEG_WALLET, amount, member.getMemberId()));
                    w.put("customer_name", member.getName());
                }
                default -> throw new BusinessRuleViolationException("Unknown payment type: " + a.type());
            }
            types.add(type);
            wire.add(w);
        }

        // Every amount here is already 2-dp, so these comparisons are exact: the legs below
        // (cash booked at exactly the balance left after non-cash tenders) always sum to the total.
        BigDecimal nonCashTotal = card.add(online).add(credit).add(wallet);
        if (nonCashTotal.compareTo(total) > 0) {
            throw new BusinessRuleViolationException("Card, online, wallet and credit payments exceed the amount due — only cash can be over-tendered.");
        }
        BigDecimal cashApplied = total.subtract(nonCashTotal);
        if (cash.compareTo(cashApplied) < 0) {
            throw new BusinessRuleViolationException("Payment is short by " + cashApplied.subtract(cash) + ".");
        }
        BigDecimal change = cash.subtract(cashApplied);
        if (cash.signum() > 0 && cashApplied.signum() == 0) {
            throw new BusinessRuleViolationException("Cash was tendered but nothing is left to pay in cash.");
        }

        List<PaymentSplitDTO> legs = new ArrayList<>();
        if (cashApplied.signum() > 0) legs.add(new PaymentSplitDTO(LEG_CASH, cashApplied, null));
        legs.addAll(nonCash);

        Tender t = new Tender();
        t.legs = legs;
        t.credit = credit;
        t.wallet = wallet;
        t.received = r2(cash.add(card).add(online));
        t.change = change;
        t.paymentMethod = types.size() == 1 ? types.iterator().next() : (types.isEmpty() ? "CASH" : "MIXED");
        t.summary = summarize(legs);
        t.voucherMode = voucherMode(legs);
        try {
            t.allocationsJson = MAPPER.writeValueAsString(wire);
        } catch (Exception e) {
            t.allocationsJson = null;
        }
        return t;
    }

    /** Pre-allocation clients: one headline method plus (for Mixed) a breakdown that must sum to the total. */
    private Tender legacyTender(PosRequests.Checkout req, BigDecimal total) {
        Tender t = new Tender();
        String method = Optional.ofNullable(trimToNull(req.paymentMethod())).orElse("CASH").toUpperCase(Locale.ROOT);
        List<PaymentSplitDTO> breakdown = req.paymentBreakdown() == null ? List.of() : req.paymentBreakdown();
        if ("MIXED".equals(method) && !breakdown.isEmpty()) {
            BigDecimal sum = breakdown.stream().map(PaymentSplitDTO::getAmount).filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (sum.subtract(total).abs().compareTo(TOLERANCE) > 0) {
                throw new BusinessRuleViolationException("Mixed payment legs (" + sum + ") do not add up to the total (" + total + ").");
            }
            t.legs = new ArrayList<>(breakdown);
        } else {
            t.legs = new ArrayList<>();
        }
        t.paymentMethod = method;
        t.credit = BigDecimal.ZERO;
        t.received = req.receivedAmount() != null ? r2(req.receivedAmount()) : total;
        t.change = req.receivedAmount() != null ? r2(req.receivedAmount().subtract(total).max(BigDecimal.ZERO)) : BigDecimal.ZERO;
        t.summary = t.legs.isEmpty() ? label(method) : summarize(t.legs);
        t.voucherMode = t.legs.isEmpty() ? label(method) : voucherMode(t.legs);
        return t;
    }

    static String summarize(List<PaymentSplitDTO> legs) {
        if (legs.isEmpty()) return "No payment";
        List<String> parts = new ArrayList<>();
        for (PaymentSplitDTO l : legs) {
            String name = LEG_CARD.equals(l.getMethod()) && l.getCardType() != null ? l.getCardType()
                    : LEG_ONLINE.equals(l.getMethod()) ? "Online" : l.getMethod();
            if (!parts.contains(name)) parts.add(name);
        }
        return String.join(" + ", parts);
    }

    private static String voucherMode(List<PaymentSplitDTO> legs) {
        List<PaymentSplitDTO> paid = legs.stream().filter(l -> !LEG_CREDIT.equals(l.getMethod())).toList();
        if (paid.size() == 1) return paid.get(0).getMethod();
        return paid.isEmpty() ? "Credit" : "Mixed";
    }

    private static String label(String method) {
        return switch (method) {
            case "CASH" -> "Cash";
            case "CARD" -> "Card";
            case "ONLINE" -> "Online Payment";
            case "MIXED" -> "Mixed";
            default -> method.charAt(0) + method.substring(1).toLowerCase(Locale.ROOT);
        };
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /** Pro-rata by line net, last line takes the rounding remainder, so shares always sum to the bill discount. */
    private static void spreadBillDiscount(List<Line> lines, BigDecimal billDiscount, BigDecimal billBase) {
        BigDecimal allocated = BigDecimal.ZERO;
        int lastWithNet = -1;
        for (int i = 0; i < lines.size(); i++) if (lines.get(i).net.signum() > 0) lastWithNet = i;
        for (int i = 0; i < lines.size(); i++) {
            Line l = lines.get(i);
            if (billDiscount.signum() == 0 || billBase.signum() == 0 || l.net.signum() == 0) {
                l.billShare = BigDecimal.ZERO;
            } else if (i == lastWithNet) {
                l.billShare = billDiscount.subtract(allocated).min(l.net);
            } else {
                l.billShare = billDiscount.multiply(l.net).divide(billBase, 2, RoundingMode.HALF_UP).min(l.net);
                allocated = allocated.add(l.billShare);
            }
        }
    }

    Long deductStock(Product product, Long warehouseId, int quantity) {
        if (warehouseId != null) {
            ProductStock stock = stockRepo.findByProductIdAndWarehouseId(product.getId(), warehouseId)
                    .orElseThrow(() -> new EntityNotFoundException("No stock record for " + product.getName() + " in that warehouse."));
            int available = stock.getCurrentStock() == null ? 0 : stock.getCurrentStock();
            if (available < quantity) throw new BusinessRuleViolationException("Insufficient stock for " + product.getName() + ".");
            stock.setCurrentStock(available - quantity);
            stockRepo.save(stock);
            return warehouseId;
        }
        List<ProductStock> stocks = new ArrayList<>(stockRepo.findByProductId(product.getId()));
        stocks.sort(Comparator.comparingInt(s -> -(s.getCurrentStock() == null ? 0 : s.getCurrentStock())));
        int remaining = quantity;
        Long first = null;
        for (ProductStock stock : stocks) {
            if (remaining <= 0) break;
            if (first == null) first = stock.getWarehouseId();
            int available = stock.getCurrentStock() == null ? 0 : stock.getCurrentStock();
            int take = Math.min(available, remaining);
            if (take <= 0) continue;
            stock.setCurrentStock(available - take);
            stockRepo.save(stock);
            remaining -= take;
        }
        if (remaining > 0) throw new BusinessRuleViolationException("Insufficient stock for " + product.getName() + ".");
        return first;
    }

    void restoreStock(Long productId, Long warehouseId, int quantity) {
        if (quantity <= 0) return;
        if (warehouseId != null) {
            Optional<ProductStock> stock = stockRepo.findByProductIdAndWarehouseId(productId, warehouseId);
            if (stock.isPresent()) {
                ProductStock s = stock.get();
                s.setCurrentStock((s.getCurrentStock() == null ? 0 : s.getCurrentStock()) + quantity);
                stockRepo.save(s);
                return;
            }
        }
        List<ProductStock> stocks = stockRepo.findByProductId(productId);
        if (!stocks.isEmpty()) {
            ProductStock s = stocks.get(0);
            s.setCurrentStock((s.getCurrentStock() == null ? 0 : s.getCurrentStock()) + quantity);
            stockRepo.save(s);
        }
    }

    private static BigDecimal sum(List<Line> lines, java.util.function.Function<Line, BigDecimal> f) {
        return lines.stream().map(f).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static final class Line {
        Product product;
        PosRequests.CheckoutItem request;
        int qty;
        BigDecimal listPrice;
        BigDecimal unitPrice;
        boolean overridden;
        BigDecimal gross;
        BigDecimal discountPercent;
        BigDecimal discountAmount;
        BigDecimal net;
        BigDecimal billShare = BigDecimal.ZERO;
        BigDecimal taxRate;
        BigDecimal taxable;
        BigDecimal tax;
        String categoryName;
    }

    private static final class Tender {
        List<PaymentSplitDTO> legs = new ArrayList<>();
        BigDecimal credit = BigDecimal.ZERO;
        BigDecimal wallet = BigDecimal.ZERO;
        BigDecimal received = BigDecimal.ZERO;
        BigDecimal change = BigDecimal.ZERO;
        String paymentMethod = "CASH";
        String summary = "Cash";
        String voucherMode = "Cash";
        String allocationsJson;
    }
}
