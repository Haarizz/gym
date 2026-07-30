package com.company.project.dto;

import java.math.BigDecimal;

/**
 * One line item within a guardian's Receipt representing a minor family
 * member's fee that was folded into the guardian's bill instead of being
 * charged to the minor's own (nonexistent) financial account.
 */
public class MinorChargeDTO {

    private String memberId;
    private Long memberDbId;
    private String name;
    private BigDecimal amount;
    private Boolean paid;

    public MinorChargeDTO() {}

    public MinorChargeDTO(String memberId, Long memberDbId, String name, BigDecimal amount) {
        this.memberId = memberId;
        this.memberDbId = memberDbId;
        this.name = name;
        this.amount = amount;
    }

    public MinorChargeDTO(String memberId, Long memberDbId, String name, BigDecimal amount, Boolean paid) {
        this.memberId = memberId;
        this.memberDbId = memberDbId;
        this.name = name;
        this.amount = amount;
        this.paid = paid;
    }

    public String getMemberId() { return memberId; }
    public void setMemberId(String memberId) { this.memberId = memberId; }

    public Long getMemberDbId() { return memberDbId; }
    public void setMemberDbId(Long memberDbId) { this.memberDbId = memberDbId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public Boolean getPaid() { return paid; }
    public void setPaid(Boolean paid) { this.paid = paid; }
}
