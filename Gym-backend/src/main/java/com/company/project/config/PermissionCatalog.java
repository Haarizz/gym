package com.company.project.config;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Single source of truth for the Administration module's module x action
 * permission grid (spec: Dashboard, Members, Member Connect, Community,
 * Attendance, Billing, Payments, Membership Plans, Trainers, Staff, Payroll,
 * Reports, Assets, Settings, Administration). Drives both the seeded
 * `permissions` table rows (DataInitializer) and the catalog the frontend
 * matrix renders (PermissionController).
 */
public final class PermissionCatalog {

    private PermissionCatalog() {}

    public static final List<String> ACTIONS_FULL = List.of("VIEW", "CREATE", "EDIT", "DELETE", "EXPORT");
    public static final List<String> ACTIONS_FULL_APPROVE = List.of("VIEW", "CREATE", "EDIT", "DELETE", "EXPORT", "APPROVE");
    public static final List<String> ACTIONS_VIEW_ONLY = List.of("VIEW");
    public static final List<String> ACTIONS_VIEW_EXPORT = List.of("VIEW", "EXPORT");
    public static final List<String> ACTIONS_VIEW_EDIT = List.of("VIEW", "EDIT");
    public static final List<String> ACTIONS_ADMIN = List.of("VIEW", "CREATE", "EDIT", "DELETE");

    public static final Map<String, List<String>> MODULES = new LinkedHashMap<>();
    static {
        MODULES.put("DASHBOARD", ACTIONS_VIEW_ONLY);
        MODULES.put("COMMUNITY", ACTIONS_FULL);
        MODULES.put("MEMBERS", ACTIONS_FULL);
        MODULES.put("BILLING", ACTIONS_FULL);
        MODULES.put("MEMBERSHIP_PLANS", ACTIONS_FULL);
        MODULES.put("ATTENDANCE", ACTIONS_FULL);
        MODULES.put("CHECK_IN", ACTIONS_FULL);
        MODULES.put("TRAINING_STREAMS", ACTIONS_FULL);
        MODULES.put("COMMUNITY_REPORTS", ACTIONS_VIEW_EXPORT);
        MODULES.put("COMMUNITY_ANALYTICS", ACTIONS_VIEW_EXPORT);

        MODULES.put("MEMBER_CONNECT", ACTIONS_FULL);
        MODULES.put("PROMOTIONS_CAMPAIGN", ACTIONS_FULL);
        MODULES.put("REFERRALS", ACTIONS_FULL);
        MODULES.put("LEADS", ACTIONS_FULL);
        MODULES.put("FOLLOW_UPS", ACTIONS_FULL);
        MODULES.put("MESSAGING", ACTIONS_FULL);
        MODULES.put("AUTOMATIONS", ACTIONS_FULL);
        MODULES.put("POST_WORKOUT_CHECKIN", ACTIONS_FULL);
        MODULES.put("MEMBER_CONNECT_REPORTS", ACTIONS_VIEW_EXPORT);
        MODULES.put("MEMBER_CONNECT_ANALYTICS", ACTIONS_VIEW_EXPORT);

        MODULES.put("SALES_PURCHASES", ACTIONS_FULL);
        MODULES.put("POINT_OF_SALE", ACTIONS_FULL);
        MODULES.put("PRODUCTS", ACTIONS_FULL);
        MODULES.put("CATEGORY", ACTIONS_FULL);
        MODULES.put("PURCHASE_ORDER", ACTIONS_FULL);
        MODULES.put("PURCHASE", ACTIONS_FULL);
        MODULES.put("WASTAGE_RETURNS", ACTIONS_FULL);
        MODULES.put("PRODUCTION_RECIPE", ACTIONS_FULL);
        MODULES.put("SALES_REPORTS", ACTIONS_VIEW_EXPORT);
        MODULES.put("SALES_ANALYTICS", ACTIONS_VIEW_EXPORT);

        MODULES.put("FINANCIALS", ACTIONS_FULL_APPROVE);
        MODULES.put("LEDGERS", ACTIONS_FULL);
        MODULES.put("RECEIPT_VOUCHER", ACTIONS_FULL);
        MODULES.put("JOURNAL_VOUCHER", ACTIONS_FULL);
        MODULES.put("PAYMENT_VOUCHER", ACTIONS_FULL_APPROVE);
        MODULES.put("BANK_RECONCILIATIONS", ACTIONS_FULL);
        MODULES.put("EXPENSES", ACTIONS_FULL);
        MODULES.put("TAX_COMPLIANCE", ACTIONS_FULL);
        MODULES.put("FINANCIAL_REPORTS", ACTIONS_VIEW_EXPORT);
        MODULES.put("FINANCIAL_ANALYTICS", ACTIONS_VIEW_EXPORT);
        MODULES.put("FISCAL_PERIODS", ACTIONS_FULL);

        MODULES.put("PAYROLL", ACTIONS_FULL_APPROVE);
        MODULES.put("STAFF", ACTIONS_FULL);
        MODULES.put("TRAININGS_CLASSES", ACTIONS_FULL);
        MODULES.put("BOOKINGS", ACTIONS_FULL);
        MODULES.put("SALARY_PAYMENTS", ACTIONS_FULL_APPROVE);
        MODULES.put("SALARY_ADVANCES", ACTIONS_FULL_APPROVE);
        MODULES.put("PAYROLL_REPORTS", ACTIONS_VIEW_EXPORT);
        MODULES.put("PAYROLL_ANALYTICS", ACTIONS_VIEW_EXPORT);

        MODULES.put("TRAINERS", ACTIONS_FULL);
        MODULES.put("PAYMENTS", ACTIONS_FULL_APPROVE);
        MODULES.put("REPORTS", ACTIONS_VIEW_EXPORT);
        MODULES.put("ASSETS", ACTIONS_FULL);

        MODULES.put("GYMOS", ACTIONS_VIEW_ONLY);
        MODULES.put("BIOS", ACTIONS_VIEW_ONLY);
        MODULES.put("SETTINGS", ACTIONS_VIEW_EDIT);
        MODULES.put("BRANCH_MANAGEMENT", ACTIONS_ADMIN);
        MODULES.put("ADMINISTRATION", ACTIONS_ADMIN);
    }

    public static String key(String module, String action) {
        return module + "_" + action;
    }

    /** Every permission key in the catalog, e.g. "MEMBERS_VIEW", "PAYROLL_APPROVE". */
    public static List<String> allKeys() {
        return MODULES.entrySet().stream()
                .flatMap(e -> e.getValue().stream().map(action -> key(e.getKey(), action)))
                .toList();
    }
}
