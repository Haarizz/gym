package com.company.project.config;

import com.company.project.controlplane.entities.TenantConnection;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.TenantConnectionRepository;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.controlplane.service.CredentialEncryptionService;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.time.Duration;
import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lazily builds and caches a real Postgres DataSource per tenant slug, resolved from
 * the control-plane's tenant_connections table. This is the piece Phase 2's
 * TenantRoutingDataSource always assumed would exist eventually (see that class's own
 * doc comment) but was never built — until Phase 5, the routing DataSource's target
 * map had exactly one entry (the default slug -> the primary DataSource), so flipping
 * tenant.routing.enabled changed nothing about actual data isolation.
 *
 * A slug with no TenantConnection row, or a real connection failure, throws rather
 * than silently falling back to the primary DataSource — a silent fallback here would
 * be a cross-tenant data leak, not a graceful degradation.
 *
 * Phase 7: tenants provisioned/migrated from this phase onward get a real, dedicated
 * Postgres role that owns their own database, with its AES-encrypted password in
 * dbCredentialEnc (see resolvePassword/CredentialEncryptionService). Tenants from
 * before this phase still use the shared admin role — resolvePassword detects this
 * by comparing dbUsername against the configured admin username, since their
 * dbCredentialEnc is either empty or an old plaintext value that isn't valid AES-GCM
 * ciphertext.
 *
 * Phase 6: each cached pool is a real HikariDataSource, explicitly sized small
 * (maximumPoolSize=3, minimumIdle=0 — a single tenant's live traffic is low
 * relative to the primary DB), tracked with a last-access timestamp, and evicted
 * (closed, not merely dereferenced) by a periodic sweep once idle past IDLE_TTL.
 * Before this phase every tenant pool, once built, lived for the life of the JVM
 * with Hikari's bare default sizing (maximumPoolSize=10) — an unbounded resource
 * path as more gyms are onboarded, and a real connection leak on every app
 * shutdown/redeploy since these pools are plain fields, not Spring-managed beans
 * Boot would auto-close on its own.
 */
@Component
public class TenantDataSourceRegistry implements DisposableBean {

    private static final Logger log = LoggerFactory.getLogger(TenantDataSourceRegistry.class);

    private static final Duration IDLE_TTL = Duration.ofMinutes(30);

    // Immutable snapshot — a touch (see getDataSource) replaces the whole map entry
    // with a new CachedPool carrying an updated timestamp, rather than mutating this
    // record in place, keeping the eviction sweep's read lock-free.
    private record CachedPool(HikariDataSource dataSource, Instant lastAccessedAt) {}

    private final TenantRepository tenantRepository;
    private final TenantConnectionRepository tenantConnectionRepository;
    private final CredentialEncryptionService credentialEncryptionService;
    private final Map<String, CachedPool> cache = new ConcurrentHashMap<>();

    public TenantDataSourceRegistry(
            TenantRepository tenantRepository,
            TenantConnectionRepository tenantConnectionRepository,
            CredentialEncryptionService credentialEncryptionService) {
        this.tenantRepository = tenantRepository;
        this.tenantConnectionRepository = tenantConnectionRepository;
        this.credentialEncryptionService = credentialEncryptionService;
    }

    /** Returns the cached DataSource for this tenant slug, building and caching one on first use (or after eviction). */
    public DataSource getDataSource(String tenantSlug) {
        CachedPool existing = cache.get(tenantSlug);
        if (existing != null) {
            cache.put(tenantSlug, new CachedPool(existing.dataSource(), Instant.now()));
            return existing.dataSource();
        }
        return cache.computeIfAbsent(tenantSlug, slug -> new CachedPool(buildDataSource(slug), Instant.now())).dataSource();
    }

    /** True only if a real, resolvable tenant connection exists for this slug — used by callers deciding whether to route here at all vs. fall back to the default DataSource. */
    public boolean hasConnection(String tenantSlug) {
        if (cache.containsKey(tenantSlug)) {
            return true;
        }
        Tenant tenant = tenantRepository.findBySlug(tenantSlug).orElse(null);
        return tenant != null && tenantConnectionRepository.findByTenantId(tenant.getId()).isPresent();
    }

    /**
     * Closes and evicts every tenant pool idle past IDLE_TTL. Runs on the same
     * @Scheduled/@EnableScheduling mechanism already used by NotificationScheduler
     * (enabled once, globally, on GymApplication). A tenant evicted here simply gets
     * a fresh pool rebuilt transparently on its next request — no behavior change
     * for callers, only for how long an idle pool holds real Postgres connections
     * open.
     */
    @Scheduled(fixedDelay = 5, timeUnit = java.util.concurrent.TimeUnit.MINUTES)
    public void evictIdlePools() {
        Instant cutoff = Instant.now().minus(IDLE_TTL);
        Iterator<Map.Entry<String, CachedPool>> it = cache.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, CachedPool> entry = it.next();
            if (entry.getValue().lastAccessedAt().isBefore(cutoff)) {
                it.remove();
                closeQuietly(entry.getKey(), entry.getValue().dataSource());
            }
        }
    }

    /** Closes every still-cached pool on graceful application shutdown — these are plain fields, not Spring beans, so nothing else would ever close them. */
    @Override
    public void destroy() {
        cache.forEach((slug, pool) -> closeQuietly(slug, pool.dataSource()));
        cache.clear();
    }

    private void closeQuietly(String tenantSlug, HikariDataSource dataSource) {
        try {
            dataSource.close();
            log.info("Closed idle tenant connection pool for slug '{}'", tenantSlug);
        } catch (Exception e) {
            log.warn("Failed to cleanly close tenant connection pool for slug '{}'", tenantSlug, e);
        }
    }

    private HikariDataSource buildDataSource(String tenantSlug) {
        Tenant tenant = tenantRepository.findBySlug(tenantSlug)
                .orElseThrow(() -> new IllegalStateException("No control-plane Tenant found for slug '" + tenantSlug + "'"));
        TenantConnection connection = tenantConnectionRepository.findByTenantId(tenant.getId())
                .orElseThrow(() -> new IllegalStateException("No TenantConnection found for tenant slug '" + tenantSlug + "' — has it been provisioned/migrated yet?"));

        String url = "jdbc:postgresql://" + connection.getDbHost() + ":" + connection.getDbPort() + "/" + connection.getDbName();
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(url);
        config.setUsername(connection.getDbUsername());
        config.setPassword(resolvePassword(connection));
        config.setDriverClassName("org.postgresql.Driver");
        config.setMaximumPoolSize(3);
        config.setMinimumIdle(0);
        config.setPoolName("tenant-" + tenantSlug);
        return new HikariDataSource(config);
    }

    /**
     * Phase 7: real per-tenant Postgres roles now exist, with their real password
     * AES-encrypted in dbCredentialEnc (see CredentialEncryptionService/
     * TenantProvisioningService.storeConnection). But every tenant provisioned/
     * migrated BEFORE this phase still has dbUsername=<shared admin role> with
     * either an empty dbCredentialEnc (Test Gym, Phase 4) or the OLD plaintext
     * dead-data password from before encryption existed (Acme Fitness, Phase 3) —
     * confirmed live against both real rows in gymbios_control. Neither is valid
     * AES-GCM ciphertext, so this must detect "still on the shared admin role"
     * (dbUsername equals the configured admin username) and use the shared admin
     * password in that case, decrypting only for a real per-tenant role. This is a
     * genuine mixed-fleet condition, not a hypothetical one.
     */
    private String resolvePassword(TenantConnection connection) {
        if (adminUsername.equals(connection.getDbUsername())) {
            return adminPassword;
        }
        return credentialEncryptionService.decrypt(connection.getDbCredentialEnc());
    }

    @org.springframework.beans.factory.annotation.Value("${spring.datasource.username}")
    private String adminUsername;

    @org.springframework.beans.factory.annotation.Value("${spring.datasource.password}")
    private String adminPassword;
}
