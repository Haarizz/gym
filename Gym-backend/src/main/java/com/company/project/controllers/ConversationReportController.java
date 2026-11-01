package com.company.project.controllers;

import com.company.project.dto.conversations.ConversationReportDTO;
import com.company.project.dto.conversations.ResolveReportRequestDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.conversations.ConversationReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Reported chat messages, for the gym's admins only. A report is the only way to see a
 * member↔staff conversation, so this is gym-owner level rather than a Member Connect
 * permission that front-desk roles may hold.
 */
@RestController
@RequestMapping("/api/conversation-reports")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class ConversationReportController {

    private final ConversationReportService service;

    public ConversationReportController(ConversationReportService service) {
        this.service = service;
    }

    /** GET /api/conversation-reports?status=OPEN&page=0&size=20 */
    @GetMapping
    public ResponseEntity<ConversationReportService.PageResult> list(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.list(status, page, size));
    }

    /** The report with the whole conversation up to when it was filed. */
    @GetMapping("/{id}")
    public ResponseEntity<ConversationReportDTO> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.get(id));
    }

    /** Body: { "action": "DISMISS|BLOCK_CONVERSATION|BAN_MEMBER", "note": "..." } */
    @PostMapping("/{id}/resolve")
    public ResponseEntity<ConversationReportDTO> resolve(
            @PathVariable Long id,
            @RequestBody ResolveReportRequestDTO request,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        String resolvedBy = principal != null ? principal.getUsername() : "Admin";
        return ResponseEntity.ok(service.resolve(id, request, resolvedBy));
    }

    /** Lets a chat-banned member chat again. */
    @DeleteMapping("/members/{memberId}/chat-ban")
    public ResponseEntity<Void> liftBan(@PathVariable Long memberId) {
        service.liftMemberBan(memberId);
        return ResponseEntity.noContent().build();
    }
}
