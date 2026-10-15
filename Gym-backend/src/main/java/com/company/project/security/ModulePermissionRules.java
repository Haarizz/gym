package com.company.project.security;

import com.company.project.config.PermissionCatalog;
import org.springframework.util.AntPathMatcher;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Maps every staff-facing /api route to the Roles & Permissions modules that govern
 * it, so a role's ticked boxes are enforced by the server, not only by the sidebar.
 *
 * <p>Action per request: GET = VIEW (EXPORT for an ".../export" path), PUT/PATCH = EDIT,
 * DELETE = DELETE, POST to the collection root (or .../bulk, .../duplicate) = CREATE,
 * any other POST = CREATE or EDIT; approve/reject paths need APPROVE where the module
 * has it. A request passes when the user holds that action on ANY of the rule's
 * modules (e.g. renewing from the Members page needs MEMBERS_EDIT, not BILLING_EDIT).
 *
 * <p>Reads are only gated where a rule lists {@code readModules}: lookups shared by
 * many pages (members, plans, products, account heads...) stay readable by any staff
 * user, otherwise pickers on unrelated pages would break. Routes with no rule, and
 * routes whose controllers already carry {@code @PreAuthorize} checks, pass through.
 *
 * <p>Rules are matched top to bottom, so specific sub-paths come before their parent.
 */
public final class ModulePermissionRules {

    private ModulePermissionRules() {}

    /** Outcome of evaluating one request. {@code required} is empty when nothing is needed. */
    public record Decision(boolean allowed, List<String> required, String description) {
        static Decision allow() { return new Decision(true, List.of(), null); }
    }

    private record Rule(String pattern, boolean skip, List<String> writeModules,
                        List<String> readModules, boolean anyWrite, List<String> fixedKeys) {}

    private static final AntPathMatcher MATCHER = new AntPathMatcher();
    private static final List<Rule> RULES = new ArrayList<>();

    private static final List<String> FINANCE = List.of(
            "FINANCIALS", "LEDGERS", "RECEIPT_VOUCHER", "JOURNAL_VOUCHER", "PAYMENT_VOUCHER",
            "BANK_RECONCILIATIONS", "EXPENSES", "TAX_COMPLIANCE", "FINANCIAL_REPORTS",
            "FINANCIAL_ANALYTICS", "FISCAL_PERIODS");
    private static final List<String> PAYROLL = List.of(
            "PAYROLL", "SALARY_PAYMENTS", "SALARY_ADVANCES", "PAYROLL_REPORTS", "PAYROLL_ANALYTICS");

    private static void skip(String pattern) {
        RULES.add(new Rule(pattern, true, List.of(), null, false, null));
    }

    private static void writes(String pattern, String... modules) {
        RULES.add(new Rule(pattern, false, List.of(modules), null, false, null));
    }

    private static void gated(String pattern, List<String> readModules, String... writeModules) {
        RULES.add(new Rule(pattern, false, List.of(writeModules), readModules, false, null));
    }

    /** Any write action (CREATE/EDIT/DELETE/MODERATE) on the modules allows any write. */
    private static void anyWrite(String pattern, String... modules) {
        RULES.add(new Rule(pattern, false, List.of(modules), null, true, null));
    }

    /** Every request, read or write, needs one of these exact keys. */
    private static void fixed(String pattern, String... keys) {
        RULES.add(new Rule(pattern, false, List.of(), null, false, List.of(keys)));
    }

    private static List<String> plus(List<String> base, String... extra) {
        List<String> out = new ArrayList<>(base);
        out.addAll(List.of(extra));
        return out;
    }

    static {
        // Open to every signed-in user, or already guarded per method with @PreAuthorize.
        skip("/api/auth/**");
        skip("/api/mobile/**");
        skip("/api/public/**");
        skip("/api/notifications/**");
        skip("/api/global-search/**");
        skip("/api/geocoding/**");
        skip("/api/dashboard/**");
        skip("/api/administration/**");
        skip("/api/branches/**");
        skip("/api/gyms/**");
        skip("/api/platform-leads/**");
        skip("/api/platform/**");
        skip("/api/gymos/**");
        skip("/api/lead-forms/**");
        skip("/api/staff/attendance/**");     // every staff member clocks themselves in/out
        skip("/api/bios/activity");           // page-usage ping
        // POS plumbing every till hits just by being open.
        skip("/api/pos/terminals/register");
        skip("/api/pos/terminals/*/heartbeat");
        skip("/api/pos/sessions/*/touch");
        skip("/api/pos/settings/verify-pin");
        skip("/api/pos/print-jobs/**");
        skip("/api/pos/audit-logs");
        skip("/api/pos/favorites/**");

        // Members & billing
        writes("/api/members/**", "MEMBERS");
        writes("/api/member-addons/**", "MEMBERS", "BILLING", "MEMBERSHIP_PLANS");
        writes("/api/addon-plans/**", "MEMBERSHIP_PLANS");
        writes("/api/plans/**", "MEMBERSHIP_PLANS");
        writes("/api/plan-groups/**", "MEMBERSHIP_PLANS");
        writes("/api/facilities/**", "MEMBERSHIP_PLANS", "SETTINGS");
        gated("/api/billing/**", plus(FINANCE, "BILLING", "PAYMENTS", "MEMBERS", "REPORTS"),
                "BILLING", "PAYMENTS", "MEMBERS");
        writes("/api/invoices/**", "BILLING", "PAYMENTS", "MEMBERS", "RECEIPT_VOUCHER", "FINANCIALS", "POINT_OF_SALE");
        writes("/api/receipts/**", "BILLING", "PAYMENTS", "MEMBERS", "RECEIPT_VOUCHER", "FINANCIALS", "POINT_OF_SALE");
        writes("/api/wallet/**", "MEMBERS", "BILLING", "PAYMENTS", "POINT_OF_SALE");
        writes("/api/coupons/**", "PROMOTIONS_CAMPAIGN", "MEMBERS", "BILLING", "POINT_OF_SALE");
        writes("/api/discount-codes/**", "PROMOTIONS_CAMPAIGN", "MEMBERS", "BILLING", "POINT_OF_SALE");

        // Member Connect
        writes("/api/promotions/*/redeem", "PROMOTIONS_CAMPAIGN", "MEMBERS", "BILLING", "POINT_OF_SALE");
        writes("/api/promotions/apply-access-days", "PROMOTIONS_CAMPAIGN", "MEMBERS", "BILLING");
        writes("/api/promotions/**", "PROMOTIONS_CAMPAIGN");
        writes("/api/referral-campaigns/**", "REFERRALS");
        writes("/api/referrals/**", "REFERRALS");
        writes("/api/reward-rules/**", "REFERRALS", "PROMOTIONS_CAMPAIGN");
        writes("/api/rewards/**", "REFERRALS", "PROMOTIONS_CAMPAIGN", "MEMBERS", "POINT_OF_SALE");
        writes("/api/leads/*/interactions", "LEADS", "FOLLOW_UPS");
        writes("/api/leads/interactions/**", "LEADS", "FOLLOW_UPS");
        writes("/api/leads/**", "LEADS");
        writes("/api/follow-ups/**", "FOLLOW_UPS", "LEADS");
        writes("/api/messaging/**", "MESSAGING", "MEMBER_CONNECT");
        writes("/api/automations/**", "AUTOMATIONS");
        writes("/api/workout-feedback/**", "POST_WORKOUT_CHECKIN");

        // Community, attendance, classes
        anyWrite("/api/community/**", "COMMUNITY");
        writes("/api/attendance/report-settings", "ATTENDANCE", "SETTINGS");
        writes("/api/attendance/**", "ATTENDANCE", "CHECK_IN");
        writes("/api/checkin/device-keys/**", "CHECK_IN", "SETTINGS");
        writes("/api/checkin/**", "CHECK_IN", "ATTENDANCE");
        writes("/api/training-streams/**", "TRAINING_STREAMS");
        writes("/api/sessions/**", "TRAININGS_CLASSES", "BOOKINGS");
        writes("/api/bookings/**", "BOOKINGS", "TRAININGS_CLASSES", "MEMBERS");

        // Staff & payroll
        writes("/api/staff/**", "STAFF");
        writes("/api/staff-targets/**", "STAFF", "PAYROLL");
        writes("/api/commission-rules/**", "STAFF", "PAYROLL", "SALARY_PAYMENTS");
        gated("/api/salary-payments/**", plus(PAYROLL, "STAFF"), "SALARY_PAYMENTS", "PAYROLL");
        gated("/api/salary-advances/**", PAYROLL, "SALARY_ADVANCES", "PAYROLL");
        gated("/api/payroll-analytics/**", plus(PAYROLL, "STAFF"), "PAYROLL");

        // Sales & purchases
        writes("/api/products/settings", "PRODUCTS", "SETTINGS");
        writes("/api/products/*/stock", "PRODUCTS", "PURCHASE");
        writes("/api/products/**", "PRODUCTS");
        writes("/api/product-categories/**", "CATEGORY", "PRODUCTS");
        writes("/api/product-brands/**", "CATEGORY", "PRODUCTS");
        writes("/api/warehouses/**", "PRODUCTS");
        writes("/api/suppliers/**", "PURCHASE_ORDER", "PURCHASE");
        writes("/api/purchase-orders/**", "PURCHASE_ORDER", "PURCHASE");
        writes("/api/supplier-bills/**", "PURCHASE", "PURCHASE_ORDER", "PAYMENT_VOUCHER");
        writes("/api/sales-invoices/**", "SALES_PURCHASES", "POINT_OF_SALE", "BILLING");
        writes("/api/wastage-returns/**", "WASTAGE_RETURNS");
        writes("/api/recipes/**", "PRODUCTION_RECIPE");
        writes("/api/production-orders/**", "PRODUCTION_RECIPE");
        writes("/api/print-templates/**", "SETTINGS", "POINT_OF_SALE", "SALES_PURCHASES", "PRODUCTS");
        anyWrite("/api/pos/**", "POINT_OF_SALE");

        // Financials
        writes("/api/tax-codes/**", "TAX_COMPLIANCE", "SETTINGS", "FINANCIALS", "PRODUCTS");
        writes("/api/tax-defaults/**", "TAX_COMPLIANCE", "SETTINGS", "FINANCIALS", "PRODUCTS");
        writes("/api/company-tax-details/**", "TAX_COMPLIANCE", "SETTINGS", "FINANCIALS");
        writes("/api/financial-settings/**", "SETTINGS", "FINANCIALS");
        writes("/api/account-heads/**", "LEDGERS", "FINANCIALS");
        gated("/api/cost-centers/**", FINANCE, "LEDGERS", "FINANCIALS");
        gated("/api/ledger-transactions/**", FINANCE, "LEDGERS", "FINANCIALS");
        gated("/api/journal-vouchers/**", FINANCE, "JOURNAL_VOUCHER", "FINANCIALS");
        gated("/api/payment-vouchers/**", FINANCE, "PAYMENT_VOUCHER", "FINANCIALS");
        gated("/api/receipt-vouchers/**", FINANCE, "RECEIPT_VOUCHER", "FINANCIALS");
        gated("/api/contra-vouchers/**", FINANCE, "JOURNAL_VOUCHER", "LEDGERS", "FINANCIALS");
        gated("/api/credit-notes/**", FINANCE, "JOURNAL_VOUCHER", "LEDGERS", "FINANCIALS");
        gated("/api/debit-notes/**", FINANCE, "JOURNAL_VOUCHER", "LEDGERS", "FINANCIALS");
        gated("/api/bank-reconciliations/**", FINANCE, "BANK_RECONCILIATIONS", "FINANCIALS");
        gated("/api/expenses/**", plus(FINANCE, "DASHBOARD", "BIOS", "REPORTS"), "EXPENSES", "FINANCIALS");
        gated("/api/tax-compliance/**", FINANCE, "TAX_COMPLIANCE", "FINANCIALS");
        gated("/api/financial-reports/**", plus(FINANCE, "REPORTS"), "FINANCIAL_REPORTS", "FINANCIALS");
        gated("/api/financial-audit-logs/**", FINANCE, "FINANCIALS");
        writes("/api/fiscal-periods/**", "FISCAL_PERIODS", "FINANCIALS");
        writes("/api/fiscal-years/**", "FISCAL_PERIODS", "FINANCIALS");

        // Other modules
        writes("/api/assets/**", "ASSETS");
        fixed("/api/bios/**", "BIOS_VIEW");
    }

    private static final Set<String> APPROVE_SEGMENTS = Set.of(
            "approve", "reject", "approve-payment", "reject-payment", "mark-approved");
    private static final Set<String> READ_LIKE_SEGMENTS = Set.of(
            "quote", "preview", "calculate", "validate", "search", "check");
    private static final Set<String> CREATE_SEGMENTS = Set.of("bulk", "duplicate");
    private static final List<String> WRITE_ACTIONS = List.of("CREATE", "EDIT", "DELETE", "MODERATE");

    /**
     * @param method       HTTP method
     * @param path         request URI without context path, e.g. "/api/members/12/renew"
     * @param authorities  the user's granted permission keys (extra ROLE_* entries are ignored)
     */
    public static Decision evaluate(String method, String path, Collection<String> authorities) {
        Rule rule = RULES.stream().filter(r -> MATCHER.match(r.pattern(), path)).findFirst().orElse(null);
        if (rule == null || rule.skip()) return Decision.allow();

        if (rule.fixedKeys() != null) {
            return check(rule.fixedKeys(), authorities, "access " + moduleLabel(rule.fixedKeys().get(0)));
        }

        String m = method.toUpperCase(Locale.ROOT);
        List<String> segments = segmentsAfterBase(rule.pattern(), path);
        String last = segments.isEmpty() ? "" : segments.get(segments.size() - 1);
        boolean isRead = m.equals("GET") || m.equals("HEAD")
                || (m.equals("POST") && READ_LIKE_SEGMENTS.contains(last));

        if (isRead) {
            if (rule.readModules() == null) return Decision.allow();
            boolean export = segments.stream().anyMatch(s -> s.contains("export"));
            List<String> keys = keysFor(rule.readModules(), export ? List.of("EXPORT", "VIEW") : List.of("VIEW"));
            return check(keys, authorities, (export ? "export " : "view ") + moduleLabel(rule.readModules().get(0)));
        }

        List<String> actions;
        String verb;
        if (rule.anyWrite()) {
            actions = WRITE_ACTIONS;
            verb = "make changes in";
        } else if (m.equals("DELETE") || last.equals("delete")) {
            actions = List.of("DELETE");
            verb = "delete in";
        } else if (m.equals("PUT") || m.equals("PATCH")) {
            actions = List.of("EDIT");
            verb = "edit";
        } else if (segments.stream().anyMatch(APPROVE_SEGMENTS::contains)
                && hasAction(rule.writeModules(), "APPROVE")) {
            actions = List.of("APPROVE");
            verb = "approve in";
        } else if ((segments.isEmpty() && rule.pattern().contains("*")) || CREATE_SEGMENTS.contains(last)) {
            // POST to a collection root creates; an exact action route (e.g.
            // /api/promotions/apply-access-days) falls through to CREATE-or-EDIT below.
            actions = List.of("CREATE");
            verb = "create in";
        } else {
            actions = List.of("CREATE", "EDIT");
            verb = "edit";
        }
        return check(keysFor(rule.writeModules(), actions), authorities,
                verb + " " + moduleLabel(rule.writeModules().get(0)));
    }

    private static Decision check(List<String> keys, Collection<String> authorities, String description) {
        for (String key : keys) {
            if (authorities.contains(key)) return Decision.allow();
        }
        return new Decision(false, keys, description);
    }

    /** Permission keys that exist in the catalog for these modules x actions. */
    private static List<String> keysFor(List<String> modules, List<String> actions) {
        Set<String> keys = new LinkedHashSet<>();
        for (String module : modules) {
            List<String> available = PermissionCatalog.MODULES.getOrDefault(module, List.of());
            for (String action : actions) {
                if (available.contains(action)) keys.add(PermissionCatalog.key(module, action));
            }
        }
        return new ArrayList<>(keys);
    }

    private static boolean hasAction(List<String> modules, String action) {
        return modules.stream().anyMatch(mod ->
                PermissionCatalog.MODULES.getOrDefault(mod, List.of()).contains(action));
    }

    /** Path segments after the rule's literal prefix, e.g. "/api/members/**" + "/api/members/5/renew" -> [5, renew]. */
    private static List<String> segmentsAfterBase(String pattern, String path) {
        int wildcard = pattern.indexOf('*');
        String base = wildcard >= 0 ? pattern.substring(0, wildcard) : pattern;
        if (base.endsWith("/")) base = base.substring(0, base.length() - 1);
        int baseDepth = base.split("/").length;
        String[] parts = path.split("/");
        List<String> out = new ArrayList<>();
        for (int i = baseDepth; i < parts.length; i++) {
            if (!parts[i].isEmpty()) out.add(parts[i].toLowerCase(Locale.ROOT));
        }
        return out;
    }

    private static String moduleLabel(String moduleOrKey) {
        String module = moduleOrKey.replaceAll("_(VIEW|CREATE|EDIT|DELETE|EXPORT|APPROVE|MODERATE)$", "");
        StringBuilder sb = new StringBuilder();
        for (String word : module.split("_")) {
            if (sb.length() > 0) sb.append(' ');
            sb.append(word.charAt(0)).append(word.substring(1).toLowerCase(Locale.ROOT));
        }
        return sb.toString();
    }
}
