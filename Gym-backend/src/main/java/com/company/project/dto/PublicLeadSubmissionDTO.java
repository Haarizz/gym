package com.company.project.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

/** Body of POST /api/public/lead-forms/{formKey}/submit. */
@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public class PublicLeadSubmissionDTO {

    private String fullName;
    private String phone;
    private String email;
    private String interest;
    private String preferredContactMethod;
    private String message;
    // Explicit "I agree to be contacted" tick — required.
    private Boolean consent;

    // Copied from the link's query string by the public page.
    private String utmSource;
    private String utmMedium;
    private String utmCampaign;
    private String utmContent;

    // Honeypot — hidden from humans, so any value means a bot.
    private String website;

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getInterest() { return interest; }
    public void setInterest(String interest) { this.interest = interest; }

    public String getPreferredContactMethod() { return preferredContactMethod; }
    public void setPreferredContactMethod(String preferredContactMethod) { this.preferredContactMethod = preferredContactMethod; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Boolean getConsent() { return consent; }
    public void setConsent(Boolean consent) { this.consent = consent; }

    public String getUtmSource() { return utmSource; }
    public void setUtmSource(String utmSource) { this.utmSource = utmSource; }

    public String getUtmMedium() { return utmMedium; }
    public void setUtmMedium(String utmMedium) { this.utmMedium = utmMedium; }

    public String getUtmCampaign() { return utmCampaign; }
    public void setUtmCampaign(String utmCampaign) { this.utmCampaign = utmCampaign; }

    public String getUtmContent() { return utmContent; }
    public void setUtmContent(String utmContent) { this.utmContent = utmContent; }

    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }
}
