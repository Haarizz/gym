package com.company.project.services.mobile.checkin;

import com.company.project.dto.WorkoutFeedbackRequestDTO;
import com.company.project.dto.mobile.checkin.MemberFeedbackResponseDTO;
import com.company.project.dto.mobile.checkin.MobileMemberFeedbackRequestDTO;
import com.company.project.entities.Attendance;
import com.company.project.entities.Member;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.mobile.checkin.MobileWorkoutFeedbackRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.WorkoutFeedbackService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MobileMemberFeedbackServiceTest {

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private AttendanceRepository attendanceRepository;

    @Mock
    private MobileWorkoutFeedbackRepository mobileWorkoutFeedbackRepository;

    @Mock
    private WorkoutFeedbackService workoutFeedbackService;

    @InjectMocks
    private MobileMemberFeedbackService feedbackService;

    private UserDetailsImpl testPrincipal;
    private Member testMember;
    private Attendance completedAttendance;

    @BeforeEach
    void setUp() {
        testPrincipal = new UserDetailsImpl(
                101L,
                "sarah_johnson",
                "sarah@example.com",
                "secret",
                List.of(new SimpleGrantedAuthority("ROLE_MEMBER")),
                true
        );

        testMember = new Member();
        testMember.setId(50L);
        testMember.setUserId(101L);
        testMember.setMemberId("MBR-00050");
        testMember.setName("Sarah Johnson");
        testMember.setEmail("sarah@example.com");

        completedAttendance = new Attendance();
        completedAttendance.setId(901L);
        completedAttendance.setMember(testMember);
        completedAttendance.setStatus("completed");
        completedAttendance.setCheckInTime(LocalDateTime.now().minusHours(2));
        completedAttendance.setCheckOutTime(LocalDateTime.now().minusHours(1));
        completedAttendance.setTotalMinutes(60);
    }

    @Test
    @DisplayName("Should successfully submit feedback for authenticated member's completed attendance")
    void testSubmitFeedbackSuccess() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));
        when(attendanceRepository.findById(901L)).thenReturn(Optional.of(completedAttendance));
        when(mobileWorkoutFeedbackRepository.existsByAttendance_Id(901L)).thenReturn(false);

        MobileMemberFeedbackRequestDTO request = new MobileMemberFeedbackRequestDTO();
        request.setAttendanceId(901L);
        request.setOverallSatisfaction(5);
        request.setWorkoutIntensity(4);
        request.setEquipmentQuality(5);
        request.setFacilityRating(4);
        request.setRecommendWorkout("Yes, definitely");
        request.setDifficultyLevel("Just right");
        request.setPaceRating("Just right");
        request.setBestAspects(List.of("Music", "Energy"));
        request.setAreasForImprovement(List.of("Space"));
        request.setEnergyAfterWorkout("high");
        request.setLikelyToReturn(10);
        request.setComments("Great session!");
        request.setSuggestions("None, all good.");

        MemberFeedbackResponseDTO response = feedbackService.submitFeedback(testPrincipal, request);

        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertEquals(901L, response.getAttendanceId());

        // Verify delegation to WorkoutFeedbackService
        ArgumentCaptor<WorkoutFeedbackRequestDTO> captor = ArgumentCaptor.forClass(WorkoutFeedbackRequestDTO.class);
        verify(workoutFeedbackService, times(1)).submitFeedback(captor.capture());
        WorkoutFeedbackRequestDTO webDTO = captor.getValue();

        assertEquals("901", webDTO.getSessionId());
        assertEquals(5, webDTO.getOverallSatisfaction());
        assertEquals(4, webDTO.getWorkoutIntensity());
        assertEquals(5, webDTO.getEquipmentQuality());
        assertEquals(4, webDTO.getFacilityRating());
        assertEquals("Yes, definitely", webDTO.getRecommendWorkout());
        assertEquals("Just right", webDTO.getDifficultyLevel());
        assertEquals("Just right", webDTO.getPaceRating());
        assertEquals(List.of("Music", "Energy"), webDTO.getBestAspects());
        assertEquals(List.of("Space"), webDTO.getAreasForImprovement());
        assertEquals("high", webDTO.getEnergyAfterWorkout());
        assertEquals(10, webDTO.getLikelyToReturn());
        assertEquals("Great session!", webDTO.getComments());
        assertEquals("None, all good.", webDTO.getSuggestions());
    }

    @Test
    @DisplayName("Should reject feedback when attendance belongs to another member")
    void testRejectFeedbackForOtherMemberAttendance() {
        Member otherMember = new Member();
        otherMember.setId(99L);
        otherMember.setName("Bob Smith");

        Attendance bobsAttendance = new Attendance();
        bobsAttendance.setId(902L);
        bobsAttendance.setMember(otherMember);
        bobsAttendance.setStatus("completed");

        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));
        when(attendanceRepository.findById(902L)).thenReturn(Optional.of(bobsAttendance));

        MobileMemberFeedbackRequestDTO request = new MobileMemberFeedbackRequestDTO();
        request.setAttendanceId(902L);

        BusinessRuleViolationException exception = assertThrows(
                BusinessRuleViolationException.class,
                () -> feedbackService.submitFeedback(testPrincipal, request)
        );

        assertTrue(exception.getMessage().contains("does not belong to the authenticated member"));
        verify(workoutFeedbackService, never()).submitFeedback(any(WorkoutFeedbackRequestDTO.class));
    }

    @Test
    @DisplayName("Should reject feedback when attendance is still active (not completed)")
    void testRejectFeedbackForActiveAttendance() {
        completedAttendance.setStatus("active");

        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));
        when(attendanceRepository.findById(901L)).thenReturn(Optional.of(completedAttendance));

        MobileMemberFeedbackRequestDTO request = new MobileMemberFeedbackRequestDTO();
        request.setAttendanceId(901L);

        BusinessRuleViolationException exception = assertThrows(
                BusinessRuleViolationException.class,
                () -> feedbackService.submitFeedback(testPrincipal, request)
        );

        assertTrue(exception.getMessage().contains("Feedback can only be submitted for a completed workout session"));
        verify(workoutFeedbackService, never()).submitFeedback(any(WorkoutFeedbackRequestDTO.class));
    }

    @Test
    @DisplayName("Should reject duplicate feedback when feedback already submitted for the attendance")
    void testRejectDuplicateFeedback() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));
        when(attendanceRepository.findById(901L)).thenReturn(Optional.of(completedAttendance));
        when(mobileWorkoutFeedbackRepository.existsByAttendance_Id(901L)).thenReturn(true);

        MobileMemberFeedbackRequestDTO request = new MobileMemberFeedbackRequestDTO();
        request.setAttendanceId(901L);

        BusinessRuleViolationException exception = assertThrows(
                BusinessRuleViolationException.class,
                () -> feedbackService.submitFeedback(testPrincipal, request)
        );

        assertTrue(exception.getMessage().contains("Feedback has already been submitted for this workout session"));
        verify(workoutFeedbackService, never()).submitFeedback(any(WorkoutFeedbackRequestDTO.class));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when attendanceId is missing")
    void testMissingAttendanceIdThrows() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));

        MobileMemberFeedbackRequestDTO request = new MobileMemberFeedbackRequestDTO();
        request.setAttendanceId(null);

        assertThrows(IllegalArgumentException.class, () -> feedbackService.submitFeedback(testPrincipal, request));
        verify(attendanceRepository, never()).findById(any());
        verify(workoutFeedbackService, never()).submitFeedback(any());
    }

    @Test
    @DisplayName("Should throw EntityNotFoundException when attendance is not found")
    void testAttendanceNotFoundThrows() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));
        when(attendanceRepository.findById(999L)).thenReturn(Optional.empty());

        MobileMemberFeedbackRequestDTO request = new MobileMemberFeedbackRequestDTO();
        request.setAttendanceId(999L);

        assertThrows(EntityNotFoundException.class, () -> feedbackService.submitFeedback(testPrincipal, request));
        verify(workoutFeedbackService, never()).submitFeedback(any());
    }

    @Test
    @DisplayName("Should throw EntityNotFoundException when user is not authenticated or not a member")
    void testUnauthenticatedUserThrows() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.empty());

        MobileMemberFeedbackRequestDTO request = new MobileMemberFeedbackRequestDTO();
        request.setAttendanceId(901L);

        assertThrows(EntityNotFoundException.class, () -> feedbackService.submitFeedback(testPrincipal, request));
        assertThrows(EntityNotFoundException.class, () -> feedbackService.submitFeedback(null, request));
    }
}
