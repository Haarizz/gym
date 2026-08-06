package com.company.project.services;

import com.company.project.entities.FinancialAuditLog;
import com.company.project.repositories.FinancialAuditLogRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional
public class FinancialAuditLogService {

    private final FinancialAuditLogRepository repository;

    public FinancialAuditLogService(FinancialAuditLogRepository repository) {
        this.repository = repository;
    }

    public void record(String action, String entityType, Long entityId, String voucherNo,
                        String module, String summary) {
        FinancialAuditLog log = new FinancialAuditLog();
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setVoucherNo(voucherNo);
        log.setModule(module);
        log.setSummary(summary);
        log.setPerformedBy(resolvePerformedBy());
        log.setIpAddress(resolveIpAddress());
        repository.save(log);
    }

    @Transactional(readOnly = true)
    public List<FinancialAuditLog> search(String entityType, Long entityId, String module,
                                           LocalDate from, LocalDate to) {
        Specification<FinancialAuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (entityType != null && !entityType.isBlank()) {
                predicates.add(cb.equal(root.get("entityType"), entityType));
            }
            if (entityId != null) {
                predicates.add(cb.equal(root.get("entityId"), entityId));
            }
            if (module != null && !module.isBlank()) {
                predicates.add(cb.equal(root.get("module"), module));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from.atStartOfDay()));
            }
            if (to != null) {
                predicates.add(cb.lessThan(root.get("createdAt"), to.plusDays(1).atStartOfDay()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return repository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    /** Same resolution AuditConfig.auditorProvider() uses for BaseEntity.createdBy/updatedBy. */
    private static String resolvePerformedBy() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return "SYSTEM";
        }
        return authentication.getName();
    }

    /** Null outside an HTTP request (e.g. scheduler-triggered auto-posts) — never throws. */
    private static String resolveIpAddress() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();
            String forwardedFor = attrs.getRequest().getHeader("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                return forwardedFor.split(",")[0].trim();
            }
            return attrs.getRequest().getRemoteAddr();
        } catch (IllegalStateException e) {
            return null;
        }
    }
}
