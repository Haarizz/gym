package com.company.project.services.referrals;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Builds the shareable referral link: {app.public-web-url}/ref/{code}. The web
 * frontend serves the public landing page at that path (PublicReferralPage), which
 * offers to open the mobile app with the code filled in.
 *
 * One deployment-wide setting (PUBLIC_WEB_URL) rather than the per-gym
 * ReferralSettings.linkDomain: a gym can't point a domain of its own at us, so that
 * setting only ever produced dead links. It's kept in the table but no longer read.
 */
@Component
public class ReferralLinkBuilder {

    private final String publicWebUrl;

    public ReferralLinkBuilder(@Value("${app.public-web-url}") String publicWebUrl) {
        String trimmed = publicWebUrl == null ? "" : publicWebUrl.trim();
        while (trimmed.endsWith("/")) trimmed = trimmed.substring(0, trimmed.length() - 1);
        this.publicWebUrl = trimmed;
    }

    public String link(String referralCode) {
        if (referralCode == null || referralCode.isBlank()) return null;
        return publicWebUrl + "/ref/" + URLEncoder.encode(referralCode.trim(), StandardCharsets.UTF_8);
    }
}
