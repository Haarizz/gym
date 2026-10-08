package com.company.project.services.pos;

import com.company.project.dto.pos.PosResponses.PageMeta;
import com.company.project.dto.pos.PosResponses.TransactionDTO;
import com.company.project.dto.pos.PosResponses.TransactionsPage;
import com.company.project.entities.PosSaleReturn;
import com.company.project.entities.SaleTransaction;
import com.company.project.entities.SaleTransactionItem;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.PosSaleReturnRepository;
import com.company.project.repositories.SaleTransactionItemRepository;
import com.company.project.repositories.SaleTransactionRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/** POS sale lookups (reprint / return search, customer history) and reprint bookkeeping. */
@Service
@Transactional
public class PosSalesService {

    private final SaleTransactionRepository saleRepo;
    private final SaleTransactionItemRepository itemRepo;
    private final PosSaleReturnRepository returnRepo;
    private final PosSettingsService settingsService;
    private final PosAuditService auditService;
    private final PosSupport support;
    private final PosMapper mapper;

    public PosSalesService(SaleTransactionRepository saleRepo, SaleTransactionItemRepository itemRepo,
                           PosSaleReturnRepository returnRepo, PosSettingsService settingsService,
                           PosAuditService auditService, PosSupport support, PosMapper mapper) {
        this.saleRepo = saleRepo;
        this.itemRepo = itemRepo;
        this.returnRepo = returnRepo;
        this.settingsService = settingsService;
        this.auditService = auditService;
        this.support = support;
        this.mapper = mapper;
    }

    public record Filter(String search, String paymentMethod, String status, Long sessionId, LocalDate from,
                         LocalDate to, String cashier, Long memberId, String returnStatus) {}

    @Transactional(readOnly = true)
    public TransactionsPage list(Filter f, int page, int size) {
        Specification<SaleTransaction> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (f.search() != null && !f.search().isBlank()) {
                String like = "%" + f.search().trim().toLowerCase(Locale.ROOT) + "%";
                p.add(cb.or(
                        cb.like(cb.lower(root.get("transactionNumber")), like),
                        cb.like(cb.lower(root.get("memberName")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("memberCode"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("memberPhone"), "")), like)));
            }
            if (f.paymentMethod() != null && !f.paymentMethod().isBlank()) {
                String pm = f.paymentMethod().trim().toUpperCase(Locale.ROOT);
                p.add(cb.or(cb.equal(cb.upper(root.get("paymentMethod")), pm),
                        cb.like(cb.upper(cb.coalesce(root.get("paymentSummary"), "")), "%" + pm + "%")));
            }
            if (f.status() != null && !f.status().isBlank()) p.add(cb.equal(root.get("status"), f.status().trim().toUpperCase(Locale.ROOT)));
            if (f.returnStatus() != null && !f.returnStatus().isBlank()) {
                p.add(cb.equal(root.get("returnStatus"), f.returnStatus().trim().toUpperCase(Locale.ROOT)));
            }
            if (f.sessionId() != null) p.add(cb.equal(root.get("posSessionId"), f.sessionId()));
            if (f.memberId() != null) p.add(cb.equal(root.get("memberId"), f.memberId()));
            if (f.from() != null) p.add(cb.greaterThanOrEqualTo(root.get("createdAt"), f.from().atStartOfDay()));
            if (f.to() != null) p.add(cb.lessThan(root.get("createdAt"), f.to().plusDays(1).atStartOfDay()));
            if (f.cashier() != null && !f.cashier().isBlank()) {
                String like = "%" + f.cashier().trim().toLowerCase(Locale.ROOT) + "%";
                p.add(cb.or(cb.like(cb.lower(cb.coalesce(root.get("cashierName"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("createdBy"), "")), like)));
            }
            return cb.and(p.toArray(new Predicate[0]));
        };
        int safeSize = Math.min(Math.max(size, 1), 200);
        Page<SaleTransaction> result = saleRepo.findAll(spec,
                PageRequest.of(Math.max(page, 1) - 1, safeSize, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<SaleTransaction> sales = result.getContent();
        Map<Long, List<SaleTransactionItem>> items = sales.isEmpty() ? Map.of()
                : itemRepo.findByTransactionIdIn(sales.stream().map(SaleTransaction::getId).toList())
                    .stream().collect(Collectors.groupingBy(SaleTransactionItem::getTransactionId));
        List<TransactionDTO> dtos = sales.stream()
                .map(t -> mapper.transaction(t, items.getOrDefault(t.getId(), List.of()), List.of()))
                .toList();
        return new TransactionsPage(dtos, new PageMeta(page, safeSize, result.getTotalElements(), result.getTotalPages()));
    }

    @Transactional(readOnly = true)
    public TransactionDTO get(Long id) {
        SaleTransaction t = saleRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Sale not found with id: " + id));
        return full(t);
    }

    /** Find a sale by its receipt number (as scanned from the receipt barcode / QR) or numeric id. */
    @Transactional(readOnly = true)
    public TransactionDTO lookup(String number) {
        String q = number == null ? "" : number.trim();
        Optional<SaleTransaction> found = saleRepo.findFirstByTransactionNumberIgnoreCase(q);
        if (found.isEmpty() && q.matches("\\d{1,10}")) {
            String padded = "TXN-" + String.format("%010d", Long.parseLong(q));
            found = saleRepo.findFirstByTransactionNumberIgnoreCase(padded);
        }
        return full(found.orElseThrow(() -> new EntityNotFoundException("No sale found with receipt number " + q + ".")));
    }

    public TransactionDTO reprint(Long id, String supervisorPin) {
        support.requireBranch();
        SaleTransaction t = saleRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Sale not found with id: " + id));
        var settings = settingsService.current();
        String approvedBy = support.approve(settings, Boolean.TRUE.equals(settings.getRequireSupervisorForReprint()),
                supervisorPin, "reprinting a receipt");
        t.setReprintCount((t.getReprintCount() == null ? 0 : t.getReprintCount()) + 1);
        t = saleRepo.save(t);
        auditService.log("REPRINT", "SaleTransaction", t.getId(), t.getTransactionNumber(), t.getPosSessionId(),
                t.getTotalAmount(), "Reprint #" + t.getReprintCount(), approvedBy, t.getTerminalName());
        return full(t);
    }

    private TransactionDTO full(SaleTransaction t) {
        List<PosSaleReturn> returns = returnRepo.findByTransactionIdOrderByCreatedAtDesc(t.getId());
        return mapper.transaction(t, itemRepo.findByTransactionId(t.getId()), returns);
    }
}
