package com.company.project.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class BankReconciliationRequestDTO {

    private String bankAccountName;
    private LocalDate statementDate;
    private BigDecimal openingBalance;
    private BigDecimal closingBalance;
    private BigDecimal systemBalance;
    private String notes;
    private List<BankStatementLineDTO> lines;

    public BankReconciliationRequestDTO() {}

    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }

    public LocalDate getStatementDate() { return statementDate; }
    public void setStatementDate(LocalDate statementDate) { this.statementDate = statementDate; }

    public BigDecimal getOpeningBalance() { return openingBalance; }
    public void setOpeningBalance(BigDecimal openingBalance) { this.openingBalance = openingBalance; }

    public BigDecimal getClosingBalance() { return closingBalance; }
    public void setClosingBalance(BigDecimal closingBalance) { this.closingBalance = closingBalance; }

    public BigDecimal getSystemBalance() { return systemBalance; }
    public void setSystemBalance(BigDecimal systemBalance) { this.systemBalance = systemBalance; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public List<BankStatementLineDTO> getLines() { return lines; }
    public void setLines(List<BankStatementLineDTO> lines) { this.lines = lines; }
}
