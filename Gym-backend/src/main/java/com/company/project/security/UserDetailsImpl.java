package com.company.project.security;

import com.company.project.entities.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;
public class UserDetailsImpl implements UserDetails {

    private Long id;
    private String username;
    private String email;

    @JsonIgnore
    private String password;

    private Collection<? extends GrantedAuthority> authorities;
    private boolean isEnabled;
    private boolean isGlobal;

    public UserDetailsImpl(Long id, String username, String email, String password,
                          Collection<? extends GrantedAuthority> authorities, boolean isEnabled) {
        this(id, username, email, password, authorities, isEnabled, false);
    }

    public UserDetailsImpl(Long id, String username, String email, String password,
                          Collection<? extends GrantedAuthority> authorities, boolean isEnabled, boolean isGlobal) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.password = password;
        this.authorities = authorities;
        this.isEnabled = isEnabled;
        this.isGlobal = isGlobal;
    }

    public static UserDetailsImpl build(User user) {
        return build(user, java.util.List.of());
    }

    /**
     * @param permissionKeys effective fine-grained permission keys (e.g. "MEMBERS_VIEW") for this
     *                        user's role(s), granted as bare authorities alongside the existing
     *                        "ROLE_*" ones. Additive only — hasRole()/hasAnyRole() in SecurityConfig
     *                        match on the "ROLE_" prefix and are unaffected by these extra authorities.
     */
    public static UserDetailsImpl build(User user, Collection<String> permissionKeys) {
        List<GrantedAuthority> authorities = user.getUserRoles().stream()
                .map(userRole -> new SimpleGrantedAuthority("ROLE_" + userRole.getRole().getRoleName().toUpperCase()))
                .collect(Collectors.toList());
        for (String key : permissionKeys) {
            authorities.add(new SimpleGrantedAuthority(key));
        }

        return new UserDetailsImpl(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPasswordHash(),
                authorities,
                user.isEnabled(),
                false // Default to false for legacy/tenant build calls
        );
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public boolean isGlobal() { return isGlobal; }
    public void setGlobal(boolean isGlobal) { this.isGlobal = isGlobal; }

    /** Shown when an old gym-only member login tries to sign in (plan §4, step 7). */
    public static final String GYM_LOGIN_MOVED_MESSAGE =
            "This login has moved to a GymBios account. Sign in with your GymBios account, or ask your gym for help.";

    /** Holds only the MEMBER role — a member's login, not staff (who may also be members). */
    public boolean isMemberOnly() {
        List<String> roles = authorities.stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .toList();
        return !roles.isEmpty() && roles.stream().allMatch("ROLE_MEMBER"::equals);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return isEnabled;
    }
}
