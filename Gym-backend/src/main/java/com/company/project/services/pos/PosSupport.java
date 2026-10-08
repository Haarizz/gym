package com.company.project.services.pos;

import com.company.project.entities.PosSettings;
import com.company.project.entities.User;
import com.company.project.entities.UserProfile;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.SupervisorApprovalRequiredException;
import com.company.project.repositories.UserRepository;
import com.company.project.security.BranchContextHolder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

/**
 * Shared POS plumbing: who is calling, whether they count as a supervisor, the
 * supervisor-approval gate, and 2-dp money helpers. A supervisor is anyone holding
 * POINT_OF_SALE_EDIT (Admin / Manager by default); everyone else needs the branch
 * supervisor PIN for actions POS settings mark as approval-gated.
 */
@Component
public class PosSupport {

    public static final String SUPERVISOR_AUTHORITY = "POINT_OF_SALE_EDIT";
    public static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    public static final BigDecimal TOLERANCE = new BigDecimal("0.01");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    /** Optional (absent in unit tests): turns "today" into the branch's trading date. */
    private PosBusinessDayService businessDay;

    public PosSupport(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ── Caller ──────────────────────────────────────────────────────────────

    public String currentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return "SYSTEM";
        }
        return auth.getName();
    }

    /** Full name from the user's profile when one is set, else the username. */
    public String currentDisplayName() {
        String username = currentUsername();
        return userRepository.findByUsername(username)
                .map(User::getUserProfile)
                .map(UserProfile::getFullName)
                .filter(n -> n != null && !n.isBlank())
                .orElse(username);
    }

    public boolean isSupervisor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        for (GrantedAuthority a : auth.getAuthorities()) {
            String name = a.getAuthority();
            if (SUPERVISOR_AUTHORITY.equals(name) || "ROLE_ADMIN".equals(name) || "ROLE_GYMBIOS_ADMIN".equals(name)) {
                return true;
            }
        }
        return false;
    }

    /** The caller's active branch; POS writes are refused in All Branches mode. */
    public Long requireBranch() {
        Long branchId = BranchContextHolder.getActiveBranchId();
        if (branchId == null) {
            throw new BusinessRuleViolationException(
                    "Select a specific branch to use the Point of Sale (All Branches mode is read-only).");
        }
        return branchId;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setBusinessDay(@org.springframework.context.annotation.Lazy PosBusinessDayService businessDay) {
        this.businessDay = businessDay;
    }

    /** The trading date: the calendar date in the branch time zone, shifted by the business-day window if one is set. */
    public LocalDate today() {
        return businessDay != null ? businessDay.tradingDate() : LocalDate.now();
    }

    // ── Supervisor approval ─────────────────────────────────────────────────

    public boolean pinMatches(PosSettings settings, String pin) {
        return settings != null && settings.getSupervisorPinHash() != null
                && pin != null && !pin.isBlank()
                && passwordEncoder.matches(pin.trim(), settings.getSupervisorPinHash());
    }

    public String hashPin(String pin) {
        return passwordEncoder.encode(pin.trim());
    }

    /**
     * Gate for a supervisor-only action. Returns who approved it (the supervisor's own
     * username, or "Supervisor PIN"), or null when no approval was required.
     */
    public String approve(PosSettings settings, boolean required, String pin, String action) {
        if (!required) return null;
        if (isSupervisor()) return currentUsername();
        if (pinMatches(settings, pin)) return "Supervisor PIN";
        if (pin != null && !pin.isBlank()) {
            throw new SupervisorApprovalRequiredException("Incorrect supervisor PIN for " + action + ".");
        }
        if (settings == null || settings.getSupervisorPinHash() == null) {
            throw new SupervisorApprovalRequiredException(
                    "Supervisor approval is required for " + action
                    + ". Ask a manager to approve it, or set a supervisor PIN in POS Console › Security.");
        }
        throw new SupervisorApprovalRequiredException("Supervisor approval is required for " + action + ".");
    }

    // ── Money ───────────────────────────────────────────────────────────────

    public static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    public static BigDecimal r2(BigDecimal v) {
        return nz(v).setScale(2, RoundingMode.HALF_UP);
    }

    public static boolean positive(BigDecimal v) {
        return v != null && v.compareTo(BigDecimal.ZERO) > 0;
    }

    public static String trimToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
