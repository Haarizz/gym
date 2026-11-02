package com.company.project.dto.mobile.ledger;

import com.company.project.entities.SalaryAdvance;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Payloads of /api/mobile/{staff,trainer}/salary-advances. Field names are written
 * snake_case by the global Jackson naming strategy.
 */
public final class MobileSalaryAdvanceDTOs {

    private MobileSalaryAdvanceDTOs() {}

    /** Body of POST: the employee only says how much and why; the approver sets the plan. */
    public static class CreateRequest {
        private BigDecimal amount;
        private String reason;

        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public record Limits(
            BigDecimal baseSalary,
            BigDecimal outstanding,
            BigDecimal available,
            boolean hasPending,
            boolean canRequest,
            String reasonBlocked) {}

    public record Advance(
            Long id,
            LocalDate requestDate,
            BigDecimal requestedAmount,
            BigDecimal approvedAmount,
            String status,
            String remarks,
            Integer installmentCount,
            BigDecimal installmentAmount,
            LocalDate startMonth,
            LocalDate nextDeductionDate,
            BigDecimal totalDeducted,
            BigDecimal balance,
            LocalDate approvedDate,
            String rejectionNote,
            String requestedVia) {

        public static Advance from(SalaryAdvance a) {
            return new Advance(a.getId(), a.getRequestDate(), a.getRequestedAmount(), a.getApprovedAmount(),
                    a.getStatus(), a.getRemarks(), a.getInstallmentCount(), a.getInstallmentAmount(),
                    a.getStartMonth(), a.getNextDeductionDate(), a.getTotalDeducted(), a.getBalance(),
                    a.getApprovedDate(), a.getRejectionNote(),
                    a.getRequestedVia() != null ? a.getRequestedVia() : "web");
        }
    }

    public record Overview(Limits limits, List<Advance> advances) {}
}
