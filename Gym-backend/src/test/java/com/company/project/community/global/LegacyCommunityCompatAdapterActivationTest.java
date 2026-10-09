package com.company.project.community.global;

import com.company.project.community.global.rollout.CommunityRolloutService;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.BadSqlGrammarException;
import org.springframework.jdbc.CannotGetJdbcConnectionException;

import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Deployment-order safety of the adapter switch. */
class LegacyCommunityCompatAdapterActivationTest {

    private static LegacyCommunityCompatAdapter adapter(CommunityRolloutService rollout) {
        return new LegacyCommunityCompatAdapter(rollout, null, null, null, null, null, null, null, null);
    }

    @Test
    void beforeV6IsDeployedOldClientsStayOnTheLegacyTables() {
        CommunityRolloutService rollout = mock(CommunityRolloutService.class);
        when(rollout.state()).thenThrow(new BadSqlGrammarException("load", "SELECT ...",
                new SQLException("relation \"community_rollout_state\" does not exist", "42P01")));
        assertFalse(adapter(rollout).isActive());
    }

    @Test
    void anyOtherFailureIsAnErrorNeverAFallback() {
        CommunityRolloutService rollout = mock(CommunityRolloutService.class);
        when(rollout.state()).thenThrow(new CannotGetJdbcConnectionException("control plane down"));
        CommunityException e = assertThrows(CommunityException.class, () -> adapter(rollout).isActive());
        assertEquals(503, e.getStatus().value());
    }
}
