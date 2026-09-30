package com.company.project.services;

import com.company.project.dto.GlobalSearchResponseDTO;
import com.company.project.dto.GlobalSearchResultDTO;
import com.company.project.entities.Expense;
import com.company.project.entities.Invoice;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipPlan;
import com.company.project.entities.PaymentVoucher;
import com.company.project.entities.Product;
import com.company.project.entities.Receipt;
import com.company.project.entities.Staff;
import com.company.project.entities.Supplier;
import com.company.project.security.BranchContextHolder;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Branch-scoped, permission-aware search across the main GymBios entities.
 * Every branch-aware query carries an explicit branch predicate taken from
 * {@link BranchContextHolder} (already validated by BranchContextFilter), on top
 * of the Hibernate branchFilter that BranchFilterAspect enables for this
 * transaction. A null active branch only occurs for owners/super-admins in
 * "All Branches" mode, which the existing filter already authorises.
 */
@Service
public class GlobalSearchService {

    public static final int MIN_QUERY_LENGTH = 2;
    private static final int MAX_QUERY_LENGTH = 100;
    private static final int PER_TYPE_LIMIT = 5;
    private static final Set<String> FINANCE_ROLES = Set.of("ROLE_MANAGER", "ROLE_ACCOUNTANT", "ROLE_ADMIN");

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional(readOnly = true)
    public GlobalSearchResponseDTO search(String rawQuery) {
        Set<String> authorities = currentAuthorities();
        // Members may send any X-Active-Branch-Id (see BranchContextFilter) and the
        // platform admin has no branch context at all, so neither may use search.
        if (authorities.contains("ROLE_MEMBER") || authorities.contains("ROLE_GYMBIOS_ADMIN")) {
            throw new AccessDeniedException("Global search is not available for this account");
        }

        Long branchId = BranchContextHolder.getActiveBranchId();
        String query = rawQuery == null ? "" : rawQuery.trim();
        if (query.length() > MAX_QUERY_LENGTH) {
            query = query.substring(0, MAX_QUERY_LENGTH);
        }
        List<GlobalSearchResultDTO> results = new ArrayList<>();
        if (query.length() < MIN_QUERY_LENGTH) {
            return new GlobalSearchResponseDTO(query, branchId, results);
        }

        SearchTerms t = new SearchTerms(query);
        boolean finance = authorities.stream().anyMatch(FINANCE_ROLES::contains);

        if (authorities.contains("MEMBERS_VIEW")) results.addAll(searchMembers(t, branchId));
        if (authorities.contains("STAFF_VIEW")) results.addAll(searchStaff(t, branchId));
        if (authorities.contains("MEMBERSHIP_PLANS_VIEW")) results.addAll(searchPlans(t, branchId));
        if (authorities.contains("BILLING_VIEW")) {
            results.addAll(searchInvoices(t, branchId));
            results.addAll(searchReceipts(t, branchId));
        }
        if (authorities.contains("PRODUCTS_VIEW")) results.addAll(searchProducts(t, branchId));
        if (authorities.contains("EXPENSES_VIEW") && finance) results.addAll(searchExpenses(t, branchId));
        if (authorities.contains("PAYMENT_VOUCHER_VIEW")) results.addAll(searchPaymentVouchers(t, branchId));
        if (authorities.contains("PURCHASE_ORDER_VIEW")) results.addAll(searchSuppliers(t, branchId));

        return new GlobalSearchResponseDTO(query, branchId, results);
    }

    private List<GlobalSearchResultDTO> searchMembers(SearchTerms t, Long branchId) {
        return run(Member.class, "Member",
                List.of("e.name", "e.memberId", "e.phone", "e.email"),
                "e.memberId", "e.name", null, branchId, t,
                m -> new GlobalSearchResultDTO("MEMBER", m.getId(), m.getName(),
                        join(m.getMemberId(), m.getPhone(), capitalize(m.getMembershipStatus())),
                        "/member-history-analytics", m.getName()));
    }

    private List<GlobalSearchResultDTO> searchStaff(SearchTerms t, Long branchId) {
        return run(Staff.class, "Staff",
                List.of("e.name", "e.staffId", "e.phone", "e.email"),
                "e.staffId", "e.name", null, branchId, t,
                s -> new GlobalSearchResultDTO("STAFF", s.getId(), s.getName(),
                        join(s.getStaffId(), s.getRole(), s.getPhone()),
                        "/staffs-trainers", s.getName()));
    }

    private List<GlobalSearchResultDTO> searchPlans(SearchTerms t, Long branchId) {
        return run(MembershipPlan.class, "MembershipPlan",
                List.of("e.name", "e.planType", "e.type"),
                null, "e.name", null, branchId, t,
                p -> new GlobalSearchResultDTO("MEMBERSHIP", p.getId(), p.getName(),
                        join(p.getDuration(), money(p.getPrice())),
                        "/manage-plans", p.getName()));
    }

    private List<GlobalSearchResultDTO> searchInvoices(SearchTerms t, Long branchId) {
        return run(Invoice.class, "Invoice",
                List.of("e.invoiceNumber", "e.memberName"),
                "e.invoiceNumber", "e.memberName", "e.totalAmount", branchId, t,
                i -> new GlobalSearchResultDTO("INVOICE", i.getId(), i.getInvoiceNumber(),
                        join(i.getMemberName(), money(i.getTotalAmount()), capitalize(i.getStatus())),
                        "/billing", i.getMemberName()));
    }

    private List<GlobalSearchResultDTO> searchReceipts(SearchTerms t, Long branchId) {
        return run(Receipt.class, "Receipt",
                List.of("e.receiptNo", "e.invoiceNo", "e.memberName", "e.memberPhone", "e.memberId"),
                "e.receiptNo", "e.memberName", "e.amount", branchId, t,
                r -> new GlobalSearchResultDTO("PAYMENT", r.getId(), r.getReceiptNo(),
                        join(r.getMemberName(), money(r.getAmount()), r.getPaymentMethod()),
                        "/member-receipts", r.getReceiptNo()));
    }

    private List<GlobalSearchResultDTO> searchProducts(SearchTerms t, Long branchId) {
        return run(Product.class, "Product",
                List.of("e.name", "e.sku", "e.barcode"),
                "e.sku", "e.name", null, branchId, t,
                p -> new GlobalSearchResultDTO("PRODUCT", p.getId(), p.getName(),
                        join(p.getSku(), money(p.getSellingPrice())),
                        "/products", p.getName()));
    }

    private List<GlobalSearchResultDTO> searchExpenses(SearchTerms t, Long branchId) {
        return run(Expense.class, "Expense",
                List.of("e.vendorName", "e.category", "e.notes"),
                null, "e.vendorName", "e.totalAmount", branchId, t,
                x -> new GlobalSearchResultDTO("EXPENSE", x.getId(),
                        x.getVendorName() != null ? x.getVendorName() : "Expense #" + x.getId(),
                        join(x.getCategory(), money(x.getTotalAmount()), x.getDate() != null ? x.getDate().toString() : null),
                        "/expenses", x.getVendorName()));
    }

    private List<GlobalSearchResultDTO> searchPaymentVouchers(SearchTerms t, Long branchId) {
        return run(PaymentVoucher.class, "PaymentVoucher",
                List.of("e.voucherNo", "e.supplierName", "e.billNo", "e.chequeNo", "e.description"),
                "e.voucherNo", "e.supplierName", "e.amount", branchId, t,
                v -> new GlobalSearchResultDTO("SUPPLIER_PAYMENT", v.getId(), v.getVoucherNo(),
                        join(v.getSupplierName(), money(v.getAmount()), v.getPaymentMethod(),
                                v.getPaymentDate() != null ? v.getPaymentDate().toString() : null),
                        "/payment-voucher", v.getVoucherNo()));
    }

    private List<GlobalSearchResultDTO> searchSuppliers(SearchTerms t, Long branchId) {
        return run(Supplier.class, "Supplier",
                List.of("e.name", "e.contactPerson", "e.phone", "e.email"),
                null, "e.name", null, branchId, t,
                s -> new GlobalSearchResultDTO("SUPPLIER", s.getId(), s.getName(),
                        join(s.getContactPerson(), s.getPhone()),
                        "/suppliers", s.getName()));
    }

    /**
     * Ranking: exact code, exact name, name prefix, code prefix, then any contains match.
     * The branch and amount clauses are appended only when present so Postgres never
     * sees an untyped null parameter.
     */
    private <T> List<GlobalSearchResultDTO> run(Class<T> type, String entity, List<String> fields,
                                                String codeField, String nameField, String amountField,
                                                Long branchId, SearchTerms t,
                                                Function<T, GlobalSearchResultDTO> mapper) {
        String contains = fields.stream()
                .map(f -> "LOWER(" + f + ") LIKE :contains ESCAPE '!'")
                .collect(Collectors.joining(" OR "));
        boolean withAmount = amountField != null && t.amount != null;
        if (withAmount) {
            contains += " OR " + amountField + " = :amount";
        }

        StringBuilder rank = new StringBuilder("CASE");
        if (codeField != null) rank.append(" WHEN LOWER(").append(codeField).append(") = :exact THEN 0");
        rank.append(" WHEN LOWER(").append(nameField).append(") = :exact THEN 1");
        rank.append(" WHEN LOWER(").append(nameField).append(") LIKE :prefix ESCAPE '!' THEN 2");
        if (codeField != null) rank.append(" WHEN LOWER(").append(codeField).append(") LIKE :prefix ESCAPE '!' THEN 3");
        rank.append(" ELSE 4 END");

        String jpql = "SELECT e FROM " + entity + " e WHERE (" + contains + ")"
                + (branchId != null ? " AND e.branchId = :branchId" : "")
                + " ORDER BY " + rank + ", e.id DESC";

        TypedQuery<T> q = entityManager.createQuery(jpql, type)
                .setParameter("contains", t.contains)
                .setParameter("prefix", t.prefix)
                .setParameter("exact", t.exact)
                .setMaxResults(PER_TYPE_LIMIT);
        if (branchId != null) q.setParameter("branchId", branchId);
        if (withAmount) q.setParameter("amount", t.amount);
        return q.getResultList().stream().map(mapper).collect(Collectors.toList());
    }

    private static Set<String> currentAuthorities() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return Set.of();
        return auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).collect(Collectors.toSet());
    }

    private static String join(String... parts) {
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (p == null || p.isBlank()) continue;
            if (sb.length() > 0) sb.append(" · ");
            sb.append(p);
        }
        return sb.toString();
    }

    private static String money(BigDecimal value) {
        return value == null ? null : value.stripTrailingZeros().toPlainString();
    }

    private static String capitalize(String s) {
        if (s == null || s.isBlank()) return null;
        String lower = s.toLowerCase(Locale.ROOT);
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }

    private static final class SearchTerms {
        final String exact;
        final String prefix;
        final String contains;
        final BigDecimal amount;

        SearchTerms(String query) {
            String lower = query.toLowerCase(Locale.ROOT);
            String escaped = lower.replace("!", "!!").replace("%", "!%").replace("_", "!_");
            this.exact = lower;
            this.prefix = escaped + "%";
            this.contains = "%" + escaped + "%";
            BigDecimal parsed = null;
            try {
                parsed = new BigDecimal(query.replace(",", ""));
            } catch (NumberFormatException ignored) {
                // not an amount search
            }
            this.amount = parsed;
        }
    }
}
