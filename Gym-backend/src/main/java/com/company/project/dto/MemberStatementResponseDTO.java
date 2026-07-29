package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * A member's Statement of Account: every receipt billed/paid against them,
 * ordered oldest-first with a running balance. Minors never carry their own
 * receipts (their fees are folded into their guardian's bill — see
 * Member.isMinor) so their statement always comes back empty with
 * isMinor=true and familyHeadName set instead.
 */
public class MemberStatementResponseDTO {

    private String memberDbId;
    private String memberId;
    private String memberName;
    private String memberPhone;
    private Boolean isMinor;
    private Boolean billedToHead;
    private String familyHeadName;
    private BigDecimal openingBalance;
    private BigDecimal totalBilled;
    private BigDecimal totalPaid;
    private BigDecimal closingBalance;
    private List<StatementLineDTO> lines;

    public String getMemberDbId() { return memberDbId; }
    public void setMemberDbId(String memberDbId) { this.memberDbId = memberDbId; }

    public String getMemberId() { return memberId; }
    public void setMemberId(String memberId) { this.memberId = memberId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getMemberPhone() { return memberPhone; }
    public void setMemberPhone(String memberPhone) { this.memberPhone = memberPhone; }

    public Boolean getIsMinor() { return isMinor; }
    public void setIsMinor(Boolean isMinor) { this.isMinor = isMinor; }

    public Boolean getBilledToHead() { return billedToHead; }
    public void setBilledToHead(Boolean billedToHead) { this.billedToHead = billedToHead; }

    public String getFamilyHeadName() { return familyHeadName; }
    public void setFamilyHeadName(String familyHeadName) { this.familyHeadName = familyHeadName; }

    public BigDecimal getOpeningBalance() { return openingBalance; }
    public void setOpeningBalance(BigDecimal openingBalance) { this.openingBalance = openingBalance; }

    public BigDecimal getTotalBilled() { return totalBilled; }
    public void setTotalBilled(BigDecimal totalBilled) { this.totalBilled = totalBilled; }

    public BigDecimal getTotalPaid() { return totalPaid; }
    public void setTotalPaid(BigDecimal totalPaid) { this.totalPaid = totalPaid; }

    public BigDecimal getClosingBalance() { return closingBalance; }
    public void setClosingBalance(BigDecimal closingBalance) { this.closingBalance = closingBalance; }

    public List<StatementLineDTO> getLines() { return lines; }
    public void setLines(List<StatementLineDTO> lines) { this.lines = lines; }
}
