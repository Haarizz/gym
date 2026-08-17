package com.company.project.controllers.mobile.performance;

import com.company.project.dto.mobile.performance.StaffPerformanceResponseDTO;
import com.company.project.dto.mobile.performance.StaffPerformanceResponseDTO.*;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.performance.MobileStaffPerformanceService;
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
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MobileStaffPerformanceControllerTest {

    @Mock
    private MobileStaffPerformanceService performanceService;

    @InjectMocks
    private MobileStaffPerformanceController controller;

    private UserDetailsImpl testPrincipal;

    @BeforeEach
    void setUp() {
        testPrincipal = new UserDetailsImpl(100L, "staffuser", "staff@gymbios.com", "password", Collections.emptyList(), true);
    }

    @Test
    @DisplayName("GET /api/mobile/staff/performance returns 200 OK with performance data when authenticated")
    void testGetStaffPerformanceSuccess() {
        StaffPerformanceResponseDTO mockDTO = new StaffPerformanceResponseDTO(
                new PeriodDTO(2026, 8, "August 2026"),
                new RevenueTargetDTO(new BigDecimal("117000"), new BigDecimal("150000"), 78),
                new ConversionTargetDTO(24, 30, 80),
                new SummaryDTO(4.6, 8, 152),
                Collections.emptyList(),
                Collections.emptyList(),
                new BreakdownDTO(62, 85, 92),
                new MotivationDTO(6, "You need 6 more conversions to hit your target.", "ON_TRACK")
        );

        when(performanceService.getStaffPerformance(testPrincipal)).thenReturn(mockDTO);

        ResponseEntity<StaffPerformanceResponseDTO> response = controller.getStaffPerformance(testPrincipal);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(78, response.getBody().getRevenueTarget().getPercentage());
        assertEquals(80, response.getBody().getConversionTarget().getPercentage());
        assertEquals(4.6, response.getBody().getSummary().getRating());
    }

    @Test
    @DisplayName("GET /api/mobile/staff/performance returns 401 Unauthorized when principal is null")
    void testGetStaffPerformanceUnauthenticated() {
        ResponseEntity<StaffPerformanceResponseDTO> response = controller.getStaffPerformance(null);

        assertNotNull(response);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNull(response.getBody());
        verifyNoInteractions(performanceService);
    }
}
