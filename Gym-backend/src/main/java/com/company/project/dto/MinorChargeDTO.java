package com.company.project.dto;

import java.math.BigDecimal;
import java.util.Objects;

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

    // Value equality is required, not cosmetic: this is stored via a JPA
    // AttributeConverter, and Hibernate dirty-checks converted attributes with
    // equals(). With identity equality every loaded Receipt looked modified, so
    // any read-write transaction that merely read receipts issued a spurious
    // UPDATE on commit (rejected in All Branches mode by BranchSecurityListener).
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof MinorChargeDTO)) return false;
        MinorChargeDTO that = (MinorChargeDTO) o;
        return Objects.equals(memberId, that.memberId) &&
                Objects.equals(memberDbId, that.memberDbId) &&
                Objects.equals(name, that.name) &&
                Objects.equals(amount, that.amount) &&
                Objects.equals(paid, that.paid);
    }

    @Override
    public int hashCode() {
        return Objects.hash(memberId, memberDbId, name, amount, paid);
    }
}
