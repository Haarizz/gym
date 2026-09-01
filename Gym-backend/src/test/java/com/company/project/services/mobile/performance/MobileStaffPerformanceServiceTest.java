package com.company.project.services.mobile.performance;

import com.company.project.dto.mobile.performance.StaffPerformanceResponseDTO;
import com.company.project.entities.*;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.*;
import com.company.project.security.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MobileStaffPerformanceServiceTest {

    @Mock
    private StaffRepository staffRepository;

    @Mock
    private StaffTargetRepository staffTargetRepository;

    @Mock
    private LeadRepository leadRepository;

    @Mock
    private FollowUpRepository followUpRepository;

    @Mock
    private ReceiptRepository receiptRepository;

    @Mock
    private WorkoutFeedbackRepository workoutFeedbackRepository;

    @InjectMocks
    private MobileStaffPerformanceService performanceService;

    private UserDetailsImpl testPrincipal;
    private Staff testStaff;

    @BeforeEach
    void setUp() {
        testPrincipal = new UserDetailsImpl(100L, "staffuser", "staff@gymbios.com", "password", Collections.emptyList(), true);

        testStaff = new Staff();
        testStaff.setId(10L);
        testStaff.setName("Rahul Sharma");
        testStaff.setEmail("staff@gymbios.com");
        testStaff.setBranch("Main Branch");
        testStaff.setMonthlyTarget(new BigDecimal("150000"));
        testStaff.setUserId(100L);
    }

    @Test
    @DisplayName("Throws EntityNotFoundException when principal is null")
    void testNullPrincipalThrows() {
        assertThrows(EntityNotFoundException.class, () -> performanceService.getStaffPerformance(null));
    }

    @Test
    @DisplayName("Computes performance from username-matched activity when no staff record is linked")
    void testMissingStaffComputesFromUsernameActivity() {
        when(staffRepository.findByUserId(100L)).thenReturn(Optional.empty());
        when(receiptRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        when(leadRepository.count(any(Specification.class))).thenReturn(0L);
        when(followUpRepository.count(any(Specification.class))).thenReturn(0L);
        when(workoutFeedbackRepository.findAll()).thenReturn(Collections.emptyList());

        StaffPerformanceResponseDTO response = performanceService.getStaffPerformance(testPrincipal);

        assertNotNull(response);
        // Staff-only fields are skipped rather than guessed at when there's no linked Staff record.
        assertTrue(response.getLeaderboard().isEmpty());
        assertEquals(BigDecimal.ZERO, response.getRevenueTarget().getTarget());
        assertEquals(0, response.getConversionTarget().getTarget());
    }

    @Test
    @DisplayName("Calculates staff performance correctly with configured StaffTarget")
    void testPerformanceWithConfiguredTarget() {
        when(staffRepository.findByUserId(100L)).thenReturn(Optional.of(testStaff));

        StaffTarget target = new StaffTarget();
        target.setRevenueTarget(new BigDecimal("150000"));
        target.setRevenueAchieved(new BigDecimal("117000"));
        target.setNewClientsTarget(30);
        target.setNewClientsAchieved(24);
        target.setForecast(8);

        LocalDate today = LocalDate.now();
        when(staffTargetRepository.findByStaff_IdAndYearAndMonthOrderByCreatedAtDesc(10L, today.getYear(), today.getMonthValue()))
                .thenReturn(List.of(target));

        when(receiptRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        when(leadRepository.count(any(Specification.class))).thenReturn(24L);

        // Ratings 5,5,5,4,4 average to 4.6, matching the rating asserted below.
        List<WorkoutFeedback> feedbacks = new ArrayList<>();
        for (int r : new int[]{5, 5, 5, 4, 4}) {
            WorkoutFeedback fb = new WorkoutFeedback();
            fb.setTrainerRating(r);
            feedbacks.add(fb);
        }
        when(workoutFeedbackRepository.findAll()).thenReturn(feedbacks);
        when(staffRepository.findAll(any(Specification.class))).thenReturn(Collections.singletonList(testStaff));

        StaffPerformanceResponseDTO response = performanceService.getStaffPerformance(testPrincipal);

        assertNotNull(response);
        assertEquals(today.getYear(), response.getPeriod().getYear());
        assertEquals(today.getMonthValue(), response.getPeriod().getMonth());

        // Revenue Target
        assertEquals(new BigDecimal("150000"), response.getRevenueTarget().getTarget());
        assertEquals(new BigDecimal("117000"), response.getRevenueTarget().getAchieved());
        assertEquals(78, response.getRevenueTarget().getPercentage());

        // Conversion Target
        assertEquals(30, response.getConversionTarget().getTarget());
        assertEquals(24, response.getConversionTarget().getAchieved());
        assertEquals(80, response.getConversionTarget().getPercentage());

        // Summary
        assertEquals(4.6, response.getSummary().getRating());
        assertEquals(0, response.getSummary().getGrowthPercentage());
        assertEquals(24, response.getSummary().getLeadCount());

        // Trend
        assertEquals(6, response.getTrend().size());

        // Leaderboard
        assertFalse(response.getLeaderboard().isEmpty());
        assertTrue(response.getLeaderboard().get(0).isCurrentUser());
        assertEquals(1, response.getLeaderboard().get(0).getRank());

        // Motivation
        assertEquals(6, response.getMotivation().getRemainingConversions());
        assertEquals("ON_TRACK", response.getMotivation().getStatus());
        assertTrue(response.getMotivation().getMessage().contains("6 more conversions"));
    }

    @Test
    @DisplayName("Handles zero/empty cases gracefully without division by zero")
    void testZeroTargetGracefulHandling() {
        testStaff.setMonthlyTarget(BigDecimal.ZERO);
        when(staffRepository.findByUserId(100L)).thenReturn(Optional.of(testStaff));

        LocalDate today = LocalDate.now();
        when(staffTargetRepository.findByStaff_IdAndYearAndMonthOrderByCreatedAtDesc(10L, today.getYear(), today.getMonthValue()))
                .thenReturn(Collections.emptyList());

        when(receiptRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        when(leadRepository.count(any(Specification.class))).thenReturn(0L);
        when(followUpRepository.count(any(Specification.class))).thenReturn(0L);
        when(workoutFeedbackRepository.findAll()).thenReturn(Collections.emptyList());
        when(staffRepository.findAll(any(Specification.class))).thenReturn(Collections.singletonList(testStaff));

        StaffPerformanceResponseDTO response = performanceService.getStaffPerformance(testPrincipal);

        assertNotNull(response);
        assertDoesNotThrow(() -> response.getRevenueTarget().getPercentage());
        assertDoesNotThrow(() -> response.getConversionTarget().getPercentage());
        assertDoesNotThrow(() -> response.getBreakdown().getConversionRate());
        assertDoesNotThrow(() -> response.getBreakdown().getFollowUpCompletion());
    }

    @Test
    @DisplayName("Branch leaderboard ranks staff deterministically by conversion count and revenue")
    void testBranchLeaderboardRanking() {
        when(staffRepository.findByUserId(100L)).thenReturn(Optional.of(testStaff));

        Staff peerStaff1 = new Staff();
        peerStaff1.setId(11L);
        peerStaff1.setName("Amit Kumar");
        peerStaff1.setBranch("Main Branch");

        Staff peerStaff2 = new Staff();
        peerStaff2.setId(12L);
        peerStaff2.setName("Priya Patel");
        peerStaff2.setBranch("Main Branch");

        List<Staff> branchList = List.of(peerStaff1, testStaff, peerStaff2);
        when(staffRepository.findAll(any(Specification.class))).thenReturn(branchList);

        when(receiptRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        when(leadRepository.count(any(Specification.class))).thenReturn(10L);
        when(workoutFeedbackRepository.findAll()).thenReturn(Collections.emptyList());

        StaffPerformanceResponseDTO response = performanceService.getStaffPerformance(testPrincipal);

        assertNotNull(response.getLeaderboard());
        assertEquals(3, response.getLeaderboard().size());
        assertEquals(1, response.getLeaderboard().get(0).getRank());
        assertEquals(2, response.getLeaderboard().get(1).getRank());
        assertEquals(3, response.getLeaderboard().get(2).getRank());

        // Verify currentUser marker matches testStaff
        long currentUserCount = response.getLeaderboard().stream().filter(StaffPerformanceResponseDTO.LeaderboardItemDTO::isCurrentUser).count();
        assertEquals(1, currentUserCount);
    }
}
