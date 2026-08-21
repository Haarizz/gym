package com.company.project.services.mobile.schedule;

import com.company.project.dto.TrainingSessionResponseDTO;
import com.company.project.dto.mobile.schedule.MobileSessionRequestDTO;
import com.company.project.services.BookingService;
import com.company.project.services.TrainingSessionService;
import com.company.project.repositories.StaffRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class MobileTrainerScheduleServiceTest {

    @Mock
    private TrainingSessionService trainingSessionService;

    @Mock
    private BookingService bookingService;

    @Mock
    private StaffRepository staffRepository;

    @InjectMocks
    private MobileTrainerScheduleService service;

    private Long staffId = 1L;
    private LocalDate today = LocalDate.now();

    @BeforeEach
    void setUp() {
    }

    @Test
    void testCreateSession_overlapThrowsException() {
        // Arrange
        TrainingSessionResponseDTO existing = new TrainingSessionResponseDTO();
        existing.setId("100");
        existing.setDate(today);
        existing.setStartTime(LocalTime.of(9, 0));
        existing.setEndTime(LocalTime.of(10, 0));
        existing.setStatus("active");
        
        when(trainingSessionService.getSessions(null, staffId, today, today, null))
                .thenReturn(List.of(existing));

        MobileSessionRequestDTO request = new MobileSessionRequestDTO();
        request.setDate(today);
        request.setStartTime(LocalTime.of(9, 30));
        request.setEndTime(LocalTime.of(10, 30));

        // Act & Assert
        assertThrows(RuntimeException.class, () -> service.createSession(staffId, request),
                "Session overlaps with an existing active session");
    }

    @Test
    void testCreateSession_noOverlapSucceeds() {
        // Arrange
        TrainingSessionResponseDTO existing = new TrainingSessionResponseDTO();
        existing.setId("100");
        existing.setDate(today);
        existing.setStartTime(LocalTime.of(9, 0));
        existing.setEndTime(LocalTime.of(10, 0));
        existing.setStatus("active");

        TrainingSessionResponseDTO createdMock = new TrainingSessionResponseDTO();
        createdMock.setId("200");
        
        when(trainingSessionService.getSessions(null, staffId, today, today, null))
                .thenReturn(List.of(existing));
        when(trainingSessionService.createSession(any())).thenReturn(createdMock);

        MobileSessionRequestDTO request = new MobileSessionRequestDTO();
        request.setDate(today);
        request.setStartTime(LocalTime.of(10, 0)); // Starts exactly when previous ends
        request.setEndTime(LocalTime.of(11, 0));
        request.setName("New Session");

        // Act
        service.createSession(staffId, request);

        // Assert
        verify(trainingSessionService, times(1)).createSession(any());
    }

    @Test
    void testUpdateSession_excludeCurrentSessionSucceeds() {
        // Arrange
        TrainingSessionResponseDTO existing = new TrainingSessionResponseDTO();
        existing.setId("100");
        existing.setDate(today);
        existing.setStartTime(LocalTime.of(9, 0));
        existing.setEndTime(LocalTime.of(10, 0));
        existing.setStatus("active");

        when(trainingSessionService.getSessions(null, staffId, null, null, null))
                .thenReturn(List.of(existing)); // For ownership check
                
        when(trainingSessionService.getSessions(null, staffId, today, today, null))
                .thenReturn(List.of(existing)); // For overlap check

        when(trainingSessionService.updateSession(eq(100L), any())).thenReturn(existing);
        when(bookingService.getBookings(any(), any(), any(), any(), any(), any())).thenReturn(Collections.emptyList());

        MobileSessionRequestDTO request = new MobileSessionRequestDTO();
        request.setDate(today);
        request.setStartTime(LocalTime.of(9, 30)); // overlapping, but it's the SAME session being updated
        request.setEndTime(LocalTime.of(10, 30));

        // Act
        service.updateSession(staffId, 100L, request);

        // Assert
        verify(trainingSessionService, times(1)).updateSession(eq(100L), any());
    }
}
