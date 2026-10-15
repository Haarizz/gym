package com.company.project.services;

import com.company.project.entities.User;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;

/**
 * The signed-in user's own settings (GET/PUT /api/auth/preferences). Today that is the
 * UI theme, stored on the user's account so it follows them across devices.
 */
@Service
@Transactional
public class UserPreferenceService {

    public static final Set<String> THEMES = Set.of("light", "dark", "system");

    private final UserRepository userRepository;

    public UserPreferenceService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** "light", "dark", "system", or null when the user never picked one. */
    @Transactional(readOnly = true)
    public String getThemePreference() {
        return currentUser().getThemePreference();
    }

    /** Saves and returns the normalised theme; anything but light/dark/system is rejected. */
    public String setThemePreference(String theme) {
        String normalised = theme == null ? "" : theme.trim().toLowerCase(Locale.ROOT);
        if (!THEMES.contains(normalised)) {
            throw new BusinessRuleViolationException("Theme must be one of: light, dark, system");
        }
        User user = currentUser();
        user.setThemePreference(normalised);
        userRepository.save(user);
        return normalised;
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            throw new IllegalStateException("Not signed in");
        }
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new IllegalStateException("Signed-in user not found"));
    }
}
