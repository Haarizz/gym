package com.company.project.controlplane.community.store;

import com.company.project.community.global.identity.CommunityActor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * community_authors: one row per real identity, keyed by the identity itself
 * (never by a bare numeric user ID). Upserts rely on the partial unique indexes
 * so concurrent first writes by the same person can't create two authors.
 */
@Component
public class CommunityAuthorStore {

    public record AuthorRow(long id, String kind, Long globalUserId, String tenantSlug, Long tenantUserId,
                            Long platformUserId, String displayName, String avatarUrl, String primaryRole,
                            String status) {}

    /** Display snapshot refreshed each time the author writes. */
    public record Profile(String displayName, String avatarUrl) {}

    private static final RowMapper<AuthorRow> MAPPER = (rs, i) -> new AuthorRow(
            rs.getLong("id"), rs.getString("kind"),
            (Long) rs.getObject("global_user_id"), rs.getString("tenant_slug"), (Long) rs.getObject("tenant_user_id"),
            (Long) rs.getObject("platform_user_id"), rs.getString("display_name"), rs.getString("avatar_url"),
            rs.getString("primary_role"), rs.getString("status"));

    private final CommunityDb db;

    public CommunityAuthorStore(CommunityDb db) {
        this.db = db;
    }

    /** The actor's author id, if they have ever written anything. Never creates a row. */
    public Optional<Long> findId(CommunityActor actor) {
        MapSqlParameterSource p = identityParams(actor);
        List<Long> ids = db.jdbc().queryForList("SELECT id FROM community_authors WHERE " + identityPredicate(actor), p, Long.class);
        return ids.isEmpty() ? Optional.empty() : Optional.of(ids.get(0));
    }

    /** Creates or refreshes the author row for this actor and returns its id. */
    public long upsert(CommunityActor actor, Profile profile) {
        MapSqlParameterSource p = identityParams(actor)
                .addValue("kind", actor.kind().name())
                .addValue("displayName", truncate(profile.displayName(), 120))
                .addValue("avatarUrl", profile.avatarUrl())
                .addValue("primaryRole", actor.primaryRole());
        String conflict = switch (actor.kind()) {
            case GLOBAL -> "(global_user_id) WHERE kind = 'GLOBAL'";
            case TENANT -> "(tenant_slug, tenant_user_id) WHERE kind = 'TENANT'";
            case PLATFORM -> "(platform_user_id) WHERE kind = 'PLATFORM'";
        };
        return db.jdbc().queryForObject(
                "INSERT INTO community_authors (kind, global_user_id, tenant_slug, tenant_user_id, platform_user_id, "
                        + "display_name, avatar_url, primary_role) VALUES (:kind, :globalUserId, :tenantSlug, :tenantUserId, "
                        + ":platformUserId, :displayName, :avatarUrl, :primaryRole) "
                        + "ON CONFLICT " + conflict + " DO UPDATE SET display_name = EXCLUDED.display_name, "
                        + "avatar_url = EXCLUDED.avatar_url, primary_role = EXCLUDED.primary_role, updated_at = NOW() "
                        + "RETURNING id",
                p, Long.class);
    }

    public Map<Long, AuthorRow> findByIds(Collection<Long> ids) {
        Map<Long, AuthorRow> result = new HashMap<>();
        if (ids.isEmpty()) {
            return result;
        }
        db.jdbc().query("SELECT * FROM community_authors WHERE id IN (:ids)", Map.of("ids", ids), MAPPER)
                .forEach(a -> result.put(a.id(), a));
        return result;
    }

    private static MapSqlParameterSource identityParams(CommunityActor actor) {
        return new MapSqlParameterSource()
                .addValue("globalUserId", actor.globalUserId())
                .addValue("tenantSlug", actor.isTenant() ? actor.tenantSlug() : null)
                .addValue("tenantUserId", actor.tenantUserId())
                .addValue("platformUserId", actor.platformUserId());
    }

    private static String identityPredicate(CommunityActor actor) {
        return switch (actor.kind()) {
            case GLOBAL -> "kind = 'GLOBAL' AND global_user_id = :globalUserId";
            case TENANT -> "kind = 'TENANT' AND tenant_slug = :tenantSlug AND tenant_user_id = :tenantUserId";
            case PLATFORM -> "kind = 'PLATFORM' AND platform_user_id = :platformUserId";
        };
    }

    private static String truncate(String value, int max) {
        if (value == null || value.isBlank()) {
            return "GymBios member";
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
