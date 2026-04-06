package com.company.project.services;

import com.company.project.dto.NotificationResponseDTO;
import com.company.project.entities.Notification;
import com.company.project.repositories.NotificationRepository;
import com.company.project.security.UserDetailsImpl;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

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

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    // ── Public trigger methods ────────────────────────────────────────────────

    /**
     * Broadcast an individual notification to all users that have the given role.
     * Uses DB-level unique constraint + catch for idempotency when eventKey is provided.
     */
    public void notifyRole(String role, String title, String message,
                           String type, String priority, String module,
                           Long referenceId, String actionUrl, String eventKey) {
        Notification n = buildBase(title, message, type, priority, module, referenceId, actionUrl, eventKey);
        n.setTargetRole(role);
        saveIgnoreDuplicate(n);
    }

    /** Broadcast to multiple roles — one row per role (each role-stream is independent). */
    public void notifyRoles(List<String> roles, String title, String message,
                            String type, String priority, String module,
                            Long referenceId, String actionUrl, String eventKeyPrefix) {
        for (int i = 0; i < roles.size(); i++) {
            String key = (eventKeyPrefix != null) ? eventKeyPrefix + "_" + roles.get(i) : null;
            notifyRole(roles.get(i), title, message, type, priority, module, referenceId, actionUrl, key);
        }
    }

    /** Send an individual notification to one specific user (e.g. a MEMBER's own event). */
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
        Page<Notification> raw = notificationRepository.findForUser(
                ctx.companyId, ctx.userId, ctx.roles,
                PageRequest.of(page, size));
        return raw.map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount() {
        UserContext ctx = currentUserContext();
        return notificationRepository.countUnread(ctx.companyId, ctx.userId, ctx.roles);
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
        notificationRepository.markAllReadForUser(ctx.companyId, ctx.userId, ctx.roles);
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
        if (n.getTargetUserId() != null) return n.getTargetUserId().equals(ctx.userId);
        return ctx.roles.contains(n.getTargetRole());
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
