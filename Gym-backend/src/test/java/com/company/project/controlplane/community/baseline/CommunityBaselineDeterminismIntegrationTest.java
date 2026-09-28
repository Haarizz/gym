package com.company.project.controlplane.community.baseline;

import com.company.project.config.DataInitializer;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Phase 0 exit criterion: the baseline must be deterministic. Runs the real
 * baseline twice against the local databases and requires identical digests
 * and per-source checksums (the reader is READ ONLY, so any write attempt
 * would fail the run rather than change data).
 *
 * Opt-in only (COMMUNITY_BASELINE_IT=true) because it reads every configured
 * tenant database; the report is saved to target/community-baseline/ for review.
 */
@SpringBootTest
@ActiveProfiles("local")
@EnabledIfEnvironmentVariable(named = "COMMUNITY_BASELINE_IT", matches = "true")
class CommunityBaselineDeterminismIntegrationTest {

    @MockBean
    private DataInitializer dataInitializer;

    @Autowired
    private CommunityBaselineService baselineService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void twoRunsOverUnchangedDataProduceIdenticalResults() throws Exception {
        CommunityBaselineReport first = baselineService.run();
        CommunityBaselineReport second = baselineService.run();

        assertEquals(first.digest, second.digest);
        assertEquals(first.sources.size(), second.sources.size());
        for (int i = 0; i < first.sources.size(); i++) {
            assertEquals(first.sources.get(i).checksums, second.sources.get(i).checksums,
                    "checksums differ for " + first.sources.get(i).source);
        }

        Path out = Path.of("target", "community-baseline", "baseline-report.json");
        Files.createDirectories(out.getParent());
        objectMapper.copy().enable(SerializationFeature.INDENT_OUTPUT).writeValue(out.toFile(), first);
    }
}
