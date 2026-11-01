package com.company.project.dto.conversations;

/** The other side of a conversation. No phone or email: chat stays in the app. */
public record ParticipantDTO(Long id, String name, String role, String photoUrl, String memberCode) {
}
