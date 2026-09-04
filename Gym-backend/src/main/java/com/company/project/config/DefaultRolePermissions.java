package com.company.project.config;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Single source of truth for each default role's starting permission-key set.
 * Extracted from DataInitializer's seedPermissionsAndRolePermissions() (which seeds
 * the shared primary database on every boot) so the exact same data can also be
 * used by TenantProvisioningService to seed a brand-new tenant database's
 * role_permissions on demand (Phase 3). DataInitializer still owns applying this
 * data to the primary DB; this class only owns what the data IS.
 *
 * Values here are the FINAL effective grant set per role — DataInitializer's
 * historical "backfill new sub-module permissions for existing installs" loops
 * (grantPermissionIfMissing) are already folded in, since a brand-new tenant
 * database has no pre-existing rows to backfill against; it only ever needs the
 * end state.
 */
public final class DefaultRolePermissions {

    private DefaultRolePermissions() {}

    // Roles protected from deletion regardless of whether their permission set has
    // been customized (SecurityConfig role-based rules and the staff-login default
    // role depend on these names existing). ADMIN (gym owners) is deliberately
    // excluded — it must stay editable/deletable per gym, unlike the platform-owner
    // GYMBIOS_ADMIN role.
    public static final List<String> SYSTEM_ROLE_NAMES = List.of(
            "GYMBIOS_ADMIN", "MANAGER", "USER", "ACCOUNTANT", "HR", "MEMBER", "STAFF"
    );

    public static final Map<String, List<String>> GRANTS = new LinkedHashMap<>();
    static {
        // GYMBIOS_ADMIN (platform owner) is scoped to Gym Management only.
        // RoleService.getEffectivePermissionKeys already enforces this as a fixed set
        // regardless of these stored rows; seeding them too keeps the Roles &
        // Permissions screen's display of this role accurate.
        GRANTS.put("GYMBIOS_ADMIN", List.of(
                "GYM_MANAGEMENT_VIEW", "GYM_MANAGEMENT_CREATE", "GYM_MANAGEMENT_EDIT", "GYM_MANAGEMENT_DELETE"
        ));

        // ADMIN (gym owner) gets every operational module except GYM_MANAGEMENT itself
        // (creating/managing other gyms stays platform-owner only). Each gym's owner is
        // scoped to their own gym's data via their branch assignments, not a
        // restricted permission set.
        GRANTS.put("ADMIN", PermissionCatalog.allKeys().stream()
                .filter(key -> !key.startsWith("GYM_MANAGEMENT_"))
                .collect(Collectors.toList()));

        List<String> managerGrants = new ArrayList<>(List.of(
                "DASHBOARD_VIEW",
                "MEMBERS_VIEW", "MEMBERS_CREATE", "MEMBERS_EDIT", "MEMBERS_EXPORT",
                "MEMBER_CONNECT_VIEW", "MEMBER_CONNECT_CREATE", "MEMBER_CONNECT_EDIT", "MEMBER_CONNECT_EXPORT",
                "PROMOTIONS_CAMPAIGN_VIEW", "PROMOTIONS_CAMPAIGN_CREATE", "PROMOTIONS_CAMPAIGN_EDIT", "PROMOTIONS_CAMPAIGN_EXPORT",
                "REFERRALS_VIEW", "REFERRALS_CREATE", "REFERRALS_EDIT", "REFERRALS_EXPORT",
                "LEADS_VIEW", "LEADS_CREATE", "LEADS_EDIT", "LEADS_EXPORT",
                "FOLLOW_UPS_VIEW", "FOLLOW_UPS_CREATE", "FOLLOW_UPS_EDIT", "FOLLOW_UPS_EXPORT",
                "MESSAGING_VIEW", "MESSAGING_CREATE", "MESSAGING_EDIT", "MESSAGING_EXPORT",
                "AUTOMATIONS_VIEW", "AUTOMATIONS_CREATE", "AUTOMATIONS_EDIT", "AUTOMATIONS_EXPORT",
                "POST_WORKOUT_CHECKIN_VIEW", "POST_WORKOUT_CHECKIN_CREATE", "POST_WORKOUT_CHECKIN_EDIT", "POST_WORKOUT_CHECKIN_EXPORT",
                "MEMBER_CONNECT_REPORTS_VIEW", "MEMBER_CONNECT_REPORTS_EXPORT",
                "MEMBER_CONNECT_ANALYTICS_VIEW", "MEMBER_CONNECT_ANALYTICS_EXPORT",
                "COMMUNITY_VIEW", "COMMUNITY_CREATE", "COMMUNITY_EDIT", "COMMUNITY_EXPORT",
                "ATTENDANCE_VIEW", "ATTENDANCE_CREATE", "ATTENDANCE_EDIT", "ATTENDANCE_EXPORT",
                "CHECK_IN_VIEW", "CHECK_IN_CREATE", "CHECK_IN_EDIT", "CHECK_IN_EXPORT",
                "TRAINING_STREAMS_VIEW", "TRAINING_STREAMS_CREATE", "TRAINING_STREAMS_EDIT", "TRAINING_STREAMS_EXPORT",
                "COMMUNITY_REPORTS_VIEW", "COMMUNITY_REPORTS_EXPORT",
                "COMMUNITY_ANALYTICS_VIEW", "COMMUNITY_ANALYTICS_EXPORT",
                "BILLING_VIEW", "BILLING_CREATE", "BILLING_EDIT", "BILLING_EXPORT",
                "PAYMENTS_VIEW", "PAYMENTS_CREATE", "PAYMENTS_EDIT", "PAYMENTS_EXPORT", "PAYMENTS_APPROVE",
                "MEMBERSHIP_PLANS_VIEW", "MEMBERSHIP_PLANS_CREATE", "MEMBERSHIP_PLANS_EDIT", "MEMBERSHIP_PLANS_EXPORT",
                "TRAINERS_VIEW", "TRAINERS_CREATE", "TRAINERS_EDIT", "TRAINERS_EXPORT",
                "STAFF_VIEW", "STAFF_CREATE", "STAFF_EDIT", "STAFF_DELETE", "STAFF_EXPORT",
                "TRAININGS_CLASSES_VIEW", "TRAININGS_CLASSES_CREATE", "TRAININGS_CLASSES_EDIT", "TRAININGS_CLASSES_EXPORT",
                "BOOKINGS_VIEW", "BOOKINGS_CREATE", "BOOKINGS_EDIT", "BOOKINGS_EXPORT",
                "SALARY_PAYMENTS_VIEW", "SALARY_PAYMENTS_CREATE", "SALARY_PAYMENTS_EDIT", "SALARY_PAYMENTS_EXPORT", "SALARY_PAYMENTS_APPROVE",
                "SALARY_ADVANCES_VIEW", "SALARY_ADVANCES_CREATE", "SALARY_ADVANCES_EDIT", "SALARY_ADVANCES_EXPORT", "SALARY_ADVANCES_APPROVE",
                "PAYROLL_REPORTS_VIEW", "PAYROLL_REPORTS_EXPORT",
                "PAYROLL_ANALYTICS_VIEW", "PAYROLL_ANALYTICS_EXPORT",
                "PAYROLL_VIEW", "PAYROLL_CREATE", "PAYROLL_EDIT", "PAYROLL_EXPORT", "PAYROLL_APPROVE",
                "REPORTS_VIEW", "REPORTS_EXPORT",
                "ASSETS_VIEW", "ASSETS_CREATE", "ASSETS_EDIT", "ASSETS_EXPORT",
                "SALES_PURCHASES_VIEW", "SALES_PURCHASES_CREATE", "SALES_PURCHASES_EDIT", "SALES_PURCHASES_EXPORT",
                "POINT_OF_SALE_VIEW", "POINT_OF_SALE_CREATE", "POINT_OF_SALE_EDIT", "POINT_OF_SALE_EXPORT",
                "PRODUCTS_VIEW", "PRODUCTS_CREATE", "PRODUCTS_EDIT", "PRODUCTS_EXPORT",
                "CATEGORY_VIEW", "CATEGORY_CREATE", "CATEGORY_EDIT", "CATEGORY_EXPORT",
                "PURCHASE_ORDER_VIEW", "PURCHASE_ORDER_CREATE", "PURCHASE_ORDER_EDIT", "PURCHASE_ORDER_EXPORT",
                "PURCHASE_VIEW", "PURCHASE_CREATE", "PURCHASE_EDIT", "PURCHASE_EXPORT",
                "WASTAGE_RETURNS_VIEW", "WASTAGE_RETURNS_CREATE", "WASTAGE_RETURNS_EDIT", "WASTAGE_RETURNS_EXPORT",
                "PRODUCTION_RECIPE_VIEW", "PRODUCTION_RECIPE_CREATE", "PRODUCTION_RECIPE_EDIT", "PRODUCTION_RECIPE_EXPORT",
                "SALES_REPORTS_VIEW", "SALES_REPORTS_EXPORT",
                "SALES_ANALYTICS_VIEW", "SALES_ANALYTICS_EXPORT",
                "FINANCIALS_VIEW", "FINANCIALS_CREATE", "FINANCIALS_EDIT", "FINANCIALS_EXPORT", "FINANCIALS_APPROVE",
                "LEDGERS_VIEW", "LEDGERS_CREATE", "LEDGERS_EDIT", "LEDGERS_EXPORT",
                "RECEIPT_VOUCHER_VIEW", "RECEIPT_VOUCHER_CREATE", "RECEIPT_VOUCHER_EDIT", "RECEIPT_VOUCHER_EXPORT",
                "JOURNAL_VOUCHER_VIEW", "JOURNAL_VOUCHER_CREATE", "JOURNAL_VOUCHER_EDIT", "JOURNAL_VOUCHER_EXPORT",
                "PAYMENT_VOUCHER_VIEW", "PAYMENT_VOUCHER_CREATE", "PAYMENT_VOUCHER_EDIT", "PAYMENT_VOUCHER_EXPORT", "PAYMENT_VOUCHER_APPROVE",
                "BANK_RECONCILIATIONS_VIEW", "BANK_RECONCILIATIONS_CREATE", "BANK_RECONCILIATIONS_EDIT", "BANK_RECONCILIATIONS_EXPORT",
                "EXPENSES_VIEW", "EXPENSES_CREATE", "EXPENSES_EDIT", "EXPENSES_EXPORT",
                "TAX_COMPLIANCE_VIEW", "TAX_COMPLIANCE_CREATE", "TAX_COMPLIANCE_EDIT", "TAX_COMPLIANCE_EXPORT",
                "FISCAL_PERIODS_VIEW", "FISCAL_PERIODS_CREATE", "FISCAL_PERIODS_EDIT", "FISCAL_PERIODS_EXPORT",
                "FINANCIAL_REPORTS_VIEW", "FINANCIAL_REPORTS_EXPORT",
                "FINANCIAL_ANALYTICS_VIEW", "FINANCIAL_ANALYTICS_EXPORT",
                "GYMOS_VIEW", "BIOS_VIEW",
                "SETTINGS_VIEW", "SETTINGS_EDIT",
                "ADMINISTRATION_VIEW"
        ));
        GRANTS.put("MANAGER", managerGrants);

        GRANTS.put("ACCOUNTANT", List.of(
                "DASHBOARD_VIEW",
                "BILLING_VIEW", "BILLING_CREATE", "BILLING_EDIT", "BILLING_EXPORT",
                "PAYMENTS_VIEW", "PAYMENTS_CREATE", "PAYMENTS_EDIT", "PAYMENTS_EXPORT",
                "FINANCIALS_VIEW", "FINANCIALS_CREATE", "FINANCIALS_EDIT", "FINANCIALS_EXPORT", "FINANCIALS_APPROVE",
                "LEDGERS_VIEW", "LEDGERS_CREATE", "LEDGERS_EDIT", "LEDGERS_EXPORT",
                "RECEIPT_VOUCHER_VIEW", "RECEIPT_VOUCHER_CREATE", "RECEIPT_VOUCHER_EDIT", "RECEIPT_VOUCHER_EXPORT",
                "JOURNAL_VOUCHER_VIEW", "JOURNAL_VOUCHER_CREATE", "JOURNAL_VOUCHER_EDIT", "JOURNAL_VOUCHER_EXPORT",
                "PAYMENT_VOUCHER_VIEW", "PAYMENT_VOUCHER_CREATE", "PAYMENT_VOUCHER_EDIT", "PAYMENT_VOUCHER_EXPORT", "PAYMENT_VOUCHER_APPROVE",
                "BANK_RECONCILIATIONS_VIEW", "BANK_RECONCILIATIONS_CREATE", "BANK_RECONCILIATIONS_EDIT", "BANK_RECONCILIATIONS_EXPORT",
                "EXPENSES_VIEW", "EXPENSES_CREATE", "EXPENSES_EDIT", "EXPENSES_EXPORT",
                "TAX_COMPLIANCE_VIEW", "TAX_COMPLIANCE_CREATE", "TAX_COMPLIANCE_EDIT", "TAX_COMPLIANCE_EXPORT",
                "FISCAL_PERIODS_VIEW", "FISCAL_PERIODS_CREATE", "FISCAL_PERIODS_EDIT", "FISCAL_PERIODS_EXPORT",
                "FINANCIAL_REPORTS_VIEW", "FINANCIAL_REPORTS_EXPORT",
                "FINANCIAL_ANALYTICS_VIEW", "FINANCIAL_ANALYTICS_EXPORT",
                "SALES_PURCHASES_VIEW",
                "SALES_REPORTS_VIEW", "SALES_REPORTS_EXPORT",
                "REPORTS_VIEW", "REPORTS_EXPORT"
        ));

        GRANTS.put("HR", List.of(
                "DASHBOARD_VIEW",
                "STAFF_VIEW", "STAFF_CREATE", "STAFF_EDIT", "STAFF_DELETE", "STAFF_EXPORT",
                "TRAININGS_CLASSES_VIEW", "TRAININGS_CLASSES_CREATE", "TRAININGS_CLASSES_EDIT", "TRAININGS_CLASSES_EXPORT",
                "PAYROLL_VIEW", "PAYROLL_CREATE", "PAYROLL_EDIT", "PAYROLL_EXPORT",
                "SALARY_PAYMENTS_VIEW", "SALARY_PAYMENTS_CREATE", "SALARY_PAYMENTS_EDIT", "SALARY_PAYMENTS_EXPORT",
                "SALARY_ADVANCES_VIEW", "SALARY_ADVANCES_CREATE", "SALARY_ADVANCES_EDIT", "SALARY_ADVANCES_EXPORT",
                "PAYROLL_REPORTS_VIEW", "PAYROLL_REPORTS_EXPORT",
                "PAYROLL_ANALYTICS_VIEW", "PAYROLL_ANALYTICS_EXPORT",
                "REPORTS_VIEW"
        ));

        // Matches the spec's worked example exactly.
        GRANTS.put("RECEPTIONIST", List.of(
                "DASHBOARD_VIEW",
                "MEMBERS_VIEW", "MEMBERS_CREATE", "MEMBERS_EDIT",
                "PAYMENTS_VIEW", "PAYMENTS_CREATE",
                "REPORTS_VIEW"
        ));

        GRANTS.put("TRAINER", List.of(
                "DASHBOARD_VIEW",
                "MEMBERS_VIEW",
                "ATTENDANCE_VIEW", "ATTENDANCE_CREATE",
                "CHECK_IN_VIEW", "CHECK_IN_CREATE"
        ));

        GRANTS.put("USER", List.of("DASHBOARD_VIEW"));
        GRANTS.put("MEMBER", List.of("DASHBOARD_VIEW"));
        GRANTS.put("STAFF", List.of("DASHBOARD_VIEW"));
    }
}
