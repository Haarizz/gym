package com.company.project.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;

/**
 * One terms set a member accepted before a payment, with a copy of the wording at the
 * time (V135). created_by is the staff login that took the payment.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "payment_terms_acceptances")
public class PaymentTermsAcceptance extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "payment_kind", nullable = false, length = 40)
    private String paymentKind;

    @Column(name = "member_db_id")
    private Long memberDbId;

    @Column(name = "member_name")
    private String memberName;

    @Column(precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "terms_id")
    private Long termsId;

    @Column(name = "terms_title", nullable = false, length = 150)
    private String termsTitle;

    @Column(name = "terms_version", nullable = false)
    private int termsVersion = 1;

    @Column(name = "terms_content", nullable = false, columnDefinition = "TEXT")
    private String termsContent;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override public Long getBranchId() { return branchId; }
    @Override public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getPaymentKind() { return paymentKind; }
    public void setPaymentKind(String paymentKind) { this.paymentKind = paymentKind; }

    public Long getMemberDbId() { return memberDbId; }
    public void setMemberDbId(Long memberDbId) { this.memberDbId = memberDbId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public Long getTermsId() { return termsId; }
    public void setTermsId(Long termsId) { this.termsId = termsId; }

    public String getTermsTitle() { return termsTitle; }
    public void setTermsTitle(String termsTitle) { this.termsTitle = termsTitle; }

    public int getTermsVersion() { return termsVersion; }
    public void setTermsVersion(int termsVersion) { this.termsVersion = termsVersion; }

    public String getTermsContent() { return termsContent; }
    public void setTermsContent(String termsContent) { this.termsContent = termsContent; }
}
