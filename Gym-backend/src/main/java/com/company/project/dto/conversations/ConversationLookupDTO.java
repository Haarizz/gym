package com.company.project.dto.conversations;

/**
 * Before opening a chat: the existing conversation with that person (null if none yet),
 * and whether a new one may be started, with the refusal if not.
 */
public record ConversationLookupDTO(
        ConversationDTO conversation,
        boolean canStart,
        String cannotStartCode,
        String cannotStartMessage) {
}
