package com.company.project.dto;

/**
 * Represents a family member entry in the Add Member form.
 * Used when membership_type = "Family" to create linked member records.
 */
public class FamilyMemberDTO {

    private String name;
    private String relationship;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getRelationship() { return relationship; }
    public void setRelationship(String relationship) { this.relationship = relationship; }
}
