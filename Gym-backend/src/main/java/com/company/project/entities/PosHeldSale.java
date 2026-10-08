package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;

/**
 * A parked (held) POS cart, recallable from any terminal of the branch. cartJson is the
 * terminal cart snapshot exactly as the cashier left it.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "pos_held_sales")
public class PosHeldSale extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "pos_session_id")
    private Long posSessionId;

    @Column(name = "hold_number", length = 50)
    private String holdNumber;

    @Column(name = "label")
    private String label;

    @Column(name = "member_id")
    private Long memberId;

    @Column(name = "member_name")
    private String memberName;

    @Column(name = "cart_json", columnDefinition = "TEXT", nullable = false)
    private String cartJson;

    @Column(name = "item_count", nullable = false)
    private Integer itemCount = 0;

    @Column(name = "total", precision = 12, scale = 2, nullable = false)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "held_by")
    private String heldBy;

    @Column(name = "terminal_name", length = 100)
    private String terminalName;

    public PosHeldSale() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public Long getPosSessionId() { return posSessionId; }
    public void setPosSessionId(Long posSessionId) { this.posSessionId = posSessionId; }

    public String getHoldNumber() { return holdNumber; }
    public void setHoldNumber(String holdNumber) { this.holdNumber = holdNumber; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getCartJson() { return cartJson; }
    public void setCartJson(String cartJson) { this.cartJson = cartJson; }

    public Integer getItemCount() { return itemCount; }
    public void setItemCount(Integer itemCount) { this.itemCount = itemCount; }

    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }

    public String getHeldBy() { return heldBy; }
    public void setHeldBy(String heldBy) { this.heldBy = heldBy; }

    public String getTerminalName() { return terminalName; }
    public void setTerminalName(String terminalName) { this.terminalName = terminalName; }
}
