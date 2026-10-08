package com.company.project.services.pos;

import com.company.project.dto.pos.PosResponses.AuditLogDTO;
import com.company.project.dto.pos.PosResponses.AuditPage;
import com.company.project.dto.pos.PosResponses.PageMeta;
import com.company.project.entities.PosAuditLog;
import com.company.project.repositories.PosAuditLogRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/** Writes and queries the POS audit trail (pos_audit_logs). */
@Service
@Transactional
public class PosAuditService {

    /** Events the terminal may record on its own (everything else is written server-side). */
    public static final Set<String> CLIENT_ACTIONS = Set.of(
            "DRAWER_OPEN", "TERMINAL_LOCK", "TERMINAL_UNLOCK", "RECEIPT_SHARE", "RECEIPT_PRINT",
            "REPORT_PRINT", "LINE_VOID", "CART_CLEAR", "PRICE_CHECK");

    private final PosAuditLogRepository repository;
    private final PosSupport support;

    public PosAuditService(PosAuditLogRepository repository, PosSupport support) {
        this.repository = repository;
        this.support = support;
    }

    public PosAuditLog log(String action, String referenceType, Long referenceId, String referenceNumber,
                           Long sessionId, BigDecimal amount, String details, String approvedBy, String terminalName) {
        PosAuditLog entry = new PosAuditLog();
        entry.setAction(action);
        entry.setReferenceType(referenceType);
        entry.setReferenceId(referenceId);
        entry.setReferenceNumber(referenceNumber);
        entry.setPosSessionId(sessionId);
        entry.setAmount(amount);
        entry.setDetails(details);
        entry.setPerformedBy(support.currentUsername());
        entry.setApprovedBy(approvedBy);
        entry.setTerminalName(terminalName);
        return repository.save(entry);
    }

    @Transactional(readOnly = true)
    public AuditPage search(LocalDate from, LocalDate to, String action, String user, Long sessionId, int page, int size) {
        Specification<PosAuditLog> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (from != null) p.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from.atStartOfDay()));
            if (to != null) p.add(cb.lessThan(root.get("createdAt"), to.plusDays(1).atStartOfDay()));
            if (action != null && !action.isBlank()) p.add(cb.equal(root.get("action"), action));
            if (user != null && !user.isBlank()) {
                p.add(cb.like(cb.lower(root.get("performedBy")), "%" + user.toLowerCase() + "%"));
            }
            if (sessionId != null) p.add(cb.equal(root.get("posSessionId"), sessionId));
            return cb.and(p.toArray(new Predicate[0]));
        };
        int safeSize = Math.min(Math.max(size, 1), 200);
        Page<PosAuditLog> result = repository.findAll(spec,
                PageRequest.of(Math.max(page, 1) - 1, safeSize, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<AuditLogDTO> logs = result.getContent().stream().map(PosAuditService::toDto).toList();
        return new AuditPage(logs, new PageMeta(page, safeSize, result.getTotalElements(), result.getTotalPages()));
    }

    static AuditLogDTO toDto(PosAuditLog a) {
        return new AuditLogDTO(a.getId(), a.getAction(), a.getReferenceType(), a.getReferenceId(),
                a.getReferenceNumber(), a.getPosSessionId(), a.getAmount(), a.getDetails(),
                a.getPerformedBy(), a.getApprovedBy(), a.getTerminalName(), a.getCreatedAt());
    }
}
