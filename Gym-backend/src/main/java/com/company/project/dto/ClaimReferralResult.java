package com.company.project.dto;

import com.company.project.entities.MobileReferralAttribution;

public record ClaimReferralResult(
    MobileReferralAttribution attribution,
    String tenantSlug
) {}
