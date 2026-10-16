package com.company.project.security;

import com.company.project.config.DefaultRolePermissions;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ModulePermissionRulesTest {

    private static boolean allowed(String method, String path, String... keys) {
        return ModulePermissionRules.evaluate(method, path, Set.of(keys)).allowed();
    }

    @Test
    void writesNeedTheMatchingAction() {
        assertTrue(allowed("POST", "/api/members", "MEMBERS_CREATE"));
        assertFalse(allowed("POST", "/api/members", "MEMBERS_VIEW", "MEMBERS_EDIT"));
        assertTrue(allowed("PUT", "/api/members/7", "MEMBERS_EDIT"));
        assertFalse(allowed("PUT", "/api/members/7", "MEMBERS_CREATE"));
        assertTrue(allowed("DELETE", "/api/members/7", "MEMBERS_DELETE"));
        assertFalse(allowed("DELETE", "/api/members/7", "MEMBERS_EDIT"));
        // Action sub-routes accept CREATE or EDIT.
        assertTrue(allowed("POST", "/api/members/7/renew", "MEMBERS_EDIT"));
        assertTrue(allowed("POST", "/api/members/7/renew", "MEMBERS_CREATE"));
        assertFalse(allowed("POST", "/api/members/7/renew", "MEMBERS_VIEW"));
    }

    @Test
    void approvalsNeedApproveWhereTheModuleHasIt() {
        assertTrue(allowed("POST", "/api/members/7/approve-payment", "MEMBERS_APPROVE"));
        assertFalse(allowed("POST", "/api/members/7/approve-payment", "MEMBERS_EDIT"));
        assertTrue(allowed("POST", "/api/salary-advances/3/approve", "SALARY_ADVANCES_APPROVE"));
        // Wastage returns has no APPROVE action, so EDIT is enough.
        assertTrue(allowed("POST", "/api/wastage-returns/3/approve", "WASTAGE_RETURNS_EDIT"));
        // Bookings approvals come from the Approvals page (MEMBERS_APPROVE).
        assertTrue(allowed("POST", "/api/bookings/3/approve-payment", "MEMBERS_APPROVE"));
    }

    @Test
    void lookupsStayReadableButSensitiveReadsAreGated() {
        assertTrue(allowed("GET", "/api/members", "DASHBOARD_VIEW"));
        assertTrue(allowed("GET", "/api/account-heads", "DASHBOARD_VIEW"));
        assertFalse(allowed("GET", "/api/journal-vouchers", "DASHBOARD_VIEW", "MEMBERS_VIEW"));
        assertTrue(allowed("GET", "/api/journal-vouchers", "LEDGERS_VIEW"));
        assertFalse(allowed("GET", "/api/salary-payments", "MEMBERS_VIEW"));
        assertTrue(allowed("GET", "/api/salary-payments", "SALARY_PAYMENTS_VIEW"));
        assertFalse(allowed("GET", "/api/bios/overview", "DASHBOARD_VIEW"));
        assertTrue(allowed("GET", "/api/bios/overview", "BIOS_VIEW"));
        // Billing statement shown inside a member's profile.
        assertTrue(allowed("GET", "/api/billing/member/5/statement", "MEMBERS_VIEW"));
    }

    @Test
    void workforceRoutesAreGated() {
        // Shifts & Schedules belong to Staff.
        assertTrue(allowed("POST", "/api/shifts", "STAFF_CREATE"));
        assertTrue(allowed("POST", "/api/shifts/assign", "STAFF_EDIT"));
        assertFalse(allowed("POST", "/api/shifts/assign", "STAFF_VIEW"));
        // Staff attendance management: readable by staff or payroll, corrections approved by payroll approvers.
        assertTrue(allowed("GET", "/api/staff-attendance/daily", "STAFF_VIEW"));
        assertFalse(allowed("GET", "/api/staff-attendance/daily", "MEMBERS_VIEW"));
        assertTrue(allowed("POST", "/api/staff-attendance/corrections", "STAFF_EDIT"));
        assertFalse(allowed("POST", "/api/staff-attendance/corrections/4/approve", "STAFF_EDIT"));
        assertTrue(allowed("POST", "/api/staff-attendance/corrections/4/approve", "PAYROLL_APPROVE"));
        // Payroll runs, deductions and commission payouts.
        assertFalse(allowed("GET", "/api/payroll/runs", "STAFF_VIEW"));
        assertTrue(allowed("GET", "/api/payroll/runs", "PAYROLL_VIEW"));
        assertFalse(allowed("POST", "/api/payroll/runs/1/approve", "PAYROLL_EDIT"));
        assertTrue(allowed("POST", "/api/payroll/runs/1/approve", "PAYROLL_APPROVE"));
        assertTrue(allowed("POST", "/api/deductions/2/approve", "SALARY_ADVANCES_APPROVE"));
        assertFalse(allowed("POST", "/api/deductions", "STAFF_CREATE"));
        assertTrue(allowed("POST", "/api/commission-earnings/bulk/approve", "PAYROLL_APPROVE"));
        assertFalse(allowed("POST", "/api/commission-earnings/approve", "STAFF_EDIT"));
        assertTrue(allowed("POST", "/api/commission-earnings/pay", "STAFF_EDIT"));
    }

    @Test
    void specificSubRoutesWinOverTheirParent() {
        // Redeeming a promotion during a member renewal is not "managing promotions".
        assertTrue(allowed("POST", "/api/promotions/9/redeem", "MEMBERS_EDIT"));
        assertTrue(allowed("POST", "/api/promotions/apply-access-days", "MEMBERS_EDIT"));
        assertFalse(allowed("POST", "/api/promotions", "MEMBERS_EDIT", "MEMBERS_CREATE"));
        assertTrue(allowed("POST", "/api/promotions", "PROMOTIONS_CAMPAIGN_CREATE"));
        // Read-like POST.
        assertTrue(allowed("POST", "/api/members/4/family-plan-change/quote", "MEMBERS_VIEW"));
    }

    @Test
    void openAndSelfServiceRoutesPass() {
        assertTrue(allowed("POST", "/api/staff/attendance/clock-in"));
        assertTrue(allowed("PUT", "/api/notifications/read-all"));
        assertTrue(allowed("POST", "/api/pos/terminals/register"));
        assertTrue(allowed("POST", "/api/auth/change-password"));
        assertTrue(allowed("GET", "/api/some-future-endpoint"));
    }

    @Test
    void posAndCommunityAcceptAnyWriteAction() {
        assertTrue(allowed("POST", "/api/pos/transactions", "POINT_OF_SALE_CREATE"));
        assertFalse(allowed("POST", "/api/pos/transactions", "POINT_OF_SALE_VIEW"));
        assertTrue(allowed("POST", "/api/community/posts/4/delete", "COMMUNITY_MODERATE"));
    }

    @Test
    void deniedDecisionExplainsWhatIsMissing() {
        ModulePermissionRules.Decision d = ModulePermissionRules.evaluate("DELETE", "/api/members/1", Set.of());
        assertFalse(d.allowed());
        assertEquals(List.of("MEMBERS_DELETE"), d.required());
        assertEquals("delete in Members", d.description());
    }

    @Test
    void defaultRolesKeepTheirEverydayFlows() {
        Set<String> receptionist = Set.copyOf(DefaultRolePermissions.GRANTS.get("RECEPTIONIST"));
        assertTrue(ModulePermissionRules.evaluate("POST", "/api/members", receptionist).allowed());
        assertTrue(ModulePermissionRules.evaluate("POST", "/api/billing/settle", receptionist).allowed());
        assertTrue(ModulePermissionRules.evaluate("POST", "/api/receipts", receptionist).allowed());
        assertFalse(ModulePermissionRules.evaluate("DELETE", "/api/members/1", receptionist).allowed());
        assertFalse(ModulePermissionRules.evaluate("POST", "/api/expenses", receptionist).allowed());

        Set<String> owner = Set.copyOf(DefaultRolePermissions.GRANTS.get("ADMIN"));
        for (String path : List.of("/api/members/1", "/api/expenses/1", "/api/salary-payments/1", "/api/journal-vouchers/1")) {
            assertTrue(ModulePermissionRules.evaluate("DELETE", path, owner).allowed(), path);
            assertTrue(ModulePermissionRules.evaluate("GET", path, owner).allowed(), path);
        }
    }
}
