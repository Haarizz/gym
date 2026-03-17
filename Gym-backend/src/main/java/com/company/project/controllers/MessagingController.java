package com.company.project.controllers;

import com.company.project.dto.*;
import com.company.project.services.MessagingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messaging")
public class MessagingController {

    private final MessagingService messagingService;

    public MessagingController(MessagingService messagingService) {
        this.messagingService = messagingService;
    }

    @GetMapping("/recipients")
    public ResponseEntity<List<MessagingRecipientDTO>> getRecipients(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(messagingService.getRecipients(type, search));
    }

    @GetMapping("/templates")
    public ResponseEntity<List<MessageTemplateResponseDTO>> getTemplates() {
        return ResponseEntity.ok(messagingService.getTemplates());
    }

    @PostMapping("/templates")
    public ResponseEntity<MessageTemplateResponseDTO> createTemplate(@RequestBody MessageTemplateRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(messagingService.createTemplate(request));
    }

    @PutMapping("/templates/{id}")
    public ResponseEntity<MessageTemplateResponseDTO> updateTemplate(
            @PathVariable Long id,
            @RequestBody MessageTemplateRequestDTO request) {
        return ResponseEntity.ok(messagingService.updateTemplate(id, request));
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable Long id) {
        messagingService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/groups")
    public ResponseEntity<List<MessageGroupResponseDTO>> getGroups() {
        return ResponseEntity.ok(messagingService.getGroups());
    }

    @PostMapping("/groups")
    public ResponseEntity<MessageGroupResponseDTO> createGroup(@RequestBody MessageGroupRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(messagingService.createGroup(request));
    }

    @PutMapping("/groups/{id}")
    public ResponseEntity<MessageGroupResponseDTO> updateGroup(
            @PathVariable Long id,
            @RequestBody MessageGroupRequestDTO request) {
        return ResponseEntity.ok(messagingService.updateGroup(id, request));
    }

    @DeleteMapping("/groups/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id) {
        messagingService.deleteGroup(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/history")
    public ResponseEntity<List<MessageHistoryDTO>> getHistory() {
        return ResponseEntity.ok(messagingService.getHistory());
    }

    @DeleteMapping("/history/{id}")
    public ResponseEntity<Void> deleteHistory(@PathVariable Long id) {
        messagingService.deleteHistory(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/analytics")
    public ResponseEntity<MessagingAnalyticsDTO> getAnalytics() {
        return ResponseEntity.ok(messagingService.getAnalytics());
    }

    @PostMapping("/send")
    public ResponseEntity<SendMessageResponseDTO> sendMessage(@RequestBody SendMessageRequestDTO request) {
        return ResponseEntity.ok(messagingService.sendMessage(request));
    }
}
