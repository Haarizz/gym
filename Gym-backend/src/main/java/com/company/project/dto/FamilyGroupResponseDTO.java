package com.company.project.dto;

import java.util.List;

/**
 * A family head plus all family members (adults and minors) linked to them.
 * Family grouping here is for relationship management/reporting only — adults
 * in `members` each carry their own independent billing; minors are billed to
 * the head (see Member.isMinor).
 */
public class FamilyGroupResponseDTO {

    private MemberResponseDTO head;
    private List<MemberResponseDTO> members;

    public FamilyGroupResponseDTO() {}

    public FamilyGroupResponseDTO(MemberResponseDTO head, List<MemberResponseDTO> members) {
        this.head = head;
        this.members = members;
    }

    public MemberResponseDTO getHead() { return head; }
    public void setHead(MemberResponseDTO head) { this.head = head; }

    public List<MemberResponseDTO> getMembers() { return members; }
    public void setMembers(List<MemberResponseDTO> members) { this.members = members; }
}
