package com.company.project.community.support;

import org.flywaydb.core.Flyway;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Creates throwaway PostgreSQL databases for Community integration tests and
 * drops them afterwards. Stands in for Testcontainers (C11) on machines without
 * Docker: the isolation is the same — every test class gets its own databases
 * named community_it_* — but it needs a reachable PostgreSQL server:
 *
 *   COMMUNITY_IT_PG_URL       jdbc:postgresql://localhost:5432/postgres
 *   COMMUNITY_IT_PG_USER      postgres
 *   COMMUNITY_IT_PG_PASSWORD  ...
 *
 * Tests using this are opt-in (COMMUNITY_IT=true) so ordinary builds never touch
 * a database server.
 */
public final class DisposableDatabases implements AutoCloseable {

    private final String adminUrl;
    private final String user;
    private final String password;
    private final String prefix;
    private final List<String> created = new ArrayList<>();

    public DisposableDatabases() {
        this.adminUrl = env("COMMUNITY_IT_PG_URL", "jdbc:postgresql://localhost:5432/postgres");
        this.user = env("COMMUNITY_IT_PG_USER", "postgres");
        this.password = env("COMMUNITY_IT_PG_PASSWORD", "");
        this.prefix = "community_it_" + UUID.randomUUID().toString().substring(0, 8) + "_";
    }

    public DataSource create(String name) throws SQLException {
        String db = prefix + name;
        try (Connection c = DriverManager.getConnection(adminUrl, user, password);
             Statement st = c.createStatement()) {
            st.execute("CREATE DATABASE " + db);
        }
        created.add(db);
        return dataSource(db);
    }

    public DataSource dataSource(String fullName) {
        DriverManagerDataSource ds = new DriverManagerDataSource();
        ds.setDriverClassName("org.postgresql.Driver");
        ds.setUrl(adminUrl.substring(0, adminUrl.lastIndexOf('/') + 1) + fullName);
        ds.setUsername(user);
        ds.setPassword(password);
        return ds;
    }

    public String fullName(String name) {
        return prefix + name;
    }

    /** A control-plane database with every control-plane migration applied, including V6. */
    public DataSource createControlPlane() throws SQLException {
        DataSource ds = create("control");
        Flyway.configure()
                .dataSource(ds)
                .locations("classpath:db/migration-control")
                .load()
                .migrate();
        return ds;
    }

    @Override
    public void close() throws SQLException {
        try (Connection c = DriverManager.getConnection(adminUrl, user, password);
             Statement st = c.createStatement()) {
            for (String db : created) {
                st.execute("DROP DATABASE IF EXISTS " + db + " WITH (FORCE)");
            }
        }
    }

    private static String env(String name, String fallback) {
        String value = System.getenv(name);
        return value == null || value.isBlank() ? fallback : value;
    }
}
