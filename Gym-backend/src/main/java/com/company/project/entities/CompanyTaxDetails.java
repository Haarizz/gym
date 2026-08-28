package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/**
 * One row per branch of company tax registration details (GST/VAT/TRN +
 * legal identity), surfaced on receipts/invoices/reports — different
 * branches/legal entities can carry their own TRN. Was a single global
 * singleton (fixed id=1) before branch-scoping.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "company_tax_details")
public class CompanyTaxDetails extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    @Column(name = "legal_name")
    private String legalName;

    @Column(name = "gst_number")
    private String gstNumber;

    @Column(name = "vat_number")
    private String vatNumber;

    /** UAE Tax Registration Number. */
    @Column(name = "trn")
    private String trn;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    public CompanyTaxDetails() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLegalName() { return legalName; }
    public void setLegalName(String legalName) { this.legalName = legalName; }

    public String getGstNumber() { return gstNumber; }
    public void setGstNumber(String gstNumber) { this.gstNumber = gstNumber; }

    public String getVatNumber() { return vatNumber; }
    public void setVatNumber(String vatNumber) { this.vatNumber = vatNumber; }

    public String getTrn() { return trn; }
    public void setTrn(String trn) { this.trn = trn; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
}
