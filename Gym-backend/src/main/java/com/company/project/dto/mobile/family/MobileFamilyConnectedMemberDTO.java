package com.company.project.dto.mobile.family;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class MobileFamilyConnectedMemberDTO {

    @NotBlank
    @JsonProperty("name")
    private String name;

    @Email
    @JsonProperty("email")
    private String email;

    @JsonProperty("phone")
    private String phone;

    // "YYYY-MM-DD", optional — collected for minors, as on the web form
    @JsonProperty("dateOfBirth")
    private String dateOfBirth;

    // Adults under individual billing only: their own plan instead of the head's
    // (the web form's "Membership Plan (Optional)"). Null = share the head's plan.
    @JsonProperty("membershipPlanId")
    private Long membershipPlanId;

    @NotBlank
    @JsonProperty("relationship")
    private String relationship;

    @NotNull
    @JsonProperty("isMinor")
    private Boolean isMinor;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(String dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public Long getMembershipPlanId() {
        return membershipPlanId;
    }

    public void setMembershipPlanId(Long membershipPlanId) {
        this.membershipPlanId = membershipPlanId;
    }

    public String getRelationship() {
        return relationship;
    }

    public void setRelationship(String relationship) {
        this.relationship = relationship;
    }

    public Boolean getIsMinor() {
        return isMinor;
    }

    public void setIsMinor(Boolean minor) {
        isMinor = minor;
    }
}
