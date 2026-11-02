package com.company.project.controllers.mobile.conversations;

import com.company.project.dto.conversations.*;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.conversations.ConversationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * The staff and trainer app's chats with members, on the active branch: their own
 * conversations, plus the front desk's for everyone who isn't a trainer.
 */
@RestController
@RequestMapping("/api/mobile/staff/conversations")
public class MobileStaffConversationController {

    private final ConversationService service;

    public MobileStaffConversationController(ConversationService service) {
        this.service = service;
    }

    /** GET ?inbox=all|mine|front_desk (default all), latest activity first. */
    @GetMapping
    public ResponseEntity<List<ConversationDTO>> list(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestParam(required = false) String inbox) {
        return ResponseEntity.ok(service.staffList(principal, inbox));
    }

    /** { "count": n } for the badge, front desk included. */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Integer>> unreadCount(@AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(Map.of("count", service.staffUnreadTotal(principal)));
    }

    /** GET ?search=&limit=100 — members the caller can start a chat with (or already chats with), by name. */
    @GetMapping("/members")
    public ResponseEntity<List<ChatMemberDTO>> members(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(service.staffMembers(principal, search, limit));
    }

    /** GET ?member_id=40 — the caller's own thread with that member, and whether one can be started. */
    @GetMapping("/lookup")
    public ResponseEntity<ConversationLookupDTO> lookup(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestParam(name = "member_id") Long memberId) {
        return ResponseEntity.ok(service.staffLookup(principal, memberId));
    }

    /** Body: { "member_id": 40, "body": "..." } — starts the caller's thread with the member or adds to it. */
    @PostMapping
    public ResponseEntity<ConversationDTO> start(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestBody ConversationRequestDTO request) {
        return ResponseEntity.ok(service.staffStart(principal, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConversationDTO> get(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable Long id) {
        return ResponseEntity.ok(service.staffGet(principal, id));
    }

    /** GET ?before_id=&limit=30 — newest first. */
    @GetMapping("/{id}/messages")
    public ResponseEntity<List<ConversationMessageDTO>> messages(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable Long id,
            @RequestParam(name = "before_id", required = false) Long beforeId,
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(service.staffMessages(principal, id, beforeId, limit));
    }

    /** Body: { "body": "..." } */
    @PostMapping("/{id}/messages")
    public ResponseEntity<ConversationMessageDTO> send(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable Long id,
            @RequestBody ConversationRequestDTO request) {
        return ResponseEntity.ok(service.staffSend(principal, id, request));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> read(@AuthenticationPrincipal UserDetailsImpl principal, @PathVariable Long id) {
        service.staffRead(principal, id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/messages/{messageId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable Long id,
            @PathVariable Long messageId) {
        service.staffDelete(principal, id, messageId);
        return ResponseEntity.noContent().build();
    }

    /** Body: { "reason": "HARASSMENT|SPAM|INAPPROPRIATE|OFF_PLATFORM|OTHER", "details": "..." } */
    @PostMapping("/{id}/messages/{messageId}/report")
    public ResponseEntity<Void> report(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable Long id,
            @PathVariable Long messageId,
            @RequestBody ConversationRequestDTO request) {
        service.staffReport(principal, id, messageId, request);
        return ResponseEntity.noContent().build();
    }

    /** Stops the member sending here for 7 days. */
    @PostMapping("/{id}/mute")
    public ResponseEntity<ConversationDTO> mute(@AuthenticationPrincipal UserDetailsImpl principal, @PathVariable Long id) {
        return ResponseEntity.ok(service.staffMute(principal, id, true));
    }

    @DeleteMapping("/{id}/mute")
    public ResponseEntity<ConversationDTO> unmute(@AuthenticationPrincipal UserDetailsImpl principal, @PathVariable Long id) {
        return ResponseEntity.ok(service.staffMute(principal, id, false));
    }

    @GetMapping("/settings")
    public ResponseEntity<ChatSettingsDTO> settings(@AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(service.staffSettings(principal));
    }

    /** Body: { "accepts_member_messages": false } */
    @PutMapping("/settings")
    public ResponseEntity<ChatSettingsDTO> updateSettings(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestBody ChatSettingsDTO request) {
        return ResponseEntity.ok(service.updateStaffSettings(principal, request));
    }
}
