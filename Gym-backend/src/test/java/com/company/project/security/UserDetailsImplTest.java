package com.company.project.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class UserDetailsImplTest {

    private static UserDetailsImpl withAuthorities(String... authorities) {
        return new UserDetailsImpl(1L, "u", "u@x", "pw",
                java.util.Arrays.stream(authorities).map(SimpleGrantedAuthority::new).toList(), true);
    }

    @Test
    void a_member_only_login_is_recognised() {
        assertTrue(withAuthorities("ROLE_MEMBER").isMemberOnly());
        assertTrue(withAuthorities("ROLE_MEMBER", "MEMBERS_READ").isMemberOnly(), "permissions aren't roles");
    }

    @Test
    void staff_who_are_also_members_are_not_member_only() {
        assertFalse(withAuthorities("ROLE_MEMBER", "ROLE_RECEPTIONIST").isMemberOnly());
        assertFalse(withAuthorities("ROLE_ADMIN").isMemberOnly());
        assertFalse(withAuthorities().isMemberOnly());
    }
}
