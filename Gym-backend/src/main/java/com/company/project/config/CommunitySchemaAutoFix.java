package com.company.project.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * Hibernate `ddl-auto=update` won't change existing column types.
 * If these columns were previously created as BYTEA, JPQL filters using LOWER()
 * will crash Postgres at parse time (function lower(bytea) does not exist).
 *
 * This is a small safety net for local installs to convert the affected columns back to text.
 */
@Component
public class CommunitySchemaAutoFix implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CommunitySchemaAutoFix.class);
    private final JdbcTemplate jdbcTemplate;

    public CommunitySchemaAutoFix(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        // Only touch columns if they exist and are currently BYTEA.
        fixByteaToText("community_posts", "type");
        fixByteaToText("community_posts", "topic");
        fixByteaToText("community_posts", "content");
        fixByteaToText("community_posts", "image_data_url");
        fixByteaToText("community_posts", "image_aspect_ratio");
    }

    private void fixByteaToText(String tableName, String columnName) {
        try {
            String dataType = jdbcTemplate.query(
                    """
                            select data_type
                            from information_schema.columns
                            where table_name = ?
                              and column_name = ?
                            order by case
                              when table_schema = current_schema() then 0
                              when table_schema = 'public' then 1
                              else 2
                            end
                            limit 1
                            """,
                    rs -> rs.next() ? rs.getString(1) : null,
                    tableName,
                    columnName
            );

            if (dataType == null) return;

            if (!"bytea".equals(dataType.toLowerCase(Locale.ROOT))) return;

            log.warn("Auto-fixing schema: {}.{} is BYTEA; converting to TEXT.", tableName, columnName);
            jdbcTemplate.execute("alter table " + tableName
                    + " alter column " + columnName
                    + " type text using convert_from(" + columnName + ", 'UTF8')");
        } catch (Exception e) {
            log.warn("Community schema auto-fix failed for {}.{}: {}", tableName, columnName, e.getMessage());
        }
    }
}

