package com.company.project.community.global.identity;

import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.repositories.TenantRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.List;
import java.util.Optional;

/**
 * Resolves a gym (tenant slug) to the database that holds its members, as an
 * explicit DataSource. Never touches TenantContextHolder, so a lookup can't
 * leak a tenant switch into the rest of the request.
 *
 * Mirrors TenantRoutingDataSource's own resolution: a tenant with a dedicated
 * connection uses it; otherwise the gym lives in the primary database.
 */
@Component
public class TenantDataSources {

    /** A gym's database, and whether it is the shared primary database. */
    public record TenantDb(String tenantSlug, DataSource dataSource, boolean primary) {}

    private final DataSource primaryDataSource;
    private final TenantDataSourceRegistry registry;
    private final TenantRepository tenantRepository;

    @Value("${tenant.routing.enabled:false}")
    private boolean tenantRoutingEnabled;

    public TenantDataSources(@Qualifier("primaryDataSource") DataSource primaryDataSource,
                             TenantDataSourceRegistry registry,
                             TenantRepository tenantRepository) {
        this.primaryDataSource = primaryDataSource;
        this.registry = registry;
        this.tenantRepository = tenantRepository;
    }

    public Optional<TenantDb> resolve(String tenantSlug) {
        if (tenantSlug == null || tenantSlug.isBlank()) {
            return Optional.empty();
        }
        if (tenantRoutingEnabled && registry.hasConnection(tenantSlug)) {
            return Optional.of(new TenantDb(tenantSlug, registry.getDataSource(tenantSlug), false));
        }
        Integer primaryGyms = new JdbcTemplate(primaryDataSource)
                .queryForObject("SELECT count(*) FROM gyms WHERE slug = ?", Integer.class, tenantSlug);
        return primaryGyms != null && primaryGyms == 1
                ? Optional.of(new TenantDb(tenantSlug, primaryDataSource, true))
                : Optional.empty();
    }

    /** The primary database's gym slug, only when it holds exactly one gym. */
    public Optional<String> singlePrimaryGymSlug() {
        List<String> slugs = new JdbcTemplate(primaryDataSource).queryForList("SELECT slug FROM gyms", String.class);
        return slugs.size() == 1 ? Optional.ofNullable(slugs.get(0)) : Optional.empty();
    }

    /** Display name for a gym: the control-plane tenant name, else the primary gyms row. */
    public Optional<String> gymName(String tenantSlug) {
        Optional<String> registered = tenantRepository.findBySlug(tenantSlug).map(t -> t.getName());
        if (registered.isPresent()) {
            return registered;
        }
        List<String> names = new JdbcTemplate(primaryDataSource)
                .queryForList("SELECT name FROM gyms WHERE slug = ?", String.class, tenantSlug);
        return names.size() == 1 ? Optional.ofNullable(names.get(0)) : Optional.empty();
    }
}
