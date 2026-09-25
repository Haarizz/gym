package com.company.project.community.global.identity;

import com.company.project.controlplane.community.store.CommunityAuthorStore.Profile;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.List;
import java.util.Map;

/**
 * Display name and avatar for an actor, read from the database that owns that
 * identity: the primary DB for global accounts, the gym's own DB for tenant
 * accounts. Profiles are visible to every gym, so a login username or email
 * (often the same thing) is never used as a fallback.
 */
@Component
public class CommunityAuthorProfiles {

    static final String FALLBACK_NAME = "GymBios member";

    private final DataSource primaryDataSource;
    private final TenantDataSources tenantDataSources;

    public CommunityAuthorProfiles(@Qualifier("primaryDataSource") DataSource primaryDataSource,
                                   TenantDataSources tenantDataSources) {
        this.primaryDataSource = primaryDataSource;
        this.tenantDataSources = tenantDataSources;
    }

    public Profile profileOf(CommunityActor actor) {
        return switch (actor.kind()) {
            case GLOBAL -> fromUserProfile(primaryDataSource, actor.globalUserId(), null);
            case TENANT -> tenantDataSources.resolve(actor.tenantSlug())
                    .map(db -> fromUserProfile(db.dataSource(), actor.tenantUserId(), memberName(db.dataSource(), actor.tenantUserId())))
                    .orElse(new Profile(FALLBACK_NAME, null));
            case PLATFORM -> new Profile("GymBios", null);
        };
    }

    private static Profile fromUserProfile(DataSource ds, long userId, String fallbackName) {
        List<Map<String, Object>> rows = new JdbcTemplate(ds).queryForList(
                "SELECT full_name, photo_url FROM user_profiles WHERE user_id = ?", userId);
        String name = rows.isEmpty() ? null : (String) rows.get(0).get("full_name");
        String photo = rows.isEmpty() ? null : (String) rows.get(0).get("photo_url");
        if (name == null || name.isBlank()) {
            name = fallbackName;
        }
        return new Profile(name == null || name.isBlank() ? FALLBACK_NAME : name.trim(), blankToNull(photo));
    }

    private static String memberName(DataSource ds, long userId) {
        List<String> names = new JdbcTemplate(ds).queryForList("SELECT name FROM members WHERE user_id = ?", String.class, userId);
        return names.size() == 1 ? names.get(0) : null;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
