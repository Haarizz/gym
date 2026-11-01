package com.company.project.dto.conversations;

/** action: DISMISS | BLOCK_CONVERSATION | BAN_MEMBER. */
public record ResolveReportRequestDTO(String action, String note) {
}
