package com.company.project.dto.conversations;

import java.time.LocalDateTime;

/**
 * One message. A deleted message keeps its place with a null body. originalBody is
 * only ever filled for an admin reading a report.
 */
public record ConversationMessageDTO(
        Long id,
        String senderType,
        String senderName,
        boolean mine,
        String body,
        boolean deleted,
        /** Contact details were hidden from what was typed. */
        boolean masked,
        String originalBody,
        LocalDateTime createdAt) {
}
