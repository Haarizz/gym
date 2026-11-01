package com.company.project.dto.conversations;

/**
 * The caller's own chat switch. Members: allowStaffChats (may staff start chats with me).
 * Staff: acceptsMemberMessages (may members start chats with me). The other is null.
 */
public record ChatSettingsDTO(Boolean allowStaffChats, Boolean acceptsMemberMessages) {
}
