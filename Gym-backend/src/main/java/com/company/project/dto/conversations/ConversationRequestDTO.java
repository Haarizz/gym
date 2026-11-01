package com.company.project.dto.conversations;

/**
 * Request bodies for the chat endpoints; each uses only its own fields.
 * Start (member): staffId (null = front desk) + body. Start (staff): memberId + body.
 * Send: body. Report: reason + details.
 */
public record ConversationRequestDTO(
        Long staffId,
        Long memberId,
        String body,
        String reason,
        String details) {
}
