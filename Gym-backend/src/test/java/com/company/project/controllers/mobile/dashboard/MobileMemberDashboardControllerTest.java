package com.company.project.controllers.mobile.dashboard;

import com.company.project.dto.mobile.dashboard.MemberDashboardResponseDTO;
import com.company.project.dto.mobile.dashboard.MemberDashboardResponseDTO.*;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.dashboard.MobileMemberDashboardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MobileMemberDashboardControllerTest {

    @Mock
    private MobileMemberDashboardService dashboardService;

    @InjectMocks
    private MobileMemberDashboardController controller;

    private UserDetailsImpl testPrincipal;

    @BeforeEach
    void setUp() {
        testPrincipal = new UserDetailsImpl(
                100L,
                "memberuser",
                "member@example.com",
                "hashedpassword",
                Collections.emptyList(),
                true
        );
    }

    @Test
    @DisplayName("GET /api/mobile/member/dashboard returns 200 OK with dashboard DTO when authenticated")
    void testGetMemberDashboardSuccess() {
        MemberIdentityDTO identity = new MemberIdentityDTO("MBR-001", "John Doe", "member@example.com", "+1234567890", "ROLE_MEMBER");
        MembershipDetailsDTO membership = new MembershipDetailsDTO(
                "Platinum Annual",
                "VIP",
                "active",
                true,
                LocalDateTime.now().minusMonths(1),
                LocalDateTime.now().plusMonths(11),
                LocalDateTime.now().plusMonths(11),
                335,
                "paid",
                BigDecimal.ZERO
        );
        CheckInStatusDTO checkInStatus = new CheckInStatusDTO(false, null, null);
        MemberScheduleItemDTO scheduleItem = new MemberScheduleItemDTO(
                1L, 10L, "Morning Yoga", "class", "Maya Singh",
                LocalDate.now(), LocalTime.of(6, 0), LocalTime.of(7, 0),
                60, "Studio A", 20, 17, 3, "confirmed"
        );
        MemberActivityStatsDTO activityStats = new MemberActivityStatsDTO(24, 3, 5);
        ActivePromotionDTO promotion = new ActivePromotionDTO(
                1L, "Renewal Special", "discount", "15% off renewal",
                "percentage", new BigDecimal("15.00"), "RENEW15",
                LocalDate.now().minusDays(1), LocalDate.now().plusDays(30)
        );

        MemberDashboardResponseDTO mockDTO = new MemberDashboardResponseDTO(
                identity,
                membership,
                checkInStatus,
                List.of(scheduleItem),
                activityStats,
                promotion
        );

        when(dashboardService.getMemberDashboard(testPrincipal)).thenReturn(mockDTO);

        ResponseEntity<MemberDashboardResponseDTO> response = controller.getMemberDashboard(testPrincipal);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("MBR-001", response.getBody().getIdentity().getMemberId());
        assertEquals("John Doe", response.getBody().getIdentity().getName());
        assertEquals("Platinum Annual", response.getBody().getMembership().getPlanName());
        assertTrue(response.getBody().getMembership().isActive());
        assertEquals(335, response.getBody().getMembership().getDaysRemaining());
        assertFalse(response.getBody().getCheckInStatus().isCheckedIn());
        assertEquals(1, response.getBody().getTodaysSchedule().size());
        assertEquals(3, response.getBody().getTodaysSchedule().get(0).getAvailableSpots());
        assertEquals(24, response.getBody().getActivityStats().getTotalVisits());
        assertEquals(5, response.getBody().getActivityStats().getCurrentStreakDays());
        assertNotNull(response.getBody().getActivePromotion());
        assertEquals("RENEW15", response.getBody().getActivePromotion().getCode());

        verify(dashboardService, times(1)).getMemberDashboard(testPrincipal);
    }

    @Test
    @DisplayName("GET /api/mobile/member/dashboard propagates EntityNotFoundException when user is not a member")
    void testGetMemberDashboardNonMember() {
        when(dashboardService.getMemberDashboard(testPrincipal))
                .thenThrow(new EntityNotFoundException("No member profile linked to this user account"));

        assertThrows(EntityNotFoundException.class, () -> controller.getMemberDashboard(testPrincipal));
        verify(dashboardService, times(1)).getMemberDashboard(testPrincipal);
    }
}
