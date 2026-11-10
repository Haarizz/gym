package com.company.project.dto;

import com.company.project.entities.MemberDueWriteOff;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Responses of Billing › Pending Payments (/api/billing/pending-payments). */
public final class PendingPaymentDTOs {

    private PendingPaymentDTOs() {}

    /** One open member bill: what was billed, what has come in, and what is still owed. */
    public record Due(
            Long receiptId, String receiptNo, String invoiceNo,
            Long memberDbId, String memberCode, String memberName, String memberPhone,
            String description, String remarks, LocalDateTime billDate, LocalDate dueDate,
            BigDecimal originalAmount, BigDecimal paidAmount, BigDecimal amountDue,
            boolean overdue, long daysOverdue) {}

    public record DuePage(List<Due> items, PaginationDTO pagination,
                          long allCount, long overdueCount, long upcomingCount) {}

    public record WriteOff(
            Long id, Long receiptId, String receiptNo, String invoiceNo,
            Long memberDbId, String memberCode, String memberName, String memberPhone,
            String billDescription, LocalDateTime billDate, LocalDateTime dueDate,
            BigDecimal originalAmount, BigDecimal paidAmount, BigDecimal writtenOffAmount,
            String reason, String notes, String writtenOffBy, LocalDateTime writtenOffAt) {

        public static WriteOff of(MemberDueWriteOff w) {
            return new WriteOff(w.getId(), w.getReceiptId(), w.getReceiptNo(), w.getInvoiceNo(),
                    w.getMemberDbId(), w.getMemberCode(), w.getMemberName(), w.getMemberPhone(),
                    w.getBillDescription(), w.getBillDate(), w.getDueDate(),
                    w.getOriginalAmount(), w.getPaidAmount(), w.getWrittenOffAmount(),
                    w.getReason(), w.getNotes(), w.getWrittenOffBy(), w.getWrittenOffAt());
        }
    }

    public record WriteOffPage(List<WriteOff> items, PaginationDTO pagination,
                               BigDecimal totalAmount, List<String> staff) {}

    /** Header cards. Written-off figures cover [from, to]; the due figures are always "now". */
    public record Stats(BigDecimal totalDue, long openCount,
                        BigDecimal overdueAmount, long overdueCount,
                        BigDecimal upcomingAmount, long upcomingCount,
                        BigDecimal writtenOffAmount, long writeOffCount) {}

    /** One line of a report breakdown (by reason, staff member, month or member). */
    public record Group(String key, String label, long count, BigDecimal amount) {}

    public record Report(LocalDate from, LocalDate to, BigDecimal totalAmount, long count,
                         List<Group> byReason, List<Group> byStaff, List<Group> byMonth, List<Group> byMember) {}
}
