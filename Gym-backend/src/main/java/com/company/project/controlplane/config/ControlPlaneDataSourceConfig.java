package com.company.project.controlplane.config;

import jakarta.persistence.EntityManagerFactory;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

/**
 * Phase 1 control-plane persistence unit: a second, always-on Postgres database
 * (control-plane.datasource.*) that will eventually hold the tenant registry.
 * Completely isolated from the primary DataSource/EntityManagerFactory/
 * TransactionManager — nothing in this class is wired into any existing
 * service/controller. Bean names are distinct from Spring Boot's auto-configured
 * primary bean names ("dataSource", "entityManagerFactory", "transactionManager")
 * so both persistence units coexist without @Primary disambiguation anywhere.
 */
@Configuration
@EnableJpaRepositories(
        basePackages = "com.company.project.controlplane.repositories",
        entityManagerFactoryRef = "controlPlaneEntityManagerFactory",
        transactionManagerRef = "controlPlaneTransactionManager"
)
public class ControlPlaneDataSourceConfig {

    @Value("${control-plane.datasource.url}")
    private String url;

    @Value("${control-plane.datasource.username}")
    private String username;

    @Value("${control-plane.datasource.password}")
    private String password;

    @Value("${control-plane.datasource.driver-class-name:org.postgresql.Driver}")
    private String driverClassName;

    @Value("${control-plane.flyway.enabled:true}")
    private boolean flywayEnabled;

    @Value("${control-plane.flyway.locations:classpath:db/migration-control}")
    private String flywayLocations;

    @Value("${control-plane.jpa.hibernate.ddl-auto:validate}")
    private String ddlAuto;

    @Value("${control-plane.jpa.show-sql:false}")
    private boolean showSql;

    @Bean
    public DataSource controlPlaneDataSource() {
        return DataSourceBuilder.create()
                .url(url)
                .username(username)
                .password(password)
                .driverClassName(driverClassName)
                .build();
    }

    // Runs Flyway against the control-plane DataSource before Hibernate builds the
    // EntityManagerFactory below. There is no Spring Boot auto-configuration for a
    // second Flyway instance (FlywayAutoConfiguration only ever wires the single
    // primary DataSource), so this is a plain manual Flyway.configure().load().migrate()
    // call — an independent migration history (its own flyway_schema_history table,
    // inside gymbios_control) tracked separately from the primary db/migration chain.
    @Bean
    public Flyway controlPlaneFlyway() {
        Flyway flyway = Flyway.configure()
                .dataSource(controlPlaneDataSource())
                .locations(flywayLocations)
                .baselineOnMigrate(false) // fresh DB always — no legacy baseline needed
                .load();
        if (flywayEnabled) {
            flyway.migrate();
        }
        return flyway;
    }

    @Bean
    @DependsOn("controlPlaneFlyway")
    public LocalContainerEntityManagerFactoryBean controlPlaneEntityManagerFactory(
            EntityManagerFactoryBuilder builder,
            @Qualifier("controlPlaneDataSource") DataSource dataSource) {
        Map<String, Object> jpaProperties = new HashMap<>();
        jpaProperties.put("hibernate.hbm2ddl.auto", ddlAuto);
        jpaProperties.put("hibernate.show_sql", showSql);
        jpaProperties.put("hibernate.format_sql", true);

        return builder
                .dataSource(dataSource)
                .packages("com.company.project.controlplane.entities")
                .persistenceUnit("controlPlane")
                .properties(jpaProperties)
                .build();
    }

    // Takes the EntityManagerFactory PRODUCT (not the LocalContainerEntityManagerFactoryBean
    // FactoryBean) as a Spring-injected, explicitly-qualified parameter — see
    // PrimaryDataSourceConfig.transactionManager for why injecting the FactoryBean type
    // directly and calling .getObject() on it is unsafe. The @Qualifier here is required.
    // with two EntityManagerFactory beans in the context, an unqualified injection would
    // resolve to the @Primary primary-side one, silently wiring this transaction manager
    // to the WRONG persistence unit.
    @Bean
    public PlatformTransactionManager controlPlaneTransactionManager(
            @Qualifier("controlPlaneEntityManagerFactory") EntityManagerFactory entityManagerFactory) {
        return new JpaTransactionManager(entityManagerFactory);
    }
}
