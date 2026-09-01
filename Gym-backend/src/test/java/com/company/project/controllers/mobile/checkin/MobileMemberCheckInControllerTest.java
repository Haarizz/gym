package com.company.project.controllers.mobile.checkin;

import com.company.project.dto.mobile.checkin.MemberCheckInResponseDTO;
import com.company.project.dto.mobile.checkin.MemberCheckInStatusResponseDTO;
import com.company.project.dto.mobile.checkin.MemberCheckOutResponseDTO;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.checkin.MobileMemberCheckInService;
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

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MobileMemberCheckInControllerTest {

    @Mock
    private MobileMemberCheckInService checkInService;

    @InjectMocks
    private MobileMemberCheckInController controller;

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
    @DisplayName("GET /api/mobile/member/check-in/status returns 200 OK with status DTO")
    void testGetCheckInStatusSuccess() {
        LocalDateTime checkInTime = LocalDateTime.now().minusHours(1);
        MemberCheckInStatusResponseDTO mockResponse = new MemberCheckInStatusResponseDTO(true, 901L, checkInTime);

        when(checkInService.getCheckInStatus(testPrincipal)).thenReturn(mockResponse);

        ResponseEntity<MemberCheckInStatusResponseDTO> response = controller.getCheckInStatus(testPrincipal);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isCheckedIn());
        assertEquals(901L, response.getBody().getAttendanceId());
        assertEquals(checkInTime, response.getBody().getCheckInTime());

        verify(checkInService, times(1)).getCheckInStatus(testPrincipal);
    }

    @Test
    @DisplayName("POST /api/mobile/member/check-in returns 200 OK with check-in confirmation DTO")
    void testCheckInSuccess() {
        LocalDateTime checkInTime = LocalDateTime.now();
        MemberCheckInResponseDTO mockResponse = new MemberCheckInResponseDTO(true, 901L, checkInTime);

        when(checkInService.checkIn(testPrincipal)).thenReturn(mockResponse);

        ResponseEntity<MemberCheckInResponseDTO> response = controller.checkIn(testPrincipal);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isCheckedIn());
        assertEquals(901L, response.getBody().getAttendanceId());
        assertEquals(checkInTime, response.getBody().getCheckInTime());

        verify(checkInService, times(1)).checkIn(testPrincipal);
    }

    @Test
    @DisplayName("POST /api/mobile/member/check-out returns 200 OK with check-out DTO")
    void testCheckOutSuccess() {
        LocalDateTime checkInTime = LocalDateTime.now().minusHours(1).minusMinutes(27);
        LocalDateTime checkOutTime = LocalDateTime.now();
        MemberCheckOutResponseDTO mockResponse = new MemberCheckOutResponseDTO(false, 901L, checkInTime, checkOutTime, 87);

        when(checkInService.checkOut(testPrincipal)).thenReturn(mockResponse);

        ResponseEntity<MemberCheckOutResponseDTO> response = controller.checkOut(testPrincipal);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isCheckedIn());
        assertEquals(901L, response.getBody().getAttendanceId());
        assertEquals(checkInTime, response.getBody().getCheckInTime());
        assertEquals(checkOutTime, response.getBody().getCheckOutTime());
        assertEquals(87, response.getBody().getDurationMinutes());

        verify(checkInService, times(1)).checkOut(testPrincipal);
    }

    @Test
    @DisplayName("Controller propagates EntityNotFoundException when user is unauthenticated or not a member")
    void testControllerPropagatesEntityNotFound() {
        when(checkInService.checkIn(testPrincipal))
                .thenThrow(new EntityNotFoundException("No member profile linked to this user account"));

        assertThrows(EntityNotFoundException.class, () -> controller.checkIn(testPrincipal));
        verify(checkInService, times(1)).checkIn(testPrincipal);
    }

    @Test
    @DisplayName("Controller propagates BusinessRuleViolationException on duplicate check-in or checkout without active session")
    void testControllerPropagatesBusinessRuleViolation() {
        when(checkInService.checkOut(testPrincipal))
                .thenThrow(new BusinessRuleViolationException("No active check-in session found to check out"));

        assertThrows(BusinessRuleViolationException.class, () -> controller.checkOut(testPrincipal));
        verify(checkInService, times(1)).checkOut(testPrincipal);
    }
}
