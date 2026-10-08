package com.company.project.services.pos;

import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.*;
import com.company.project.entities.*;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.*;
import com.company.project.services.FinancialEventService;
import com.company.project.services.ReceiptVoucherService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import static com.company.project.services.pos.PosSupport.*;

/**
 * POS credit (on-account) balances per member and their settlement — BillBull's
 * POS › Customer › Receive Payment. A payment is applied oldest sale first, posts
 * DR Cash/Bank / CR Accounts Receivable, and raises a receipt voucher. Cash
 * collections count towards the collecting session's drawer.
 */
@Service
@Transactional
public class PosCreditService {

    private final SaleTransactionRepository saleRepo;
    private final PosCreditPaymentRepository paymentRepo;
    private final MemberRepository memberRepo;
    private final AccountHeadRepository accountHeadRepo;
    private final PosSessionRepository sessionRepo;
    private final PosTillService tillService;
    private final FinancialEventService financialEventService;
    private final ReceiptVoucherService receiptVoucherService;
    private final PosAuditService auditService;
    private final PosSupport support;
    private final PosMapper mapper;
    private final PosInvoiceService invoiceService;

    public PosCreditService(SaleTransactionRepository saleRepo, PosCreditPaymentRepository paymentRepo,
                            MemberRepository memberRepo, AccountHeadRepository accountHeadRepo,
                            PosSessionRepository sessionRepo, PosTillService tillService,
                            FinancialEventService financialEventService, ReceiptVoucherService receiptVoucherService,
                            PosAuditService auditService, PosSupport support, PosMapper mapper,
                            PosInvoiceService invoiceService) {
        this.invoiceService = invoiceService;
        this.saleRepo = saleRepo;
        this.paymentRepo = paymentRepo;
        this.memberRepo = memberRepo;
        this.accountHeadRepo = accountHeadRepo;
        this.sessionRepo = sessionRepo;
        this.tillService = tillService;
        this.financialEventService = financialEventService;
        this.receiptVoucherService = receiptVoucherService;
        this.auditService = auditService;
        this.support = support;
        this.mapper = mapper;
    }

    /** Unsettled POS credit of each member asked for (members without any are left out). */
    @Transactional(readOnly = true)
    public java.util.Map<Long, BigDecimal> outstanding(List<Long> memberIds) {
        java.util.Map<Long, BigDecimal> out = new java.util.LinkedHashMap<>();
        if (memberIds == null || memberIds.isEmpty()) return out;
        List<Long> ids = memberIds.stream().filter(java.util.Objects::nonNull).distinct().limit(500).toList();
        for (Object[] row : saleRepo.sumOpenCredit(ids)) {
            out.put(((Number) row[0]).longValue(), r2(new BigDecimal(row[1].toString())));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public CustomerCreditDTO customer(Long memberId) {
        Member m = memberRepo.findById(memberId).orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + memberId));
        List<SaleTransaction> creditSales = saleRepo.findCreditSales(memberId);
        BigDecimal totalCredit = BigDecimal.ZERO, settled = BigDecimal.ZERO;
        List<OpenCreditSaleDTO> open = new ArrayList<>();
        for (SaleTransaction t : creditSales) {
            totalCredit = totalCredit.add(nz(t.getCreditAmount()));
            settled = settled.add(nz(t.getCreditSettledAmount()));
            BigDecimal outstanding = nz(t.getCreditAmount()).subtract(nz(t.getCreditSettledAmount()));
            if (outstanding.compareTo(new BigDecimal("0.004")) > 0) {
                open.add(new OpenCreditSaleDTO(t.getId(), t.getTransactionNumber(), t.getCreatedAt(), t.getTotalAmount(),
                        nz(t.getCreditAmount()), nz(t.getCreditSettledAmount()), r2(outstanding)));
            }
        }
        open.sort((a, b) -> a.createdAt() == null || b.createdAt() == null ? 0 : a.createdAt().compareTo(b.createdAt()));
        List<CreditPaymentDTO> payments = paymentRepo.findByMemberIdOrderByCreatedAtDesc(memberId).stream()
                .limit(20).map(mapper::creditPayment).toList();
        return new CustomerCreditDTO(m.getId(), m.getName(), m.getMemberId(), m.getPhone(), r2(totalCredit), r2(settled),
                r2(totalCredit.subtract(settled).max(BigDecimal.ZERO)), r2(m.getOutstandingBalance()), open, payments);
    }

    public CreditPaymentDTO receive(PosRequests.CreditPayment req) {
        support.requireBranch();
        if (req.memberId() == null) throw new BusinessRuleViolationException("Select the member who is paying.");
        Member m = memberRepo.findById(req.memberId())
                .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + req.memberId()));
        BigDecimal amount = r2(req.amount());
        if (amount.signum() <= 0) throw new BusinessRuleViolationException("Amount must be greater than zero.");
        String method = req.paymentMethod() == null ? "CASH" : req.paymentMethod().trim().toUpperCase(Locale.ROOT);

        List<SaleTransaction> open = saleRepo.findOpenCreditSales(m.getId());
        BigDecimal outstanding = open.stream().map(t -> nz(t.getCreditAmount()).subtract(nz(t.getCreditSettledAmount())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (amount.compareTo(r2(outstanding)) > 0) {
            throw new BusinessRuleViolationException(m.getName() + " owes " + r2(outstanding) + " on POS credit — the payment cannot exceed that.");
        }

        PosCreditPayment p = new PosCreditPayment();
        p.setMemberId(m.getId());
        p.setMemberName(m.getName());
        p.setAmount(amount);
        p.setReference(trimToNull(req.reference()));
        p.setNotes(trimToNull(req.notes()));
        p.setReceivedBy(support.currentDisplayName());
        String legMethod;
        switch (method) {
            case "CASH" -> { p.setPaymentMethod("CASH"); legMethod = PosCheckoutService.LEG_CASH; }
            case "CARD" -> { p.setPaymentMethod("CARD"); legMethod = PosCheckoutService.LEG_CARD; }
            case "ONLINE" -> {
                if (req.bankAccountId() == null) throw new BusinessRuleViolationException("Select the bank account that received the payment.");
                AccountHead bank = accountHeadRepo.findById(req.bankAccountId())
                        .orElseThrow(() -> new EntityNotFoundException("Bank account not found: " + req.bankAccountId()));
                p.setPaymentMethod("ONLINE");
                p.setBankAccountCode(bank.getCode());
                p.setBankAccountName(bank.getName());
                legMethod = PosCheckoutService.LEG_ONLINE;
            }
            default -> throw new BusinessRuleViolationException("Payment method must be CASH, CARD or ONLINE.");
        }

        PosSession session = null;
        if (req.posSessionId() != null) {
            session = sessionRepo.findById(req.posSessionId())
                    .orElseThrow(() -> new EntityNotFoundException("POS session not found with id: " + req.posSessionId()));
            if (!"OPEN".equals(session.getStatus())) throw new BusinessRuleViolationException("That session is closed.");
        } else {
            session = tillService.myOpenSession().orElse(null);
        }
        if ("CASH".equals(p.getPaymentMethod()) && session == null) {
            throw new BusinessRuleViolationException("Open a POS session to receive cash into the drawer.");
        }
        p.setPosSessionId(session != null ? session.getId() : null);
        p.setBusinessDate(session != null && session.getBusinessDate() != null ? session.getBusinessDate() : support.today());

        // Oldest sale first.
        List<CreditAllocationDTO> allocations = new ArrayList<>();
        BigDecimal left = amount;
        for (SaleTransaction t : open) {
            if (left.signum() <= 0) break;
            BigDecimal due = nz(t.getCreditAmount()).subtract(nz(t.getCreditSettledAmount()));
            if (due.signum() <= 0) continue;
            BigDecimal apply = due.min(left);
            t.setCreditSettledAmount(r2(nz(t.getCreditSettledAmount()).add(apply)));
            saleRepo.save(t);
            invoiceService.sync(t);
            allocations.add(new CreditAllocationDTO(t.getId(), t.getTransactionNumber(), r2(apply)));
            left = left.subtract(apply);
        }
        p.setAllocations(mapper.writeAllocations(allocations));
        p = paymentRepo.save(p);
        p.setPaymentNumber("PCR-" + String.format("%08d", p.getId()));
        p = paymentRepo.save(p);

        financialEventService.onPosCreditPaymentReceived(p);
        receiptVoucherService.createVoucherFromModule(
                "POS Credit Settlement – " + p.getPaymentNumber(), "POS", m.getName(), m.getId(), amount,
                legMethod, p.getPaymentNumber(), p.getPaymentNumber(), p.getNotes(), null, p.getBranchId());

        auditService.log("CREDIT_PAYMENT", "PosCreditPayment", p.getId(), p.getPaymentNumber(), p.getPosSessionId(),
                amount, m.getName() + " — " + p.getPaymentMethod(), null, session != null ? session.getTerminalName() : null);
        return mapper.creditPayment(p);
    }

    @Transactional(readOnly = true)
    public List<CreditPaymentDTO> payments(Long memberId) {
        return paymentRepo.findByMemberIdOrderByCreatedAtDesc(memberId).stream().map(mapper::creditPayment).toList();
    }
}
