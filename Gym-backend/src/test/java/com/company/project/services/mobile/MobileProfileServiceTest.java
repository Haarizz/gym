package com.company.project.services.mobile;

import com.company.project.dto.mobile.profile.MobileProfileDTO;
import com.company.project.entities.Member;
import com.company.project.entities.UserProfile;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.UserProfileRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.services.mobile.profile.MobileProfileService;
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

    @Mock
    private UserRepository userRepository;

    @Mock
    private MemberRepository memberRepository;

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

    private static Member gymMember() {
        Member member = new Member();
        member.setName("tinu t");
        member.setPhone("8946738947");
        return member;
    }

    @Test
    void gymLoginShowsTheGymRecordOverAStaleProfile() {
        UserProfile profile = new UserProfile();
        profile.setFullName("Yash");
        profile.setPhone("9535855");
        profile.setNationality("Pakistani");

        when(userProfileRepository.findByUserId(7L)).thenReturn(Optional.of(profile));
        when(memberRepository.findByUserId(7L)).thenReturn(Optional.of(gymMember()));

        MobileProfileDTO dto = mobileProfileService.getProfileByUserId(7L, false);

        assertEquals("tinu t", dto.getFullName());
        assertEquals("8946738947", dto.getPhone());
        // Blank on the gym record — the profile's own value stays.
        assertEquals("Pakistani", dto.getNationality());
    }

    @Test
    void gymLoginsFirstProfileStartsFromTheGymRecord() {
        when(userProfileRepository.findByUserId(7L)).thenReturn(Optional.empty());
        when(userProfileRepository.save(any(UserProfile.class))).thenAnswer(i -> i.getArguments()[0]);
        when(memberRepository.findByUserId(7L)).thenReturn(Optional.of(gymMember()));

        mobileProfileService.getProfileByUserId(7L, false);

        verify(userProfileRepository).save(argThat(p ->
                "tinu t".equals(p.getFullName()) && "8946738947".equals(p.getPhone()) && p.isProfileCompleted()));
    }

    @Test
    void gymLoginEditsAreWrittenBackToTheGymRecord() {
        Member member = gymMember();
        UserProfile profile = new UserProfile();
        profile.setFullName("tinu t");

        when(userProfileRepository.findByUserId(7L)).thenReturn(Optional.of(profile));
        when(userProfileRepository.save(any(UserProfile.class))).thenAnswer(i -> i.getArguments()[0]);
        when(memberRepository.findByUserId(7L)).thenReturn(Optional.of(member));

        MobileProfileDTO request = new MobileProfileDTO();
        request.setFullName("Tinu Thomas");
        request.setEmergencyContact("Anu");
        request.setEmergencyPhone("9000000001");

        MobileProfileDTO dto = mobileProfileService.updateProfile(7L, request, false);

        assertEquals("Tinu Thomas", dto.getFullName());
        assertEquals("Tinu Thomas", member.getName());
        assertEquals("8946738947", member.getPhone(), "untouched fields keep the gym's value");
        assertEquals("Anu", member.getEmergencyContact());
        assertEquals("Anu", member.getEmergencyContactName());
        assertEquals("9000000001", member.getEmergencyPhone());
        assertEquals("9000000001", member.getEmergencyContactPhone());
        verify(memberRepository).save(member);
    }

    @Test
    void globalLoginNeverReadsTheGymMembersTable() {
        UserProfile profile = new UserProfile();
        profile.setFullName("Global Person");
        when(userProfileRepository.findByUserId(7L)).thenReturn(Optional.of(profile));

        MobileProfileDTO dto = mobileProfileService.getProfileByUserId(7L, true);

        assertEquals("Global Person", dto.getFullName());
        verifyNoInteractions(memberRepository);
    }
}
