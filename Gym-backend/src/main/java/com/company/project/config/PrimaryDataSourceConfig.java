package com.company.project.config;

import jakarta.persistence.EntityManagerFactory;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.Primary;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

/**
 * Phase 1 (control-plane groundwork) forced this into existence: Spring Boot's
 * DataSourceAutoConfiguration/JpaBaseConfiguration back off entirely - not just for
 * the bean names they'd otherwise pick - the instant ANY other javax.sql.DataSource
 * bean exists anywhere in the context (their @ConditionalOnMissingBean(DataSource.class)
 * guard trips regardless of bean name). Once ControlPlaneDataSourceConfig introduced
 * controlPlaneDataSource, the primary DataSource, EntityManagerFactory and
 * TransactionManager Boot used to auto-configure from spring.datasource and spring.jpa
 * properties stopped being created at all. This class replaces that auto-configuration
 * explicitly, using the exact same properties as before - zero behavior change, just
 * made explicit. Every bean here is @Primary so all existing unqualified injection
 * points (JpaRepository proxies, @PersistenceContext, etc.) keep resolving to this
 * persistence unit by default, exactly as before this phase.
 */
@Configuration
@EnableJpaRepositories(
        basePackages = "com.company.project.repositories",
        entityManagerFactoryRef = "entityManagerFactory",
        transactionManagerRef = "transactionManager"
)
public class PrimaryDataSourceConfig {

    @Value("${spring.datasource.url}")
    private String url;

    @Value("${spring.datasource.username}")
    private String username;

    @Value("${spring.datasource.password}")
    private String password;

    @Value("${spring.datasource.driver-class-name:org.postgresql.Driver}")
    private String driverClassName;

    @Value("${spring.flyway.enabled:true}")
    private boolean flywayEnabled;

    @Value("${spring.flyway.baseline-on-migrate:false}")
    private boolean flywayBaselineOnMigrate;

    @Value("${spring.flyway.baseline-version:0}")
    private String flywayBaselineVersion;

    @Value("${spring.jpa.hibernate.ddl-auto:none}")
    private String ddlAuto;

    @Value("${spring.jpa.show-sql:false}")
    private boolean showSql;

    @Value("${spring.jpa.properties.hibernate.format_sql:false}")
    private boolean formatSql;

    @Value("${tenant.routing.enabled:false}")
    private boolean tenantRoutingEnabled;

    @Value("${tenant.routing.default-tenant-slug:default}")
    private String defaultTenantSlug;

    // The actual Postgres connection pool. Always created — it is also the routing
    // wrapper's sole target and its default fallback (see dataSource() below).
    @Bean
    public DataSource primaryDataSource() {
        return DataSourceBuilder.create()
                .url(url)
                .username(username)
                .password(password)
                .driverClassName(driverClassName)
                .build();
    }

    // Bean name "dataSource" is preserved so entityManagerFactory()'s existing
    // @Qualifier("dataSource") is unaffected. Decided ONCE at startup, not per-request:
    // flag off (default) returns primaryDataSource completely unwrapped — zero
    // indirection, zero behavior change from before Phase 2. Flag on returns a
    // TenantRoutingDataSource whose statically-configured map still has exactly one
    // entry (defaultTenantSlug -> primaryDataSource, also the null-key fallback), but
    // whose determineTargetDataSource is overridden (see TenantRoutingDataSource) to
    // consult TenantDataSourceRegistry first for any other slug — this is what makes
    // routing to a tenant's real, dedicated database actually work as of Phase 5.
    //
    // TenantDataSourceRegistry is injected as an ObjectProvider, not resolved eagerly
    // here: this bean method itself is on the critical path for building
    // entityManagerFactory (primary), but the registry depends (transitively, via
    // TenantRepository) on controlPlaneEntityManagerFactory — resolving it eagerly at
    // dataSource() bean-creation time reaches back into JPA's shared
    // entityManagerFactoryBuilder mid-construction and Spring correctly refuses it as
    // an unresolvable circular reference. ObjectProvider defers that resolution to
    // first actual use inside TenantRoutingDataSource (i.e. the first real routed
    // request), by which point the whole context has finished starting.
    @Bean
    @Primary
    public DataSource dataSource(
            @Qualifier("primaryDataSource") DataSource primaryDataSource,
            org.springframework.beans.factory.ObjectProvider<TenantDataSourceRegistry> tenantDataSourceRegistryProvider) {
        if (!tenantRoutingEnabled) {
            return primaryDataSource;
        }
        TenantRoutingDataSource routingDataSource = new TenantRoutingDataSource(tenantDataSourceRegistryProvider, defaultTenantSlug);
        Map<Object, Object> targetDataSources = new HashMap<>();
        targetDataSources.put(defaultTenantSlug, primaryDataSource);
        routingDataSource.setTargetDataSources(targetDataSources);
        routingDataSource.setDefaultTargetDataSource(primaryDataSource);
        routingDataSource.afterPropertiesSet();
        return routingDataSource;
    }

    // Matches the previous auto-configured behavior exactly: Flyway (default locations
    // classpath:db/migration) runs against the primary DataSource before Hibernate opens
    // the EntityManagerFactory, gated by the same spring.flyway.enabled flag each profile
    // already sets (false in local, true elsewhere). Always runs against the raw physical
    // connection, never through routing indirection, regardless of the tenant-routing flag.
    @Bean
    @Primary
    public Flyway flyway(@Qualifier("primaryDataSource") DataSource primaryDataSource) {
        Flyway flyway = Flyway.configure()
                .dataSource(primaryDataSource)
                .baselineOnMigrate(flywayBaselineOnMigrate)
                .baselineVersion(flywayBaselineVersion)
                .load();
        if (flywayEnabled) {
            flyway.migrate();
        }
        return flyway;
    }

    @Bean
    @Primary
    @DependsOn("flyway")
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(
            EntityManagerFactoryBuilder builder, @Qualifier("dataSource") DataSource dataSource) {
        Map<String, Object> jpaProperties = new HashMap<>();
        jpaProperties.put("hibernate.hbm2ddl.auto", ddlAuto);
        jpaProperties.put("hibernate.show_sql", showSql);
        jpaProperties.put("hibernate.format_sql", formatSql);

        return builder
                .dataSource(dataSource)
                .packages("com.company.project.entities")
                .persistenceUnit("default")
                .properties(jpaProperties)
                .build();
    }

    // Takes the EntityManagerFactory PRODUCT (not the LocalContainerEntityManagerFactoryBean
    // FactoryBean) as a Spring-injected parameter. Injecting the FactoryBean type directly
    // and calling .getObject() on it can hand back null depending on initialization timing,
    // silently producing a JpaTransactionManager with no real EntityManagerFactory: it opens
    // no Hibernate transaction but still reports success, so repository writes are silently
    // discarded (save() no-ops with no error; saveAndFlush() throws "no transaction is in
    // progress"). Injecting EntityManagerFactory by type instead routes through the
    // FactoryBean correctly and guarantees the fully-initialized product.
    @Bean
    @Primary
    public PlatformTransactionManager transactionManager(
            @Qualifier("entityManagerFactory") EntityManagerFactory entityManagerFactory) {
        return new JpaTransactionManager(entityManagerFactory);
    }
}
