package com.company.project.config;

import com.company.project.security.TenantContextHolder;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;

import javax.sql.DataSource;

/**
 * Resolves the current tenant (gym slug) from {@link TenantContextHolder} to pick a
 * target DataSource. Only constructed when tenant.routing.enabled=true (see
 * PrimaryDataSourceConfig.dataSource).
 *
 * Phase 5: real per-tenant databases now exist, so determineTargetDataSource is
 * overridden to consult TenantDataSourceRegistry (lazily built/cached per-tenant
 * DataSources, resolved from tenant_connections) for any slug other than the
 * configured default. A slug the registry has no connection for falls through to
 * this class's statically-configured target map (which — see PrimaryDataSourceConfig
 * — has exactly one entry: the default slug -> the primary DataSource), so a
 * not-yet-migrated tenant or GYMBIOS_ADMIN (a null lookup key, since it never
 * populates TenantContextHolder) still resolves to the primary DataSource exactly as
 * before this phase.
 *
 * The registry is held as an ObjectProvider, not resolved eagerly at construction:
 * this instance is built inside PrimaryDataSourceConfig.dataSource(), which is itself
 * on the critical path for building the primary EntityManagerFactory — eagerly
 * resolving TenantDataSourceRegistry there reaches back into the control-plane
 * EntityManagerFactory mid-construction and Spring correctly rejects it as an
 * unresolvable circular reference. Deferring resolution to first real use (i.e. the
 * first routed request) sidesteps this entirely, since by then the whole application
 * context has finished starting.
 */
public class TenantRoutingDataSource extends AbstractRoutingDataSource {

    private final ObjectProvider<TenantDataSourceRegistry> registryProvider;
    private final String defaultTenantSlug;

    public TenantRoutingDataSource(ObjectProvider<TenantDataSourceRegistry> registryProvider, String defaultTenantSlug) {
        this.registryProvider = registryProvider;
        this.defaultTenantSlug = defaultTenantSlug;
    }

    @Override
    protected Object determineCurrentLookupKey() {
        return TenantContextHolder.getCurrentTenant();
    }

    @Override
    protected DataSource determineTargetDataSource() {
        String tenantSlug = TenantContextHolder.getCurrentTenant();
        if (tenantSlug != null && !tenantSlug.equals(defaultTenantSlug)) {
            TenantDataSourceRegistry registry = registryProvider.getObject();
            if (registry.hasConnection(tenantSlug)) {
                return registry.getDataSource(tenantSlug);
            }
        }
        return super.determineTargetDataSource();
    }
}
