package com.company.project.controllers.mobile.checkin;

import com.company.project.dto.mobile.checkin.MemberFeedbackResponseDTO;
import com.company.project.dto.mobile.checkin.MobileMemberFeedbackRequestDTO;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.checkin.MobileMemberFeedbackService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MobileMemberFeedbackControllerTest {

    @Mock
    private MobileMemberFeedbackService feedbackService;

    @InjectMocks
    private MobileMemberFeedbackController controller;

    private UserDetailsImpl testPrincipal;

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
    }

    @Test
    @DisplayName("POST /api/mobile/member/check-in/feedback returns 200 OK with response DTO")
    void testSubmitFeedbackSuccess() {
        MobileMemberFeedbackRequestDTO request = new MobileMemberFeedbackRequestDTO();
        request.setAttendanceId(901L);
        request.setOverallSatisfaction(5);
        request.setWorkoutIntensity(4);

        MemberFeedbackResponseDTO mockResponse = new MemberFeedbackResponseDTO(true, 901L);

        when(feedbackService.submitFeedback(testPrincipal, request)).thenReturn(mockResponse);

        ResponseEntity<MemberFeedbackResponseDTO> response = controller.submitFeedback(testPrincipal, request);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertEquals(901L, response.getBody().getAttendanceId());

        verify(feedbackService, times(1)).submitFeedback(testPrincipal, request);
    }

    @Test
    @DisplayName("POST feedback propagates EntityNotFoundException when user is unauthenticated or attendance not found")
    void testSubmitFeedbackPropagatesNotFound() {
        MobileMemberFeedbackRequestDTO request = new MobileMemberFeedbackRequestDTO();
        request.setAttendanceId(901L);

        when(feedbackService.submitFeedback(testPrincipal, request))
                .thenThrow(new EntityNotFoundException("Attendance record not found: 901"));

        assertThrows(EntityNotFoundException.class, () -> controller.submitFeedback(testPrincipal, request));
        verify(feedbackService, times(1)).submitFeedback(testPrincipal, request);
    }

    @Test
    @DisplayName("POST feedback propagates BusinessRuleViolationException when session is active or duplicate")
    void testSubmitFeedbackPropagatesBusinessRuleViolation() {
        MobileMemberFeedbackRequestDTO request = new MobileMemberFeedbackRequestDTO();
        request.setAttendanceId(901L);

        when(feedbackService.submitFeedback(testPrincipal, request))
                .thenThrow(new BusinessRuleViolationException("Feedback has already been submitted for this workout session"));

        assertThrows(BusinessRuleViolationException.class, () -> controller.submitFeedback(testPrincipal, request));
        verify(feedbackService, times(1)).submitFeedback(testPrincipal, request);
    }
}
