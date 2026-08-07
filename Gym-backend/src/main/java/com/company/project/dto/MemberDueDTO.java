package com.company.project.dto;

import java.math.BigDecimal;

/**
 * Represents a member with outstanding/upcoming payment.
 * Returned by GET /api/billing/dues
 */
public class MemberDueDTO {

    private Long id;           // member DB id
    private String memberId;   // MBR-XXXXXXXXXX
    private String memberName;
    private String memberEmail;
    private String memberPhone;
    private String membership; // plan name
    private BigDecimal amount; // outstanding balance or membership fee
    private String dueDate;    // ISO date string
    private int daysOverdue;   // 0 if not overdue
    private String lastPayment;// ISO date string or null
    private String status;     // "Overdue" | "Due Soon"
    private String dueType;    // "Membership Due" (unpaid balance on the current cycle) | "Renewal Due" (fully paid but the cycle is ending/ended)

    // Getters & Setters
    public Long getId()                              { return id; }
    public void setId(Long id)                       { this.id = id; }

    public String getMemberId()                      { return memberId; }
    public void setMemberId(String memberId)         { this.memberId = memberId; }

    public String getMemberName()                    { return memberName; }
    public void setMemberName(String memberName)     { this.memberName = memberName; }

    public String getMemberEmail()                   { return memberEmail; }
    public void setMemberEmail(String memberEmail)   { this.memberEmail = memberEmail; }

    public String getMemberPhone()                   { return memberPhone; }
    public void setMemberPhone(String memberPhone)   { this.memberPhone = memberPhone; }

    public String getMembership()                    { return membership; }
    public void setMembership(String membership)     { this.membership = membership; }

    public BigDecimal getAmount()                    { return amount; }
    public void setAmount(BigDecimal amount)         { this.amount = amount; }

    public String getDueDate()                       { return dueDate; }
    public void setDueDate(String dueDate)           { this.dueDate = dueDate; }

    public int getDaysOverdue()                      { return daysOverdue; }
    public void setDaysOverdue(int daysOverdue)      { this.daysOverdue = daysOverdue; }

    public String getLastPayment()                   { return lastPayment; }
    public void setLastPayment(String lastPayment)   { this.lastPayment = lastPayment; }

    public String getStatus()                        { return status; }
    public void setStatus(String status)             { this.status = status; }

    public String getDueType()                       { return dueType; }
    public void setDueType(String dueType)           { this.dueType = dueType; }
}
