package com.company.project.services;

import com.company.project.entities.Attendance;
import com.company.project.entities.Expense;
import com.company.project.entities.FollowUp;
import com.company.project.entities.Lead;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipFreeze;
import com.company.project.entities.PaymentVoucher;
import com.company.project.entities.PurchaseOrder;
import com.company.project.entities.Receipt;
import com.company.project.entities.SaleTransaction;
import com.company.project.entities.SalesInvoice;
import com.company.project.entities.SupplierBill;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The queries behind each Day Report section. Each public method runs in its own
 * read-only transaction (the branch filter is enabled per transaction), so a section
 * that fails can't poison the queries of the sections after it.
 */
@Service
@Transactional(readOnly = true)
public class DayReportSections {

    @PersistenceContext
    private EntityManager em;

    // ── Sections ───────────────────────────────────────────────────────────────

    public List<Map<String, Object>> receipts(LocalDateTime start, LocalDateTime end) {
        List<Receipt> list = em.createQuery(
                        "SELECT r FROM Receipt r WHERE r.transactionDate >= :s AND r.transactionDate < :e ORDER BY r.transactionDate", Receipt.class)
                .setParameter("s", start).setParameter("e", end).getResultList();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Receipt r : list) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("receiptNo", r.getReceiptNo());
            m.put("invoiceNo", r.getInvoiceNo());
            m.put("time", r.getTransactionDate() != null ? r.getTransactionDate().toString() : null);
            m.put("memberName", r.getMemberName());
            m.put("memberId", r.getMemberId());
            m.put("type", r.getTransactionType());
            m.put("plan", r.getPlanName());
            m.put("amount", nz(r.getAmount()));
            m.put("paid", nz(r.getPaidAmount()));
            m.put("method", r.getPaymentMethod());
            m.put("status", r.getStatus());
            m.put("processedBy", r.getProcessedBy());
            rows.add(m);
        }
        return rows;
    }

    public List<Map<String, Object>> posSales(LocalDateTime start, LocalDateTime end) {
        List<SaleTransaction> list = em.createQuery(
                        "SELECT t FROM SaleTransaction t WHERE t.createdAt >= :s AND t.createdAt < :e ORDER BY t.createdAt", SaleTransaction.class)
                .setParameter("s", start).setParameter("e", end).getResultList();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (SaleTransaction t : list) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", t.getId());
            m.put("number", t.getTransactionNumber());
            m.put("time", t.getCreatedAt() != null ? t.getCreatedAt().toString() : null);
            m.put("customer", t.getMemberName());
            m.put("subtotal", nz(t.getSubtotal()));
            m.put("discount", nz(t.getDiscountAmount()));
            m.put("tax", nz(t.getTaxAmount()));
            m.put("total", nz(t.getTotalAmount()));
            m.put("method", t.getPaymentMethod());
            m.put("status", t.getStatus());
            rows.add(m);
        }
        return rows;
    }

    public List<Map<String, Object>> salesInvoices(LocalDate date) {
        List<SalesInvoice> list = em.createQuery(
                        "SELECT i FROM SalesInvoice i WHERE i.invoiceDate = :d ORDER BY i.id", SalesInvoice.class)
                .setParameter("d", date).getResultList();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (SalesInvoice i : list) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", i.getId());
            m.put("number", i.getInvoiceNumber());
            m.put("customer", i.getCustomerName());
            m.put("total", nz(i.getTotalAmount()));
            m.put("paid", nz(i.getAmountPaid()));
            m.put("method", i.getPaymentMethod());
            m.put("status", i.getStatus());
            rows.add(m);
        }
        return rows;
    }

    public List<Map<String, Object>> supplierBills(LocalDate date) {
        List<SupplierBill> list = em.createQuery(
                        "SELECT b FROM SupplierBill b WHERE b.billDate = :d ORDER BY b.id", SupplierBill.class)
                .setParameter("d", date).getResultList();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (SupplierBill b : list) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", b.getId());
            m.put("number", b.getBillNumber());
            m.put("supplierInvoice", b.getInvoiceNumber());
            m.put("supplier", b.getSupplierName());
            m.put("total", nz(b.getTotalAmount()));
            m.put("paid", nz(b.getAmountPaid()));
            m.put("status", b.getStatus());
            rows.add(m);
        }
        return rows;
    }

    public List<Map<String, Object>> purchaseOrders(LocalDateTime start, LocalDateTime end) {
        List<PurchaseOrder> list = em.createQuery(
                        "SELECT p FROM PurchaseOrder p WHERE p.orderDate >= :s AND p.orderDate < :e ORDER BY p.orderDate", PurchaseOrder.class)
                .setParameter("s", start).setParameter("e", end).getResultList();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (PurchaseOrder p : list) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("number", p.getPoNumber());
            m.put("supplier", p.getSupplierName());
            m.put("total", nz(p.getTotalAmount()));
            m.put("status", p.getStatus());
            m.put("time", p.getOrderDate() != null ? p.getOrderDate().toString() : null);
            rows.add(m);
        }
        return rows;
    }

    public List<Map<String, Object>> expenses(LocalDate date) {
        List<Expense> list = em.createQuery(
                        "SELECT x FROM Expense x WHERE x.date = :d ORDER BY x.id", Expense.class)
                .setParameter("d", date).getResultList();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Expense x : list) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", x.getId());
            m.put("vendor", x.getVendorName());
            m.put("category", x.getCategory());
            m.put("amount", nz(x.getTotalAmount()));
            m.put("status", x.getStatus());
            m.put("paymentStatus", x.getPaymentStatus());
            m.put("notes", x.getNotes());
            rows.add(m);
        }
        return rows;
    }

    public List<Map<String, Object>> paymentVouchers(LocalDate date) {
        List<PaymentVoucher> list = em.createQuery(
                        "SELECT v FROM PaymentVoucher v WHERE v.paymentDate = :d ORDER BY v.id", PaymentVoucher.class)
                .setParameter("d", date).getResultList();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (PaymentVoucher v : list) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", v.getId());
            m.put("number", v.getVoucherNo());
            m.put("payee", v.getSupplierName());
            m.put("billNo", v.getBillNo());
            m.put("amount", nz(v.getAmount()));
            m.put("method", v.getPaymentMethod());
            m.put("status", v.getStatus());
            rows.add(m);
        }
        return rows;
    }

    public Map<String, Object> membership(LocalDate date, LocalDateTime start, LocalDateTime end) {
        List<Member> joined = em.createQuery(
                        "SELECT m FROM Member m WHERE m.joinDate >= :s AND m.joinDate < :e ORDER BY m.joinDate", Member.class)
                .setParameter("s", start).setParameter("e", end).getResultList();
        List<Member> expired = em.createQuery(
                        "SELECT m FROM Member m WHERE (m.expiryDate >= :s AND m.expiryDate < :e) " +
                        "OR (m.expiryDate IS NULL AND m.membershipEndDate >= :s AND m.membershipEndDate < :e)", Member.class)
                .setParameter("s", start).setParameter("e", end).getResultList();
        Long renewals = em.createQuery(
                        "SELECT COUNT(r) FROM Receipt r WHERE r.transactionType = 'Renewal' AND r.transactionDate >= :s AND r.transactionDate < :e", Long.class)
                .setParameter("s", start).setParameter("e", end).getSingleResult();

        // Freezes have no branch of their own — keep the ones whose member is visible in this branch
        List<MembershipFreeze> freezeRows = em.createQuery(
                        "SELECT f FROM MembershipFreeze f WHERE (f.freezeStart >= :s AND f.freezeStart < :e) OR (f.endedAt >= :s AND f.endedAt < :e)",
                        MembershipFreeze.class)
                .setParameter("s", start).setParameter("e", end).getResultList();
        Set<Long> ids = new HashSet<>();
        freezeRows.forEach(f -> ids.add(f.getMemberDbId()));
        Map<Long, Member> members = new LinkedHashMap<>();
        if (!ids.isEmpty()) {
            em.createQuery("SELECT m FROM Member m WHERE m.id IN :ids", Member.class)
                    .setParameter("ids", ids).getResultList()
                    .forEach(m -> members.put(m.getId(), m));
        }
        List<Map<String, Object>> freezes = new ArrayList<>();
        for (MembershipFreeze f : freezeRows) {
            Member m = members.get(f.getMemberDbId());
            if (m == null) continue;
            boolean started = f.getFreezeStart() != null && !f.getFreezeStart().isBefore(start) && f.getFreezeStart().isBefore(end);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("memberName", m.getName());
            row.put("memberId", m.getMemberId());
            row.put("action", started ? "Freeze" : "Unfreeze");
            row.put("plannedEnd", f.getPlannedEnd() != null ? f.getPlannedEnd().toLocalDate().toString() : null);
            row.put("days", f.getRequestedDays());
            row.put("reason", f.getReason());
            freezes.add(row);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("newMembers", joined.stream().map(DayReportSections::memberRow).toList());
        out.put("expired", expired.stream().map(DayReportSections::memberRow).toList());
        out.put("renewals", renewals);
        out.put("freezes", freezes);
        return out;
    }

    public Map<String, Object> attendance(LocalDateTime start, LocalDateTime end) {
        List<Attendance> list = em.createQuery(
                        "SELECT a FROM Attendance a WHERE a.checkInTime >= :s AND a.checkInTime < :e", Attendance.class)
                .setParameter("s", start).setParameter("e", end).getResultList();
        int[] byHour = new int[24];
        int walkIns = 0;
        Set<Long> uniqueMembers = new HashSet<>();
        BigDecimal walkInAmount = BigDecimal.ZERO;
        for (Attendance a : list) {
            if (a.getCheckInTime() != null) byHour[a.getCheckInTime().getHour()]++;
            boolean walkIn = a.getMember() == null || "walk-in".equalsIgnoreCase(a.getType()) || "walkin".equalsIgnoreCase(a.getType());
            if (walkIn) {
                walkIns++;
                walkInAmount = walkInAmount.add(nz(a.getWalkInAmount()));
            } else {
                uniqueMembers.add(a.getMember().getId());
            }
        }
        List<Map<String, Object>> hours = new ArrayList<>();
        for (int h = 0; h < 24; h++) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("hour", h);
            m.put("checkIns", byHour[h]);
            hours.add(m);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("total", list.size());
        out.put("uniqueMembers", uniqueMembers.size());
        out.put("walkIns", walkIns);
        out.put("walkInAmount", walkInAmount);
        out.put("byHour", hours);
        return out;
    }

    public Map<String, Object> leads(LocalDateTime start, LocalDateTime end) {
        List<Lead> created = em.createQuery(
                        "SELECT l FROM Lead l WHERE l.createdAt >= :s AND l.createdAt < :e ORDER BY l.createdAt", Lead.class)
                .setParameter("s", start).setParameter("e", end).getResultList();
        Long followUpsDue = em.createQuery(
                        "SELECT COUNT(f) FROM FollowUp f WHERE f.dueDate >= :s AND f.dueDate < :e", Long.class)
                .setParameter("s", start).setParameter("e", end).getSingleResult();
        Long followUpsCompleted = em.createQuery(
                        "SELECT COUNT(f) FROM FollowUp f WHERE f.completedDate >= :s AND f.completedDate < :e", Long.class)
                .setParameter("s", start).setParameter("e", end).getSingleResult();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Lead l : created) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", l.getId());
            m.put("name", ((l.getFirstName() != null ? l.getFirstName() : "") + " " + (l.getLastName() != null ? l.getLastName() : "")).trim());
            m.put("source", l.getSource());
            m.put("status", l.getStatus());
            rows.add(m);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("created", rows);
        out.put("followUpsDue", followUpsDue);
        out.put("followUpsCompleted", followUpsCompleted);
        return out;
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private static Map<String, Object> memberRow(Member m) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", m.getId());
        row.put("memberId", m.getMemberId());
        row.put("name", m.getName());
        row.put("phone", m.getPhone());
        row.put("plan", m.getMembershipPlan());
        row.put("membershipType", m.getMembershipType());
        row.put("status", m.getMembershipStatus());
        return row;
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
