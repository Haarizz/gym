package com.company.project.services.mobile.auth;

import com.company.project.controlplane.repositories.UserDirectoryRepository;
import com.company.project.dto.AuthResponseDTO;
import com.company.project.entities.User;
import com.company.project.entities.UserProfile;
import com.company.project.repositories.UserProfileRepository;
import com.company.project.security.JwtService;
import com.company.project.services.RoleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class MobileJwtIssuerTest {

    @Mock private JwtService jwtService;
    @Mock private RoleService roleService;
    @Mock private UserDirectoryRepository userDirectoryRepository;
    @Mock private UserProfileRepository userProfileRepository;

    private MobileJwtIssuer issuer;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        issuer = new MobileJwtIssuer(jwtService, roleService, userDirectoryRepository, userProfileRepository);

        when(roleService.getEffectivePermissionKeysForRoleNames(List.of("MEMBER"))).thenReturn(List.of());
        when(jwtService.generateToken(any(), any())).thenReturn("jwt-token");
        when(userDirectoryRepository.findByUsernameOrEmail(any(), any())).thenReturn(Optional.empty());
    }

    private User user(long id) {
        User u = new User("janedoe", "jane@example.com", "hash");
        u.setId(id);
        return u;
    }

    @Test
    void issueForNewSocialMember_alwaysProfileIncomplete() {
        AuthResponseDTO response = issuer.issueForNewSocialMember(user(1L), "Jane Doe");

        assertFalse(response.getProfileCompleted());
        assertEquals("Jane Doe", response.getFullName());
        assertEquals("jwt-token", response.getToken());
    }

    @Test
    void issueForExistingSocialMember_reflectsRealProfileState_incomplete() {
        UserProfile profile = new UserProfile();
        profile.setFullName("Jane Doe");
        // phone/dateOfBirth/gender left unset -> isProfileCompleted() is false
        when(userProfileRepository.findByUserId(2L)).thenReturn(Optional.of(profile));

        AuthResponseDTO response = issuer.issueForExistingSocialMember(user(2L));

        assertFalse(response.getProfileCompleted());
        assertEquals("Jane Doe", response.getFullName());
    }

    @Test
    void issueForExistingSocialMember_reflectsRealProfileState_complete() {
        UserProfile profile = new UserProfile();
        profile.setFullName("Jane Doe");
        profile.setPhone("1234567890");
        profile.setDateOfBirth(java.time.LocalDate.of(1990, 1, 1));
        profile.setGender("F");
        when(userProfileRepository.findByUserId(3L)).thenReturn(Optional.of(profile));

        AuthResponseDTO response = issuer.issueForExistingSocialMember(user(3L));

        assertTrue(response.getProfileCompleted());
    }
}
