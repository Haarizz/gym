package com.company.project.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Must run before DataInitializer, which seeds rows relying on these constraints
 * already being fixed (e.g. product_categories' old global-unique-on-name
 * constraint has to be gone before a second branch's "Supplements" row can be
 * inserted). CommandLineRunner beans run in registration order by default, which
 * is undefined/fragile — pin this explicitly rather than rely on incidental
 * classpath scan ordering. Highest precedence = runs first.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DatabaseFixer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseFixer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            jdbcTemplate.execute("ALTER TABLE account_heads DROP CONSTRAINT IF EXISTS uk_1k3bm2m00cs30hbnyil2ka8m7");
            jdbcTemplate.execute("ALTER TABLE account_heads DROP CONSTRAINT IF EXISTS account_heads_code_key");
            System.out.println("======================================================");
            System.out.println("Successfully dropped old global unique constraint on account_heads.");
            System.out.println("======================================================");
        } catch (Exception e) {
            System.err.println("Failed to drop constraint: " + e.getMessage());
        }

        // Same fix as above, for product_categories.name (see V34 migration for the
        // non-local-dev path — this runner exists because local dev boots with
        // spring.flyway.enabled=false, so V34 never runs there and Hibernate's
        // ddl-auto=update only ever ADDs the new composite constraint, it never
        // drops the old global-unique one it superseded).
        try {
            jdbcTemplate.execute("ALTER TABLE product_categories DROP CONSTRAINT IF EXISTS uk_fl075bwasjwsxybk4x174befx");
            jdbcTemplate.execute("ALTER TABLE product_categories DROP CONSTRAINT IF EXISTS product_categories_name_key");
            System.out.println("======================================================");
            System.out.println("Successfully dropped old global unique constraint on product_categories.");
            System.out.println("======================================================");
        } catch (Exception e) {
            System.err.println("Failed to drop constraint: " + e.getMessage());
        }
    }
}
