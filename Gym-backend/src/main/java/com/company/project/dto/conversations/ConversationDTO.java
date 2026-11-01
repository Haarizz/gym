package com.company.project.dto.conversations;

import java.time.LocalDateTime;

/**
 * One conversation as the caller sees it. A member gets {@code staff} (null for the
 * front desk); staff get {@code member}. canSend/cannotSendCode come from
 * ConversationPolicyService, so the app can explain a disabled composer up front.
 */
public record ConversationDTO(
        Long id,
        boolean frontDesk,
        ParticipantDTO member,
        ParticipantDTO staff,
        String startedBy,
        LocalDateTime lastMessageAt,
        String lastMessagePreview,
        String lastSender,
        int unread,
        boolean canSend,
        String cannotSendCode,
        String cannotSendMessage,
        /** Member view only: whether the other side is on shift now (null for staff). */
        Boolean recipientOnDuty,
        LocalDateTime mutedUntil,
        boolean blockedByMember,
        boolean blockedByAdmin) {
}
