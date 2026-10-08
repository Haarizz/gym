package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/**
 * A cash in / cash out category for the till (BillBull's PosCashMovementCategory). When it names a
 * ledger account, cash movements in it are posted against that account.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "pos_cash_movement_categories")
public class PosCashMovementCategory extends BaseEntity implements BranchAware {

    public static final String DROP_IN = "DROP_IN";
    public static final String CASH_OUT = "CASH_OUT";
    public static final String BOTH = "BOTH";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "code", length = 40, nullable = false)
    private String code;

    @Column(name = "name", length = 150, nullable = false)
    private String name;

    @Column(name = "description", length = 500)
    private String description;

    /** DROP_IN, CASH_OUT or BOTH. */
    @Column(name = "movement_type", length = 20, nullable = false)
    private String movementType = BOTH;

    @Column(name = "account_code", length = 30)
    private String accountCode;

    @Column(name = "account_name", length = 150)
    private String accountName;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    @Column(name = "notes_required", nullable = false)
    private Boolean notesRequired = false;

    @Column(name = "approval_required", nullable = false)
    private Boolean approvalRequired = false;

    @Column(name = "active", nullable = false)
    private Boolean active = true;

    public boolean appliesTo(String movementType) {
        return BOTH.equals(this.movementType) || this.movementType.equals(movementType);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    @Override public Long getBranchId() { return branchId; }
    @Override public void setBranchId(Long branchId) { this.branchId = branchId; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getMovementType() { return movementType; }
    public void setMovementType(String movementType) { this.movementType = movementType; }
    public String getAccountCode() { return accountCode; }
    public void setAccountCode(String accountCode) { this.accountCode = accountCode; }
    public String getAccountName() { return accountName; }
    public void setAccountName(String accountName) { this.accountName = accountName; }
    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
    public Boolean getNotesRequired() { return notesRequired; }
    public void setNotesRequired(Boolean notesRequired) { this.notesRequired = notesRequired; }
    public Boolean getApprovalRequired() { return approvalRequired; }
    public void setApprovalRequired(Boolean approvalRequired) { this.approvalRequired = approvalRequired; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
