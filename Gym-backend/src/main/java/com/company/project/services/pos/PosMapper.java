package com.company.project.services.pos;

import com.company.project.dto.pos.PosResponses.*;
import com.company.project.entities.*;
import com.company.project.repositories.SaleTransactionRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static com.company.project.services.pos.PosSupport.nz;

/** Entity → response DTO conversion shared by every POS service. */
@Component
public class PosMapper {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final SaleTransactionRepository saleTransactionRepository;
    private final PosSupport support;

    public PosMapper(SaleTransactionRepository saleTransactionRepository, PosSupport support) {
        this.saleTransactionRepository = saleTransactionRepository;
        this.support = support;
    }

    // ── Sessions ────────────────────────────────────────────────────────────

    public SessionDTO session(PosSession s) {
        return sessions(List.of(s)).get(0);
    }

    /** Batch variant: one grouped query for every session's sale totals. */
    public List<SessionDTO> sessions(List<PosSession> list) {
        if (list.isEmpty()) return List.of();
        Map<Long, Object[]> totals = new HashMap<>();
        for (Object[] row : saleTransactionRepository.sessionTotals(list.stream().map(PosSession::getId).toList())) {
            totals.put((Long) row[0], row);
        }
        String me = support.currentUsername();
        LocalDate today = support.today();
        List<SessionDTO> out = new ArrayList<>(list.size());
        for (PosSession s : list) {
            Object[] t = totals.get(s.getId());
            int count = t == null ? 0 : ((Number) t[1]).intValue();
            BigDecimal net = t == null ? BigDecimal.ZERO : PosSupport.r2(new BigDecimal(t[2].toString()));
            boolean open = "OPEN".equals(s.getStatus());
            LocalDate bd = s.getBusinessDate() != null ? s.getBusinessDate()
                    : (s.getOpenedAt() != null ? s.getOpenedAt().toLocalDate() : null);
            out.add(new SessionDTO(
                    s.getId(), s.getSessionNumber(), s.getStatus(), s.getOpeningCash(), s.getClosingCash(),
                    s.getOpeningDenominations(), s.getClosingDenominations(), s.getOpenedAt(), s.getClosedAt(),
                    s.getOpenedBy(), s.getClosedBy(), s.getStaffName(), s.getTerminalName(), bd,
                    s.getExpectedCash(), s.getCashVariance(), s.getCardSettlementAmount(), s.getCardBatchNo(),
                    s.getCardSettlementVerified(), s.getVarianceRemarks(), s.getNotes(),
                    Boolean.TRUE.equals(s.getForceClosed()), s.getForceCloseReason(),
                    s.getXReportPrintCount() == null ? 0 : s.getXReportPrintCount(), s.getDayCloseId(),
                    net, count,
                    me.equals(s.getOpenedBy()),
                    (open || "SUSPENDED".equals(s.getStatus())) && bd != null && bd.isBefore(today),
                    s.getClosingStartedAt(), s.getClosingStartedBy(), s.getLastActivityAt(),
                    s.getSuspendedAt(), s.getSuspendedBy(), s.getTakenOverFrom(), s.getVarianceApprovedBy(),
                    s.getTerminalId(), s.getCounterName()));
        }
        return out;
    }

    // ── Sales ───────────────────────────────────────────────────────────────

    public TransactionItemDTO item(SaleTransactionItem i) {
        BigDecimal taxable = i.getTaxableAmount() != null ? i.getTaxableAmount() : nz(i.getTotalAmount());
        return new TransactionItemDTO(
                i.getId(), i.getTransactionId(), i.getProductId(), i.getProductName(), i.getProductSku(),
                i.getBarcode(), i.getCategoryName(), i.getWarehouseId(), i.getQuantity(),
                i.getReturnedQuantity() == null ? 0 : i.getReturnedQuantity(),
                i.getListPrice() != null ? i.getListPrice() : i.getUnitPrice(), i.getUnitPrice(),
                Boolean.TRUE.equals(i.getPriceOverridden()), nz(i.getDiscountPercent()), nz(i.getDiscountAmount()),
                nz(i.getBillDiscountShare()), i.getTaxRate(), taxable, nz(i.getTaxAmount()), nz(i.getTotalAmount()),
                PosSupport.r2(taxable.add(nz(i.getTaxAmount()))));
    }

    public TransactionDTO transaction(SaleTransaction t, List<SaleTransactionItem> items, List<PosSaleReturn> returns) {
        BigDecimal credit = nz(t.getCreditAmount());
        BigDecimal settled = nz(t.getCreditSettledAmount());
        List<ReturnSummaryDTO> rs = returns == null ? List.of() : returns.stream()
                .map(r -> new ReturnSummaryDTO(r.getId(), r.getReturnNumber(), r.getTotalAmount(), r.getRefundMethod(),
                        r.getReason(), r.getCashierName(), r.getCreatedAt()))
                .toList();
        BigDecimal lineDisc = t.getLineDiscountAmount() != null ? t.getLineDiscountAmount() : nz(t.getDiscountAmount());
        BigDecimal billDisc = nz(t.getBillDiscountAmount());
        BigDecimal taxable = t.getTaxableAmount() != null ? t.getTaxableAmount()
                : nz(t.getSubtotal()).subtract(nz(t.getDiscountAmount()));
        return new TransactionDTO(
                t.getId(), t.getTransactionNumber(), t.getPosSessionId(), t.getMemberId(), t.getMemberName(),
                t.getMemberCode(), t.getMemberPhone(), t.getPaymentMethod(),
                t.getPaymentSummary() != null ? t.getPaymentSummary() : t.getPaymentMethod(),
                t.getPaymentBreakdown(), t.getPaymentAllocations(),
                nz(t.getSubtotal()), lineDisc, t.getBillDiscountType(), t.getBillDiscountValue(), billDisc,
                t.getDiscountCode(), nz(t.getCodeDiscountAmount()), t.getPromotionId(), t.getPromotionName(),
                nz(t.getDiscountAmount()), taxable, nz(t.getTaxAmount()), Boolean.TRUE.equals(t.getTaxInclusive()),
                nz(t.getTotalAmount()), t.getReceivedAmount(), t.getChangeAmount(),
                credit, settled, PosSupport.r2(credit.subtract(settled).max(BigDecimal.ZERO)),
                nz(t.getRefundedAmount()), t.getReturnStatus() == null ? "NONE" : t.getReturnStatus(),
                t.getStatus(), t.getNotes(), t.getCashierName() != null ? t.getCashierName() : t.getCreatedBy(),
                t.getTerminalName(),
                t.getBusinessDate() != null ? t.getBusinessDate() : (t.getCreatedAt() != null ? t.getCreatedAt().toLocalDate() : null),
                t.getReprintCount() == null ? 0 : t.getReprintCount(), t.getApprovedBy(), t.getBranchId(),
                t.getCreatedAt(), t.getUpdatedAt(),
                items == null ? List.of() : items.stream().map(this::item).toList(),
                rs);
    }

    // ── Cash, returns, held sales, credit, printers ────────────────────────

    public CashMovementDTO cashMovement(CashMovement m) {
        return new CashMovementDTO(m.getId(), m.getPosSessionId(), m.getType(), m.getAmount(), m.getReason(),
                m.getCategory(), m.getReference(), m.getCreatedBy(), m.getApprovedBy(), m.getCreatedAt(),
                m.getCategoryId(), m.getPostedAccountCode(), m.getPostedAccountName());
    }

    public ReturnDTO saleReturn(PosSaleReturn r, List<PosSaleReturnItem> items) {
        return new ReturnDTO(r.getId(), r.getReturnNumber(), r.getTransactionId(), r.getTransactionNumber(),
                r.getPosSessionId(), r.getMemberId(), r.getMemberName(), r.getSubtotal(), r.getDiscountAmount(),
                r.getTaxAmount(), r.getTotalAmount(), r.getRefundMethod(), r.getRefundBreakdown(), r.getReason(),
                r.getNotes(), r.getRestock(), r.getApprovedBy(), r.getCashierName(), r.getBusinessDate(),
                r.getBranchId(), r.getCreatedAt(),
                items == null ? List.of() : items.stream().map(i -> new ReturnItemDTO(i.getId(), i.getTransactionItemId(),
                        i.getProductId(), i.getProductName(), i.getProductSku(), i.getQuantity(), i.getUnitPrice(),
                        i.getDiscountAmount(), i.getTaxAmount(), i.getTotalAmount())).toList());
    }

    public HeldSaleDTO heldSale(PosHeldSale h) {
        return new HeldSaleDTO(h.getId(), h.getHoldNumber(), h.getPosSessionId(), h.getLabel(), h.getMemberId(),
                h.getMemberName(), h.getCartJson(), h.getItemCount(), h.getTotal(), h.getHeldBy(), h.getTerminalName(),
                h.getCreatedAt());
    }

    public CreditPaymentDTO creditPayment(PosCreditPayment p) {
        List<CreditAllocationDTO> allocations = List.of();
        if (p.getAllocations() != null && !p.getAllocations().isBlank()) {
            try {
                allocations = MAPPER.readValue(p.getAllocations(), new TypeReference<List<CreditAllocationDTO>>() {});
            } catch (Exception ignored) {
                // Malformed allocation JSON only hides the breakdown; the payment itself is still shown.
            }
        }
        return new CreditPaymentDTO(p.getId(), p.getPaymentNumber(), p.getMemberId(), p.getMemberName(),
                p.getPosSessionId(), p.getAmount(), p.getPaymentMethod(), p.getBankAccountName(), p.getReference(),
                p.getNotes(), allocations, p.getReceivedBy(), p.getBusinessDate(), p.getBranchId(), p.getCreatedAt());
    }

    public String writeAllocations(List<CreditAllocationDTO> allocations) {
        try {
            return MAPPER.writeValueAsString(allocations);
        } catch (Exception e) {
            throw new IllegalStateException("Could not serialize credit allocations", e);
        }
    }

    public PrinterDTO printer(PosPrinter p) {
        return new PrinterDTO(p.getId(), p.getName(), p.getConnectionType(), p.getSystemPrinterName(),
                p.getIpAddress(), p.getPortNumber(), p.getPaperSize(), p.getTerminalName(),
                Boolean.TRUE.equals(p.getIsDefault()), Boolean.TRUE.equals(p.getOpenDrawer()),
                !Boolean.FALSE.equals(p.getAutoCut()), !Boolean.FALSE.equals(p.getEnabled()),
                p.getLastTestAt(), p.getLastTestResult());
    }

    public DayCloseDTO dayClose(PosDayClose d) {
        if (d == null) return null;
        return new DayCloseDTO(d.getId(), d.getCloseNumber(), d.getBusinessDate(), d.getSessionCount(),
                d.getInvoiceCount(), d.getGrossSales(), d.getTotalDiscount(), d.getTotalTax(), d.getNetSales(),
                d.getTotalReturns(), d.getExpectedCash(), d.getCountedCash(), d.getCashVariance(), d.getRemarks(),
                d.getClosedBy(), d.getClosedAt());
    }
}
