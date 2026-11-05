package com.company.project.performance.attribution;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Who did what (plan §4.1). Source rows carry a staff id; this resolves one for rows written
 * before the id existed, or by code paths that only know a name or a login. Never guesses: a
 * name shared by two employees, or a login used by two staff rows, resolves to nobody, and
 * the row shows up on the Unassigned screen instead. No substring matching anywhere.
 *
 * Native queries on purpose: they bypass the branch filter and the branch read check, since a
 * staff member assigned to several branches can be credited while another branch is active.
 */
@Component
public class StaffAttribution {

    /** Who "processed" a receipt when nobody on staff did. */
    public static final List<String> NOT_A_STAFF_MEMBER = List.of("mobile app", "admin", "system", "");

    @PersistenceContext
    private EntityManager em;

    /** The one employee whose name is exactly this (case-insensitive, trimmed), or null. */
    public Long byExactName(String name) {
        if (name == null || NOT_A_STAFF_MEMBER.contains(name.trim().toLowerCase())) return null;
        List<?> ids = em.createNativeQuery(
                        "SELECT id FROM employees WHERE LOWER(TRIM(name)) = LOWER(TRIM(:name)) LIMIT 2")
                .setParameter("name", name)
                .getResultList();
        return ids.size() == 1 ? ((Number) ids.get(0)).longValue() : null;
    }

    /** The one employee signed in with this app login, or null. */
    public Long byLogin(String login) {
        if (login == null || login.isBlank()) return null;
        List<?> ids = em.createNativeQuery("SELECT id FROM employees WHERE app_username = :login LIMIT 2")
                .setParameter("login", login)
                .getResultList();
        return ids.size() == 1 ? ((Number) ids.get(0)).longValue() : null;
    }

    /** The picked name first (the desk chose it from the staff list), then the login that wrote the row. */
    public Long resolve(String name, String login) {
        Long id = byExactName(name);
        return id != null ? id : byLogin(login);
    }

    public boolean exists(Long staffId) {
        if (staffId == null) return false;
        return !em.createNativeQuery("SELECT 1 FROM employees WHERE id = :id")
                .setParameter("id", staffId).getResultList().isEmpty();
    }

    /** Staff id of the signed-in account, or null (owner/admin accounts have no staff row). */
    public Long currentStaffId() {
        return byLogin(currentLogin());
    }

    public static String currentLogin() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }
}
