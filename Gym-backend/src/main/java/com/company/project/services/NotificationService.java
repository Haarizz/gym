package com.company.project.services;

import com.company.project.config.PermissionCatalog;
import com.company.project.dto.NotificationResponseDTO;
import com.company.project.entities.Notification;
import com.company.project.repositories.NotificationRepository;
import com.company.project.security.UserDetailsImpl;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import com.company.project.security.BranchContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Core notification service. All public notify* methods are safe to call
 * from any service — they swallow errors silently so they never break the
 * calling business operation.
 */
@Service
@Transactional
public class NotificationService {

    // Single-tenant constant. Replace with user.getCompanyId() when multi-tenant is added.
    private static final Long DEFAULT_COMPANY_ID = 1L;

    private final NotificationRepository notificationRepository;
    private final RoleService roleService;

    public NotificationService(NotificationRepository notificationRepository, RoleService roleService) {
        this.notificationRepository = notificationRepository;
        this.roleService = roleService;
    }

    // ── Public trigger methods ────────────────────────────────────────────────

    /**
     * Broadcast an individual notification to all users that have the given role.
     * Uses DB-level unique constraint + catch for idempotency when eventKey is provided.
     *
     * REQUIRES_NEW: notify* is called mid-transaction from business services (e.g.
     * RewardEngineService while generating a reward inside ReferralService.markSuccessful).
     * A Postgres constraint violation aborts the whole physical transaction, not just the
     * statement — so without its own transaction, a duplicate eventKey here would silently
     * roll back the caller's real work (the reward, the wallet credit, the referral status
     * change) even though saveIgnoreDuplicate() "catches" the exception in Java.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyRole(String role, String title, String message,
                           String type, String priority, String module,
                           Long referenceId, String actionUrl, String eventKey) {
        Notification n = buildBase(title, message, type, priority, module, referenceId, actionUrl, eventKey);
        n.setTargetRole(role);
        saveIgnoreDuplicate(n);
    }

    /**
     * Broadcast to multiple roles — one row per role (each role-stream is independent).
     * REQUIRES_NEW here too: this is the actual entry point RewardEngineService calls, and
     * the internal notifyRole(...) call below is a same-class self-invocation that Spring's
     * transactional proxy can't intercept, so notifyRole's own @Transactional would otherwise
     * be silently skipped on this path.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyRoles(List<String> roles, String title, String message,
                            String type, String priority, String module,
                            Long referenceId, String actionUrl, String eventKeyPrefix) {
        for (int i = 0; i < roles.size(); i++) {
            String key = (eventKeyPrefix != null) ? eventKeyPrefix + "_" + roles.get(i) : null;
            notifyRole(roles.get(i), title, message, type, priority, module, referenceId, actionUrl, key);
        }
    }

    /** Send an individual notification to one specific user (e.g. a MEMBER's own event). */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyUser(Long userId, String title, String message,
                           String type, String priority, String module,
                           Long referenceId, String actionUrl, String eventKey) {
        if (userId == null) return;
        Notification n = buildBase(title, message, type, priority, module, referenceId, actionUrl, eventKey);
        n.setTargetUserId(userId);
        saveIgnoreDuplicate(n);
    }

    /**
     * Aggregated role notification — used by the scheduler for batch events.
     * If a notification with the same eventKey already exists today, increments
     * its count and updates the message rather than inserting a duplicate.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyRoleAggregated(String role, String title, String message,
                                     String type, String priority, String module,
                                     String actionUrl, String eventKey, int batchCount) {
        Optional<Notification> existing = notificationRepository
                .findByCompanyIdAndEventKey(DEFAULT_COMPANY_ID, eventKey);

        if (existing.isPresent()) {
            Notification n = existing.get();
            int newCount = n.getCount() + batchCount;
            n.setCount(newCount);
            n.setTitle(title);
            n.setMessage(message);
            n.setRead(false); // re-surface as unread after update
            notificationRepository.save(n);
        } else {
            Notification n = buildBase(title, message, type, priority, module, null, actionUrl, eventKey);
            n.setTargetRole(role);
            n.setCount(batchCount);
            saveIgnoreDuplicate(n);
        }
    }

    // ── Controller-facing read/write methods ─────────────────────────────────

    @Transactional(readOnly = true)
    public Page<NotificationResponseDTO> getForCurrentUser(int page, int size) {
        UserContext ctx = currentUserContext();
        Set<String> allowedModules = allowedModulesForRoles(ctx.roles);
        List<Notification> visible = notificationRepository
                .findAllForUser(ctx.companyId, ctx.userId, ctx.roles, BranchContextHolder.getActiveBranchId()).stream()
                .filter(n -> isModuleVisible(n.getModule(), allowedModules))
                .toList();

        int from = Math.min(page * size, visible.size());
        int to = Math.min(from + size, visible.size());
        List<NotificationResponseDTO> content = visible.subList(from, to).stream()
                .map(this::toDTO)
                .toList();
        return new PageImpl<>(content, PageRequest.of(page, size), visible.size());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount() {
        UserContext ctx = currentUserContext();
        Set<String> allowedModules = allowedModulesForRoles(ctx.roles);
        return notificationRepository.findUnreadForUser(ctx.companyId, ctx.userId, ctx.roles, BranchContextHolder.getActiveBranchId()).stream()
                .filter(n -> isModuleVisible(n.getModule(), allowedModules))
                .count();
    }

    public void markRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (isVisibleToCurrentUser(n)) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
    }

    public void markAllRead() {
        UserContext ctx = currentUserContext();
        notificationRepository.markAllReadForUser(ctx.companyId, ctx.userId, ctx.roles, BranchContextHolder.getActiveBranchId());
    }

    public void softDelete(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (isVisibleToCurrentUser(n)) {
                n.setDeleted(true);
                notificationRepository.save(n);
            }
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Notification buildBase(String title, String message, String type, String priority,
                                   String module, Long referenceId, String actionUrl, String eventKey) {
        Notification n = new Notification();
        n.setCompanyId(DEFAULT_COMPANY_ID);
        n.setTitle(title);
        n.setMessage(message);
        n.setType(type != null ? type : "INFO");
        n.setPriority(priority != null ? priority : "LOW");
        n.setModule(module != null ? module : "GENERAL");
        n.setReferenceId(referenceId);
        n.setActionUrl(actionUrl);
        n.setEventKey(eventKey);
        return n;
    }

    /** Save and silently ignore duplicate eventKey violations (idempotency). */
    private void saveIgnoreDuplicate(Notification n) {
        try {
            notificationRepository.save(n);
        } catch (DataIntegrityViolationException ignored) {
            // Duplicate eventKey — notification already exists, skip
        } catch (Exception ignored) {
            // Never let a notification failure break the calling operation
        }
    }

    private NotificationResponseDTO toDTO(Notification n) {
        return new NotificationResponseDTO(
                n.getId(), n.getTitle(), n.getMessage(),
                n.getType(), n.getPriority(), n.getModule(),
                n.getReferenceId(), n.getActionUrl(),
                n.getCount(), n.isRead(), n.getCreatedAt()
        );
    }

    /** Check that the current user may see/modify this notification. */
    private boolean isVisibleToCurrentUser(Notification n) {
        UserContext ctx = currentUserContext();
        if (!n.getCompanyId().equals(ctx.companyId)) return false;
        boolean targeted = n.getTargetUserId() != null
                ? n.getTargetUserId().equals(ctx.userId)
                : ctx.roles.contains(n.getTargetRole());
        if (!targeted) return false;
        return isModuleVisible(n.getModule(), allowedModulesForRoles(ctx.roles));
    }

    /**
     * Modules (from PermissionCatalog) the given roles have at least one permission for.
     * ADMIN gets every catalog module, since RoleService.getEffectivePermissionKeys
     * already special-cases ADMIN to "all permissions" regardless of stored rows.
     */
    private Set<String> allowedModulesForRoles(List<String> roles) {
        List<String> permissionKeys = roleService.getEffectivePermissionKeysForRoleNames(roles);
        return PermissionCatalog.MODULES.keySet().stream()
                .filter(module -> permissionKeys.stream().anyMatch(key -> key.startsWith(module + "_")))
                .collect(Collectors.toSet());
    }

    /**
     * A notification is visible if its module isn't gated by the permission catalog at all
     * (e.g. "GENERAL", or a notification module — like "LEADS", "BOOKINGS" — that predates/
     * isn't part of the Administration permission grid), or the user's roles have at least
     * one permission for that module.
     */
    private boolean isModuleVisible(String module, Set<String> allowedModules) {
        if (module == null || !PermissionCatalog.MODULES.containsKey(module)) return true;
        return allowedModules.contains(module);
    }

    private UserContext currentUserContext() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserDetailsImpl userDetails)) {
            // Fallback for scheduler (no HTTP context) — use defaults
            return new UserContext(DEFAULT_COMPANY_ID, -1L, List.of());
        }
        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(a -> a.startsWith("ROLE_") ? a.substring(5) : a)
                .toList();
        return new UserContext(DEFAULT_COMPANY_ID, userDetails.getId(), roles);
    }

    private record UserContext(Long companyId, Long userId, List<String> roles) {}
}
