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

    public UserDetailsImpl(Long id, String username, String email, String password,
                          Collection<? extends GrantedAuthority> authorities, boolean isEnabled) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.password = password;
        this.authorities = authorities;
        this.isEnabled = isEnabled;
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
                user.isEnabled()
        );
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }

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
