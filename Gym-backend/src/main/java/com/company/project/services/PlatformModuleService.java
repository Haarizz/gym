package com.company.project.services;

import com.company.project.dto.ModuleAuditLogResponseDTO;
import com.company.project.dto.PlatformModuleResponseDTO;
import com.company.project.entities.ModuleAuditLog;
import com.company.project.entities.PlatformModule;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.ModuleAuditLogRepository;
import com.company.project.repositories.PlatformModuleRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Backs GymOS's Module Management: real enable/disable and status tracking
 * for platform modules, replacing gymos.tsx's hardcoded moduleStatus sample
 * data. Every module referenced here is expected to already exist as a
 * PermissionCatalog module key; rows are seeded by V44__platform_modules.sql,
 * not created on demand, so the set of manageable modules is a deliberate
 * curated list rather than every RBAC-grid entry (dashboard/reports-style
 * sub-modules aren't independently toggleable).
 */
@Service
public class PlatformModuleService {

    /** module_key -> user-facing display name, for the curated toggleable set. */
    public static final Map<String, String> MANAGEABLE_MODULES = new LinkedHashMap<>();
    static {
        MANAGEABLE_MODULES.put("COMMUNITY", "Community Management");
        MANAGEABLE_MODULES.put("MEMBER_CONNECT", "Member Connect");
        MANAGEABLE_MODULES.put("SALES_PURCHASES", "Sales & Purchases");
        MANAGEABLE_MODULES.put("FINANCIALS", "Financials");
        MANAGEABLE_MODULES.put("PAYROLL", "Payroll & Employees");
        MANAGEABLE_MODULES.put("ASSETS", "Assets Management");
        MANAGEABLE_MODULES.put("BIOS", "BiOS Analytics");
        MANAGEABLE_MODULES.put("REPORTS", "Advanced Reports");
    }

    private final PlatformModuleRepository moduleRepository;
    private final ModuleAuditLogRepository auditLogRepository;

    public PlatformModuleService(PlatformModuleRepository moduleRepository,
                                  ModuleAuditLogRepository auditLogRepository) {
        this.moduleRepository = moduleRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(readOnly = true)
    public List<PlatformModuleResponseDTO> getAll() {
        return moduleRepository.findAll().stream()
                .sorted((a, b) -> a.getDisplayName().compareToIgnoreCase(b.getDisplayName()))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ModuleAuditLogResponseDTO> getRecentAuditLog(int limit) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, limit)).stream()
                .map(ModuleAuditLogResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public PlatformModuleResponseDTO setEnabled(String moduleKey, boolean enabled) {
        PlatformModule module = findOrThrow(moduleKey);
        if (module.isEnabled() == enabled) {
            return toDTO(module);
        }
        module.setEnabled(enabled);
        module.setStatus(enabled ? PlatformModule.STATUS_ACTIVE : PlatformModule.STATUS_INACTIVE);
        module.setLastStatusChangeAt(LocalDateTime.now());
        PlatformModule saved = moduleRepository.save(module);

        recordAudit(enabled ? "ENABLE" : "DISABLE", moduleKey,
                (enabled ? "Enabled " : "Disabled ") + module.getDisplayName());
        return toDTO(saved);
    }

    @Transactional
    public PlatformModuleResponseDTO setStatus(String moduleKey, String status) {
        if (!PlatformModule.STATUS_ACTIVE.equals(status)
                && !PlatformModule.STATUS_MAINTENANCE.equals(status)
                && !PlatformModule.STATUS_INACTIVE.equals(status)) {
            throw new BusinessRuleViolationException("Unknown module status: " + status);
        }
        PlatformModule module = findOrThrow(moduleKey);
        module.setStatus(status);
        module.setEnabled(!PlatformModule.STATUS_INACTIVE.equals(status));
        module.setLastStatusChangeAt(LocalDateTime.now());
        PlatformModule saved = moduleRepository.save(module);

        recordAudit("STATUS_CHANGE", moduleKey,
                module.getDisplayName() + " set to " + status);
        return toDTO(saved);
    }

    private PlatformModule findOrThrow(String moduleKey) {
        return moduleRepository.findByModuleKey(moduleKey)
                .orElseThrow(() -> new EntityNotFoundException("Module not found: " + moduleKey));
    }

    private void recordAudit(String action, String moduleKey, String summary) {
        ModuleAuditLog log = new ModuleAuditLog();
        log.setAction(action);
        log.setModuleKey(moduleKey);
        log.setSummary(summary);
        log.setPerformedBy(resolvePerformedBy());
        log.setIpAddress(resolveIpAddress());
        auditLogRepository.save(log);
    }

    private static String resolvePerformedBy() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return "SYSTEM";
        }
        return authentication.getName();
    }

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

    private PlatformModuleResponseDTO toDTO(PlatformModule module) {
        PlatformModuleResponseDTO dto = new PlatformModuleResponseDTO();
        dto.setId(module.getId());
        dto.setModuleKey(module.getModuleKey());
        dto.setDisplayName(module.getDisplayName());
        dto.setStatus(module.getStatus());
        dto.setEnabled(module.isEnabled());
        dto.setLastStatusChangeAt(module.getLastStatusChangeAt());
        dto.setCreatedAt(module.getCreatedAt());
        dto.setUpdatedAt(module.getUpdatedAt());
        return dto;
    }
}
