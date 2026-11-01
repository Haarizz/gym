package com.company.project.controllers.mobile.conversations;

import com.company.project.dto.conversations.*;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.conversations.ConversationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** The member app's chats with their branch's staff and front desk. */
@RestController
@RequestMapping("/api/mobile/member/conversations")
public class MobileMemberConversationController {

    private final ConversationService service;

    public MobileMemberConversationController(ConversationService service) {
        this.service = service;
    }

    /** The member's conversations, latest activity first. */
    @GetMapping
    public ResponseEntity<List<ConversationDTO>> list(@AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(service.memberList(principal));
    }

    /** { "count": n } for the badge. */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Integer>> unreadCount(@AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(Map.of("count", service.memberUnreadTotal(principal)));
    }

    /** GET ?staff_id=12 — the thread with that staff member (no staff_id = the front desk), and whether one can be started. */
    @GetMapping("/lookup")
    public ResponseEntity<ConversationLookupDTO> lookup(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestParam(name = "staff_id", required = false) Long staffId) {
        return ResponseEntity.ok(service.memberLookup(principal, staffId));
    }

    /** Body: { "staff_id": 12 (omit for the front desk), "body": "..." } — starts the thread or adds to it. */
    @PostMapping
    public ResponseEntity<ConversationDTO> start(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestBody ConversationRequestDTO request) {
        return ResponseEntity.ok(service.memberStart(principal, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConversationDTO> get(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable Long id) {
        return ResponseEntity.ok(service.memberGet(principal, id));
    }

    /** GET ?before_id=&limit=30 — newest first. */
    @GetMapping("/{id}/messages")
    public ResponseEntity<List<ConversationMessageDTO>> messages(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable Long id,
            @RequestParam(name = "before_id", required = false) Long beforeId,
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(service.memberMessages(principal, id, beforeId, limit));
    }

    /** Body: { "body": "..." } */
    @PostMapping("/{id}/messages")
    public ResponseEntity<ConversationMessageDTO> send(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable Long id,
            @RequestBody ConversationRequestDTO request) {
        return ResponseEntity.ok(service.memberSend(principal, id, request));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> read(@AuthenticationPrincipal UserDetailsImpl principal, @PathVariable Long id) {
        service.memberRead(principal, id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/messages/{messageId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable Long id,
            @PathVariable Long messageId) {
        service.memberDelete(principal, id, messageId);
        return ResponseEntity.noContent().build();
    }

    /** Body: { "reason": "HARASSMENT|SPAM|INAPPROPRIATE|OFF_PLATFORM|OTHER", "details": "..." } */
    @PostMapping("/{id}/messages/{messageId}/report")
    public ResponseEntity<Void> report(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable Long id,
            @PathVariable Long messageId,
            @RequestBody ConversationRequestDTO request) {
        service.memberReport(principal, id, messageId, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/block")
    public ResponseEntity<ConversationDTO> block(@AuthenticationPrincipal UserDetailsImpl principal, @PathVariable Long id) {
        return ResponseEntity.ok(service.memberBlock(principal, id, true));
    }

    @DeleteMapping("/{id}/block")
    public ResponseEntity<ConversationDTO> unblock(@AuthenticationPrincipal UserDetailsImpl principal, @PathVariable Long id) {
        return ResponseEntity.ok(service.memberBlock(principal, id, false));
    }

    @GetMapping("/settings")
    public ResponseEntity<ChatSettingsDTO> settings(@AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(service.memberSettings(principal));
    }

    /** Body: { "allow_staff_chats": false } */
    @PutMapping("/settings")
    public ResponseEntity<ChatSettingsDTO> updateSettings(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestBody ChatSettingsDTO request) {
        return ResponseEntity.ok(service.updateMemberSettings(principal, request));
    }
}
