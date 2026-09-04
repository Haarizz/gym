package com.company.project.security;

/**
 * ThreadLocal holder for the active tenant (gym slug) context.
 * Set by {@link TenantContextFilter} on each request from the JWT's tenant
 * claim, and cleared after the request completes.
 *
 * A {@code null} value means no tenant is active (e.g. GYMBIOS_ADMIN requests,
 * or tenant routing is disabled) — {@link com.company.project.config.TenantRoutingDataSource}
 * falls back to its default target DataSource in that case.
 */
public final class TenantContextHolder {

    private static final ThreadLocal<String> CURRENT_TENANT = new ThreadLocal<>();

    private TenantContextHolder() {}

    public static void setCurrentTenant(String tenantSlug) {
        CURRENT_TENANT.set(tenantSlug);
    }

    public static String getCurrentTenant() {
        return CURRENT_TENANT.get();
    }

    /** Must be called after every request to prevent thread-pool leaks. */
    public static void clear() {
        CURRENT_TENANT.remove();
    }
}
