package com.company.project.dto.conversations;

import java.time.LocalDateTime;
import java.util.List;

/**
 * A chat report for the gym's admins. transcript is filled on the detail view only:
 * the whole conversation up to the moment of the report, deleted messages and the
 * unmasked text included.
 */
public record ConversationReportDTO(
        Long id,
        Long branchId,
        String branchName,
        Long conversationId,
        String memberName,
        String memberCode,
        /** "Front desk" for the shared inbox. */
        String staffName,
        String reportedByType,
        String reportedByName,
        String reason,
        String details,
        String status,
        String resolution,
        String resolutionNote,
        String resolvedBy,
        LocalDateTime resolvedAt,
        LocalDateTime createdAt,
        ConversationMessageDTO reportedMessage,
        boolean conversationBlocked,
        boolean memberChatBanned,
        List<ConversationMessageDTO> transcript) {
}
