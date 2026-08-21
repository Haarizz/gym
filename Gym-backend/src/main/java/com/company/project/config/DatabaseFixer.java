package com.company.project.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
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
    }
}
