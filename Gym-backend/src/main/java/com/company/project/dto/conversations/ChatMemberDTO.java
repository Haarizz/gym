package com.company.project.dto.conversations;

/**
 * One member on the staff app's "start a chat" list: an active member of the branch
 * with an app login. conversationId is the caller's own thread with them, if any;
 * canStart/cannotStartCode explain a disabled row up front.
 */
public record ChatMemberDTO(
        Long id,
        String name,
        String photoUrl,
        String memberCode,
        Long conversationId,
        int unread,
        boolean canStart,
        String cannotStartCode,
        String cannotStartMessage) {
}
