package com.company.project.community;

import com.company.project.config.DataInitializer;
import com.company.project.controlplane.community.migration.CommunityReconciliationService;
import com.company.project.controlplane.community.migration.LegacyCommunityBackfillService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Rehearsal against a real legacy estate (the local profile's databases):
 * backfill, rerun (must change nothing), reconcile. Legacy databases are only
 * read. The control plane MUST be a disposable copy — point
 * control-plane.datasource.url at one; this test refuses to run against a
 * database whose name doesn't start with community_it_.
 */
@SpringBootTest
@ActiveProfiles("local")
@EnabledIfEnvironmentVariable(named = "COMMUNITY_REHEARSAL", matches = "true")
class LocalLegacyMigrationRehearsalIT {

    @MockBean
    private DataInitializer dataInitializer;

    @Autowired
    private LegacyCommunityBackfillService backfill;

    @Autowired
    private CommunityReconciliationService reconciliation;

    @Autowired
    @Qualifier("controlPlaneDataSource")
    private DataSource controlPlane;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void backfillIsIdempotentAndReconcilesExceptForOpenQuarantine() throws Exception {
        JdbcTemplate control = new JdbcTemplate(controlPlane);
        String db = control.queryForObject("SELECT current_database()", String.class);
        assertTrue(db.startsWith("community_it_"), "refusing to write to non-disposable control plane " + db);

        var first = backfill.run("FULL", "rehearsal");
        List<Map<String, Object>> rows = control.queryForList(
                "SELECT id, legacy_source, legacy_id, legacy_fingerprint, status FROM global_community_posts ORDER BY id");
        var second = backfill.run("FULL", "rehearsal");
        assertEquals(rows, control.queryForList(
                "SELECT id, legacy_source, legacy_id, legacy_fingerprint, status FROM global_community_posts ORDER BY id"),
                "a second full run must change nothing");

        var rec = reconciliation.run("DELTA", "rehearsal");
        assertTrue(rec.firstDifferences().stream().allMatch(d -> d.startsWith("OPEN_QUARANTINE")),
                "only open quarantine may remain: " + rec.firstDifferences());

        Path out = Path.of("target", "community-migration", "rehearsal.json");
        Files.createDirectories(out.getParent());
        objectMapper.copy().enable(SerializationFeature.INDENT_OUTPUT).writeValue(out.toFile(),
                Map.of("first_backfill", first, "second_backfill", second, "reconciliation", rec,
                        "quarantine", control.queryForList("SELECT legacy_source, legacy_table, legacy_id, code, status "
                                + "FROM community_migration_quarantine ORDER BY legacy_source, legacy_table, legacy_id, code")));
    }
}
