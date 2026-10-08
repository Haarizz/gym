package com.company.project.services.pos;

import com.company.project.dto.PaymentSplitDTO;
import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.ReturnDTO;
import com.company.project.dto.pos.PosResponses.TransactionDTO;
import com.company.project.entities.*;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.*;
import com.company.project.services.FinancialEventService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

import static com.company.project.services.pos.PosCheckoutService.*;
import static com.company.project.services.pos.PosSupport.*;

/**
 * Returns against POS sales (BillBull's POS › Return, simplified to the sale's own
 * lines). Any quantity still unreturned on a line can come back; amounts are the
 * line's own discounted, taxed figures pro-rated by quantity — the return that
 * finishes a line takes exactly what is left, so a fully returned sale always
 * reverses to the cent. Refund tender: ORIGINAL mirrors the sale's own tenders,
 * or a single CASH / CARD / ONLINE leg, or CREDIT (knocks it off the member's
 * outstanding on-account balance for this sale).
 */
@Service
@Transactional
public class PosReturnService {

    private final SaleTransactionRepository saleRepo;
    private final SaleTransactionItemRepository itemRepo;
    private final PosSaleReturnRepository returnRepo;
    private final PosSaleReturnItemRepository returnItemRepo;
    private final PosSessionRepository sessionRepo;
    private final AccountHeadRepository accountHeadRepo;
    private final PosCheckoutService checkoutService;
    private final FinancialEventService financialEventService;
    private final PosSettingsService settingsService;
    private final PosTillService tillService;
    private final PosAuditService auditService;
    private final PosSupport support;
    private final PosMapper mapper;
    private final PosInvoiceService invoiceService;
    private final PosPromotionService promotionService;

    public PosReturnService(SaleTransactionRepository saleRepo, SaleTransactionItemRepository itemRepo,
                            PosSaleReturnRepository returnRepo, PosSaleReturnItemRepository returnItemRepo,
                            PosSessionRepository sessionRepo, AccountHeadRepository accountHeadRepo,
                            PosCheckoutService checkoutService, FinancialEventService financialEventService,
                            PosSettingsService settingsService, PosTillService tillService,
                            PosAuditService auditService, PosSupport support, PosMapper mapper,
                            PosInvoiceService invoiceService, PosPromotionService promotionService) {
        this.invoiceService = invoiceService;
        this.promotionService = promotionService;
        this.saleRepo = saleRepo;
        this.itemRepo = itemRepo;
        this.returnRepo = returnRepo;
        this.returnItemRepo = returnItemRepo;
        this.sessionRepo = sessionRepo;
        this.accountHeadRepo = accountHeadRepo;
        this.checkoutService = checkoutService;
        this.financialEventService = financialEventService;
        this.settingsService = settingsService;
        this.tillService = tillService;
        this.auditService = auditService;
        this.support = support;
        this.mapper = mapper;
    }

    public ReturnDTO createReturn(Long transactionId, PosRequests.SaleReturn req) {
        support.requireBranch();
        PosSettings settings = settingsService.current();
        SaleTransaction sale = saleRepo.findById(transactionId)
                .orElseThrow(() -> new EntityNotFoundException("Sale not found with id: " + transactionId));
        if (!"COMPLETED".equals(sale.getStatus())) {
            throw new BusinessRuleViolationException("Sale " + sale.getTransactionNumber() + " is " + sale.getStatus().toLowerCase(Locale.ROOT)
                    + " and cannot be returned.");
        }
        if (req.items() == null || req.items().isEmpty()) throw new BusinessRuleViolationException("Select at least one item to return.");
        String approvedBy = support.approve(settings, Boolean.TRUE.equals(settings.getRequireSupervisorForReturn()),
                req.supervisorPin(), "a sales return");

        List<SaleTransactionItem> saleItems = itemRepo.findByTransactionId(sale.getId());
        Map<Long, SaleTransactionItem> byId = new HashMap<>();
        for (SaleTransactionItem i : saleItems) byId.put(i.getId(), i);

        Map<Long, Integer> requested = new LinkedHashMap<>();
        for (PosRequests.ReturnItem ri : req.items()) {
            if (ri == null || ri.transactionItemId() == null || ri.quantity() == null || ri.quantity() <= 0) continue;
            if (!byId.containsKey(ri.transactionItemId())) {
                throw new BusinessRuleViolationException("Item " + ri.transactionItemId() + " is not part of sale " + sale.getTransactionNumber() + ".");
            }
            requested.merge(ri.transactionItemId(), ri.quantity(), Integer::sum);
        }
        if (requested.isEmpty()) throw new BusinessRuleViolationException("Select at least one item to return.");

        // ── Amounts per returned line ───────────────────────────────────────
        List<PosSaleReturnItem> lines = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO, discount = BigDecimal.ZERO, tax = BigDecimal.ZERO,
                total = BigDecimal.ZERO, cogs = BigDecimal.ZERO;
        for (Map.Entry<Long, Integer> e : requested.entrySet()) {
            SaleTransactionItem item = byId.get(e.getKey());
            int qty = item.getQuantity() == null ? 0 : item.getQuantity();
            int already = item.getReturnedQuantity() == null ? 0 : item.getReturnedQuantity();
            int q = e.getValue();
            if (q > qty - already) {
                throw new BusinessRuleViolationException("Only " + (qty - already) + " of " + item.getProductName() + " can still be returned.");
            }
            BigDecimal lineTaxable = item.getTaxableAmount() != null ? item.getTaxableAmount() : nz(item.getTotalAmount());
            BigDecimal lineTax = nz(item.getTaxAmount());
            BigDecimal lineDisc = nz(item.getDiscountAmount()).add(nz(item.getBillDiscountShare()));
            BigDecimal rTaxable = portion(lineTaxable, qty, already, q);
            BigDecimal rTax = portion(lineTax, qty, already, q);
            BigDecimal rDisc = portion(lineDisc, qty, already, q);
            BigDecimal rGross = r2(nz(item.getUnitPrice()).multiply(BigDecimal.valueOf(q)));

            PosSaleReturnItem line = new PosSaleReturnItem();
            line.setTransactionItemId(item.getId());
            line.setProductId(item.getProductId());
            line.setProductName(item.getProductName());
            line.setProductSku(item.getProductSku());
            line.setWarehouseId(item.getWarehouseId());
            line.setQuantity(q);
            line.setUnitPrice(item.getUnitPrice());
            line.setDiscountAmount(rDisc);
            line.setTaxAmount(rTax);
            line.setTotalAmount(rTaxable.add(rTax));
            lines.add(line);

            subtotal = subtotal.add(rGross);
            discount = discount.add(rDisc);
            tax = tax.add(rTax);
            total = total.add(rTaxable).add(rTax);
            cogs = cogs.add(r2(unitCost(item, sale, saleItems).multiply(BigDecimal.valueOf(q))));
        }

        // ── Refund tender ───────────────────────────────────────────────────
        BigDecimal outstandingCredit = nz(sale.getCreditAmount()).subtract(nz(sale.getCreditSettledAmount())).max(BigDecimal.ZERO);
        String method = Optional.ofNullable(trimToNull(req.refundMethod())).orElse("ORIGINAL").toUpperCase(Locale.ROOT);
        List<PaymentSplitDTO> legs = refundLegs(sale, method, total, outstandingCredit, req.bankAccountId());
        BigDecimal creditLeg = legs.stream().filter(l -> LEG_CREDIT.equals(l.getMethod()))
                .map(PaymentSplitDTO::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        boolean cashOut = legs.stream().anyMatch(l -> LEG_CASH.equals(l.getMethod()));

        // Cash leaves a drawer, so it has to come out of an open session.
        PosSession session = null;
        if (req.posSessionId() != null) {
            session = sessionRepo.findById(req.posSessionId())
                    .orElseThrow(() -> new EntityNotFoundException("POS session not found with id: " + req.posSessionId()));
            if (!"OPEN".equals(session.getStatus())) throw new BusinessRuleViolationException("The refund session is not open.");
            if (session.getClosingStartedAt() != null) {
                throw new BusinessRuleViolationException("Session " + session.getSessionNumber() + " is being closed — no refunds from its drawer.");
            }
        } else {
            session = tillService.myOpenSession().orElse(null);
        }
        if (cashOut && session == null) {
            throw new BusinessRuleViolationException("Open a POS session to refund cash from the drawer.");
        }

        // ── Persist ─────────────────────────────────────────────────────────
        PosSaleReturn ret = new PosSaleReturn();
        ret.setTransactionId(sale.getId());
        ret.setTransactionNumber(sale.getTransactionNumber());
        ret.setPosSessionId(session != null ? session.getId() : null);
        ret.setMemberId(sale.getMemberId());
        ret.setMemberName(sale.getMemberName());
        ret.setSubtotal(r2(subtotal));
        ret.setDiscountAmount(r2(discount));
        ret.setTaxAmount(r2(tax));
        ret.setTotalAmount(r2(total));
        ret.setTotalCogs(r2(cogs));
        ret.setRefundMethod(method);
        ret.setRefundBreakdown(legs);
        ret.setReason(trimToNull(req.reason()));
        ret.setNotes(trimToNull(req.notes()));
        ret.setRestock(!Boolean.FALSE.equals(req.restock()));
        ret.setApprovedBy(approvedBy);
        ret.setCashierName(support.currentDisplayName());
        ret.setBusinessDate(session != null && session.getBusinessDate() != null ? session.getBusinessDate() : support.today());
        ret = returnRepo.save(ret);
        ret.setReturnNumber("RTN-" + String.format("%08d", ret.getId()));
        ret = returnRepo.save(ret);

        boolean restockGoods = Boolean.TRUE.equals(ret.getRestock()) && checkoutService.isStockCheckEnabled();
        for (PosSaleReturnItem line : lines) {
            line.setReturnId(ret.getId());
            returnItemRepo.save(line);
            SaleTransactionItem item = byId.get(line.getTransactionItemId());
            item.setReturnedQuantity((item.getReturnedQuantity() == null ? 0 : item.getReturnedQuantity()) + line.getQuantity());
            itemRepo.save(item);
            if (restockGoods) checkoutService.restoreStock(item.getProductId(), item.getWarehouseId(), line.getQuantity());
        }

        sale.setRefundedAmount(r2(nz(sale.getRefundedAmount()).add(ret.getTotalAmount())));
        if (creditLeg.signum() > 0) sale.setCreditSettledAmount(r2(nz(sale.getCreditSettledAmount()).add(creditLeg)));
        boolean fully = saleItems.stream().allMatch(i ->
                (i.getReturnedQuantity() == null ? 0 : i.getReturnedQuantity()) >= (i.getQuantity() == null ? 0 : i.getQuantity()));
        sale.setReturnStatus(fully ? "FULL" : "PARTIAL");
        if (fully) sale.setStatus("REFUNDED");
        saleRepo.save(sale);
        invoiceService.sync(sale);

        financialEventService.onPosSaleReturned(ret);
        BigDecimal walletBack = legs.stream().filter(l -> PosCheckoutService.LEG_WALLET.equals(l.getMethod()))
                .map(PaymentSplitDTO::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        promotionService.creditWallet(sale.getMemberId(), walletBack, ret.getId(), ret.getReturnNumber());
        auditService.log("RETURN", "PosSaleReturn", ret.getId(), ret.getReturnNumber(), ret.getPosSessionId(),
                ret.getTotalAmount(), "Sale " + sale.getTransactionNumber() + " — " + PosCheckoutService.summarize(legs)
                        + (ret.getReason() != null ? " — " + ret.getReason() : ""), approvedBy,
                session != null ? session.getTerminalName() : null);

        return mapper.saleReturn(ret, returnItemRepo.findByReturnId(ret.getId()));
    }

    /** Legacy "refund" button: return everything still unreturned, refunded the way it was paid. */
    public TransactionDTO refundAll(Long transactionId, String supervisorPin) {
        List<PosRequests.ReturnItem> items = itemRepo.findByTransactionId(transactionId).stream()
                .filter(i -> (i.getQuantity() == null ? 0 : i.getQuantity()) > (i.getReturnedQuantity() == null ? 0 : i.getReturnedQuantity()))
                .map(i -> new PosRequests.ReturnItem(i.getId(), i.getQuantity() - (i.getReturnedQuantity() == null ? 0 : i.getReturnedQuantity())))
                .toList();
        if (items.isEmpty()) throw new BusinessRuleViolationException("Everything on this sale has already been returned.");
        createReturn(transactionId, new PosRequests.SaleReturn(items, "ORIGINAL", null, "Full refund", null, true, null, supervisorPin));
        SaleTransaction sale = saleRepo.findById(transactionId).orElseThrow();
        return mapper.transaction(sale, itemRepo.findByTransactionId(transactionId),
                returnRepo.findByTransactionIdOrderByCreatedAtDesc(transactionId));
    }

    @Transactional(readOnly = true)
    public List<ReturnDTO> returnsForSale(Long transactionId) {
        return returnRepo.findByTransactionIdOrderByCreatedAtDesc(transactionId).stream()
                .map(r -> mapper.saleReturn(r, returnItemRepo.findByReturnId(r.getId()))).toList();
    }

    @Transactional(readOnly = true)
    public ReturnDTO get(Long id) {
        PosSaleReturn r = returnRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Return not found with id: " + id));
        return mapper.saleReturn(r, returnItemRepo.findByReturnId(id));
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * q units of a line amount, given `already` units were returned before. The return that
     * takes the last unit gets exactly what is left, so all returns of a line sum to the line.
     */
    static BigDecimal portion(BigDecimal lineAmount, int qty, int already, int q) {
        if (qty <= 0) return BigDecimal.ZERO;
        BigDecimal returnedBefore = lineAmount.multiply(BigDecimal.valueOf(already)).divide(BigDecimal.valueOf(qty), 2, RoundingMode.HALF_UP);
        if (already + q >= qty) return lineAmount.subtract(returnedBefore);
        BigDecimal returnedAfter = lineAmount.multiply(BigDecimal.valueOf(already + q)).divide(BigDecimal.valueOf(qty), 2, RoundingMode.HALF_UP);
        return returnedAfter.subtract(returnedBefore);
    }

    /**
     * Unit cost booked for a line. Lines sold before unit cost was stored on the line share
     * the sale's recorded COGS pro-rata by gross value — the same cost the sale posted.
     */
    private static BigDecimal unitCost(SaleTransactionItem item, SaleTransaction sale, List<SaleTransactionItem> saleItems) {
        if (item.getCostPrice() != null) return item.getCostPrice();
        int qty = item.getQuantity() == null ? 0 : item.getQuantity();
        BigDecimal saleCogs = nz(sale.getTotalCogs());
        if (qty <= 0 || saleCogs.signum() == 0) return BigDecimal.ZERO;
        BigDecimal grossAll = saleItems.stream()
                .map(i -> nz(i.getUnitPrice()).multiply(BigDecimal.valueOf(i.getQuantity() == null ? 0 : i.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (grossAll.signum() == 0) return BigDecimal.ZERO;
        BigDecimal lineGross = nz(item.getUnitPrice()).multiply(BigDecimal.valueOf(qty));
        return saleCogs.multiply(lineGross).divide(grossAll.multiply(BigDecimal.valueOf(qty)), 2, RoundingMode.HALF_UP);
    }

    private List<PaymentSplitDTO> refundLegs(SaleTransaction sale, String method, BigDecimal total,
                                             BigDecimal outstandingCredit, Long bankAccountId) {
        switch (method) {
            case "CASH" -> { return List.of(new PaymentSplitDTO(LEG_CASH, total, null)); }
            case "CARD" -> { return List.of(new PaymentSplitDTO(LEG_CARD, total, null)); }
            case "ONLINE" -> {
                if (bankAccountId == null) throw new BusinessRuleViolationException("Select the bank account the refund is paid from.");
                AccountHead bank = accountHeadRepo.findById(bankAccountId)
                        .orElseThrow(() -> new EntityNotFoundException("Bank account not found: " + bankAccountId));
                PaymentSplitDTO leg = new PaymentSplitDTO(LEG_ONLINE, total, null);
                leg.setBankAccountCode(bank.getCode());
                leg.setBankAccountName(bank.getName());
                return List.of(leg);
            }
            case "CREDIT" -> {
                if (outstandingCredit.compareTo(total) < 0) {
                    throw new BusinessRuleViolationException("Only " + r2(outstandingCredit)
                            + " of this sale is still on account — refund the rest another way.");
                }
                return List.of(creditLeg(total));
            }
            case "WALLET" -> {
                if (sale.getMemberId() == null) throw new BusinessRuleViolationException("Only a member's sale can be refunded to a wallet.");
                return List.of(new PaymentSplitDTO(PosCheckoutService.LEG_WALLET, total, sale.getMemberCode()));
            }
            case "ORIGINAL" -> { return mirrorTenders(sale, total, outstandingCredit); }
            default -> throw new BusinessRuleViolationException("Refund method must be ORIGINAL, CASH, CARD, ONLINE, WALLET or CREDIT.");
        }
    }

    /** Split the refund over the sale's own tenders pro-rata; credit is capped at what is still owed (the excess is refunded in cash). */
    private List<PaymentSplitDTO> mirrorTenders(SaleTransaction sale, BigDecimal total, BigDecimal outstandingCredit) {
        List<PaymentSplitDTO> original = PosReportService.legsOf(sale).stream()
                .filter(l -> l.getAmount() != null && l.getAmount().signum() > 0).toList();
        BigDecimal base = original.stream().map(PaymentSplitDTO::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (original.isEmpty() || base.signum() == 0) return List.of(new PaymentSplitDTO(LEG_CASH, total, null));

        List<PaymentSplitDTO> legs = new ArrayList<>();
        BigDecimal allocated = BigDecimal.ZERO;
        BigDecimal creditRoom = outstandingCredit;
        BigDecimal cashTopUp = BigDecimal.ZERO;
        for (int i = 0; i < original.size(); i++) {
            PaymentSplitDTO src = original.get(i);
            BigDecimal amount = i == original.size() - 1 ? total.subtract(allocated)
                    : total.multiply(src.getAmount()).divide(base, 2, RoundingMode.HALF_UP);
            allocated = allocated.add(amount);
            if (amount.signum() <= 0) continue;
            String bucket = PosReportService.bucket(src.getMethod());
            if (PosReportService.CREDIT.equals(bucket)) {
                BigDecimal onAccount = amount.min(creditRoom);
                creditRoom = creditRoom.subtract(onAccount);
                if (onAccount.signum() > 0) legs.add(creditLeg(onAccount));
                cashTopUp = cashTopUp.add(amount.subtract(onAccount));
                continue;
            }
            PaymentSplitDTO leg = new PaymentSplitDTO(
                    switch (bucket) {
                        case PosReportService.CARD -> LEG_CARD;
                        case PosReportService.ONLINE -> LEG_ONLINE;
                        case PosReportService.CASH -> LEG_CASH;
                        default -> src.getMethod();
                    }, amount, null);
            leg.setCardType(src.getCardType());
            leg.setBankAccountCode(src.getBankAccountCode());
            leg.setBankAccountName(src.getBankAccountName());
            legs.add(leg);
        }
        if (cashTopUp.signum() > 0) {
            Optional<PaymentSplitDTO> cash = legs.stream().filter(l -> LEG_CASH.equals(l.getMethod())).findFirst();
            if (cash.isPresent()) cash.get().setAmount(cash.get().getAmount().add(cashTopUp));
            else legs.add(new PaymentSplitDTO(LEG_CASH, cashTopUp, null));
        }
        // The refund journal must balance to the cent; if pro-rata rounding ever fails to
        // reproduce the total exactly, refund it as a single cash leg instead.
        BigDecimal legSum = legs.stream().map(PaymentSplitDTO::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (legSum.compareTo(total) != 0 || legs.stream().anyMatch(l -> l.getAmount().signum() <= 0)) {
            return List.of(new PaymentSplitDTO(LEG_CASH, total, null));
        }
        return legs;
    }

    private static PaymentSplitDTO creditLeg(BigDecimal amount) {
        PaymentSplitDTO leg = new PaymentSplitDTO(LEG_CREDIT, amount, null);
        leg.setBankAccountCode(RECEIVABLE_CODE);
        leg.setBankAccountName(RECEIVABLE_NAME);
        return leg;
    }
}
