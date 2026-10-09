package com.company.project.dto.mobile.profile;

/**
 * A gym (tenant) whose members table holds a row linked to the caller's app account,
 * and whether that membership is currently active (see GlobalMembershipService).
 */
public record MobileLinkedGymDTO(String tenantSlug, boolean active) {
}
