package com.company.project.services.mobile;

import com.company.project.dto.MobileProfileDTO;
import com.company.project.entities.UserProfile;
import com.company.project.repositories.UserProfileRepository;
import com.company.project.services.MobileProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MobileProfileServiceTest {

    @Mock
    private UserProfileRepository userProfileRepository;

    @InjectMocks
    private MobileProfileService mobileProfileService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testGetProfileByUserId() {
        UserProfile profile = new UserProfile();
        profile.setFullName("John Doe");

        when(userProfileRepository.findByUserId(1L)).thenReturn(Optional.of(profile));

        MobileProfileDTO dto = mobileProfileService.getProfileByUserId(1L);

        assertNotNull(dto);
        assertEquals("John Doe", dto.getFullName());
    }

    @Test
    void testUpdateProfile() {
        UserProfile profile = new UserProfile();
        profile.setFullName("Old Name");

        when(userProfileRepository.findByUserId(1L)).thenReturn(Optional.of(profile));
        when(userProfileRepository.save(any(UserProfile.class))).thenAnswer(i -> i.getArguments()[0]);

        MobileProfileDTO updateRequest = new MobileProfileDTO();
        updateRequest.setFullName("New Name");
        updateRequest.setPhone("1234567890");

        MobileProfileDTO updatedDto = mobileProfileService.updateProfile(1L, updateRequest);

        assertNotNull(updatedDto);
        assertEquals("New Name", updatedDto.getFullName());
        assertEquals("1234567890", updatedDto.getPhone());
    }
}
