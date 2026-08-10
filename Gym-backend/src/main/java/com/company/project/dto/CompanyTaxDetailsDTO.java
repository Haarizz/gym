package com.company.project.dto;

import com.company.project.entities.CompanyTaxDetails;

public class CompanyTaxDetailsDTO {

    private String legalName;
    private String gstNumber;
    private String vatNumber;
    private String trn;
    private String address;

    public CompanyTaxDetailsDTO() {}

    public static CompanyTaxDetailsDTO fromEntity(CompanyTaxDetails d) {
        CompanyTaxDetailsDTO dto = new CompanyTaxDetailsDTO();
        dto.setLegalName(d.getLegalName());
        dto.setGstNumber(d.getGstNumber());
        dto.setVatNumber(d.getVatNumber());
        dto.setTrn(d.getTrn());
        dto.setAddress(d.getAddress());
        return dto;
    }

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
