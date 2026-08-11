package com.company.project.controllers;

import com.company.project.dto.NotificationResponseDTO;
import com.company.project.services.NotificationService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * GET /api/notifications?page=0&size=20
     * Returns paginated notifications for the authenticated user — targeted to them
     * personally or to one of their roles, and further filtered to modules their
     * role currently has permission for (see NotificationService.isModuleVisible).
     */
    @GetMapping
    public ResponseEntity<Page<NotificationResponseDTO>> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(notificationService.getForCurrentUser(page, size));
    }

    /**
     * GET /api/notifications/unread-count
     * Returns { "count": N } — used by the frontend bell badge.
     */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount()));
    }

    /**
     * PUT /api/notifications/{id}/read
     * Marks a single notification as read.
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id) {
        notificationService.markRead(id);
        return ResponseEntity.ok().build();
    }

    /**
     * PUT /api/notifications/read-all
     * Marks all notifications as read for the current user.
     */
    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllRead() {
        notificationService.markAllRead();
        return ResponseEntity.ok().build();
    }

    /**
     * DELETE /api/notifications/{id}
     * Soft-deletes a notification (hides it from the user's view).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        notificationService.softDelete(id);
        return ResponseEntity.ok().build();
    }
}
