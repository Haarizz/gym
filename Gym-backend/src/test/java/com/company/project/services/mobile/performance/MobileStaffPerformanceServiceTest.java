package com.company.project.services.mobile.performance;

import com.company.project.performance.PerformanceEngine;
import com.company.project.performance.PerformanceTestData;
import com.company.project.performance.PeriodResult;
import com.company.project.performance.metric.Measure;
import com.company.project.performance.metric.Metric;
import java.time.YearMonth;
import java.util.Map;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;

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
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MobileStaffPerformanceServiceTest {

    @Mock
    private StaffRepository staffRepository;

    @Mock
    private LeadRepository leadRepository;

    @Mock
    private FollowUpRepository followUpRepository;

    @Mock
    private ReceiptRepository receiptRepository;

    @Mock
    private WorkoutFeedbackRepository workoutFeedbackRepository;

    @Mock
    private PerformanceEngine engine;

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

        PeriodResult empty = PerformanceTestData.result(10L, YearMonth.now()).build();
        lenient().when(engine.achievedBetween(anyLong(), any(), any())).thenReturn(empty.achieved());
        lenient().when(engine.evaluate(eq(10L), any(YearMonth.class))).thenReturn(empty);
        lenient().when(engine.evaluate(anyCollection(), any(YearMonth.class))).thenReturn(Map.of(10L, empty));
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
        lenient().when(receiptRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        lenient().when(leadRepository.count(any(Specification.class))).thenReturn(0L);
        when(followUpRepository.count(any(Specification.class))).thenReturn(0L);

        StaffPerformanceResponseDTO response = performanceService.getStaffPerformance(testPrincipal);

        assertNotNull(response);
        // No Staff record = no sessions of their own, so no rating (not the gym-wide average).
        assertEquals(0.0, response.getSummary().getRating());
        verifyNoInteractions(workoutFeedbackRepository);
        // Staff-only fields are skipped rather than guessed at when there's no linked Staff record.
        assertTrue(response.getLeaderboard().isEmpty());
        assertEquals(BigDecimal.ZERO, response.getRevenueTarget().getTarget());
        assertEquals(0, response.getConversionTarget().getTarget());
    }

    @Test
    @DisplayName("Calculates staff performance correctly with configured StaffTarget")
    void testPerformanceWithConfiguredTarget() {
        when(staffRepository.findByUserId(100L)).thenReturn(Optional.of(testStaff));

        LocalDate today = LocalDate.now();
        PeriodResult month = PerformanceTestData.result(10L, YearMonth.from(today))
                .achieved(Metric.MEMBER_ADMISSION, 10, "117000")
                .achieved(Metric.LEAD_CONVERSION, 24, null)
                .goal(Metric.REVENUE_TOTAL, Measure.AMOUNT, "150000")
                .goal(Metric.LEAD_CONVERSION, Measure.COUNT, "30")
                .build();
        when(engine.evaluate(eq(10L), any(YearMonth.class))).thenReturn(month);
        when(engine.evaluate(anyCollection(), any(YearMonth.class))).thenReturn(Map.of(10L, month));
        when(engine.leadCount(10L)).thenReturn(24L);
        lenient().when(engine.achievedBetween(anyLong(), any(), any())).thenReturn(month.achieved());

        lenient().when(receiptRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        lenient().when(leadRepository.count(any(Specification.class))).thenReturn(24L);

        // This trainer's own sessions average 4.6 (5 ratings); other trainers' feedback isn't counted.
        when(workoutFeedbackRepository.averageRatingByTrainerIds(List.of(10L)))
                .thenReturn(Collections.singletonList(new Object[]{10L, 4.6, 5L}));
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
    @DisplayName("Growth compares month-to-date with the same days of last month")
    void testGrowthIsLikeForLike() {
        when(staffRepository.findByUserId(100L)).thenReturn(Optional.of(testStaff));
        LocalDate today = LocalDate.now();
        LocalDateTime startOfMonth = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime startOfPrevMonth = startOfMonth.minusMonths(1);
        LocalDateTime endOfPrevPeriod = startOfPrevMonth.plusDays(
                Math.min(today.getDayOfMonth(), startOfPrevMonth.toLocalDate().lengthOfMonth()));

        // Current month: 1500. Same days last month: 1000. Anything else (trend months): 0.
        when(engine.evaluate(eq(10L), any(YearMonth.class))).thenReturn(
                PerformanceTestData.result(10L, YearMonth.from(today)).achieved(Metric.MEMBER_ADMISSION, 1, "1500").build());
        when(engine.achievedBetween(eq(10L), eq(startOfPrevMonth), eq(endOfPrevPeriod))).thenReturn(
                PerformanceTestData.result(10L, YearMonth.from(today)).achieved(Metric.MEMBER_ADMISSION, 1, "1000").build().achieved());
        lenient().when(receiptRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        lenient().when(leadRepository.count(any(Specification.class))).thenReturn(0L);
        lenient().when(followUpRepository.count(any(Specification.class))).thenReturn(0L);
        lenient().when(staffRepository.findAll(any(Specification.class))).thenReturn(Collections.singletonList(testStaff));

        StaffPerformanceResponseDTO response = performanceService.getStaffPerformance(testPrincipal);

        assertEquals(50, response.getSummary().getGrowthPercentage());
    }

    @Test
    @DisplayName("Growth is 0 (nothing to compare) when last month had no activity, not the target forecast")
    void testGrowthWithoutComparisonIgnoresForecast() {
        when(staffRepository.findByUserId(100L)).thenReturn(Optional.of(testStaff));
        LocalDate today = LocalDate.now();
        when(engine.evaluate(eq(10L), any(YearMonth.class))).thenReturn(PerformanceTestData.result(10L, YearMonth.from(today))
                .goal(Metric.REVENUE_TOTAL, Measure.AMOUNT, "1000").build());
        lenient().when(receiptRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        lenient().when(leadRepository.count(any(Specification.class))).thenReturn(0L);
        lenient().when(followUpRepository.count(any(Specification.class))).thenReturn(0L);
        lenient().when(staffRepository.findAll(any(Specification.class))).thenReturn(Collections.singletonList(testStaff));

        StaffPerformanceResponseDTO response = performanceService.getStaffPerformance(testPrincipal);

        assertEquals(0, response.getSummary().getGrowthPercentage());
    }

    @Test
    @DisplayName("Handles zero/empty cases gracefully without division by zero")
    void testZeroTargetGracefulHandling() {
        testStaff.setMonthlyTarget(BigDecimal.ZERO);
        when(staffRepository.findByUserId(100L)).thenReturn(Optional.of(testStaff));

        lenient().when(receiptRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        lenient().when(leadRepository.count(any(Specification.class))).thenReturn(0L);
        when(followUpRepository.count(any(Specification.class))).thenReturn(0L);
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
        YearMonth now = YearMonth.now();
        when(engine.evaluate(anyCollection(), any(YearMonth.class))).thenReturn(Map.of(
                11L, PerformanceTestData.result(11L, now).achieved(Metric.LEAD_CONVERSION, 5, null).build(),
                10L, PerformanceTestData.result(10L, now).achieved(Metric.LEAD_CONVERSION, 3, null).build(),
                12L, PerformanceTestData.result(12L, now).achieved(Metric.LEAD_CONVERSION, 3, null)
                        .achieved(Metric.POS_SALE, 1, "900").build()));

        lenient().when(receiptRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());
        lenient().when(leadRepository.count(any(Specification.class))).thenReturn(10L);

        StaffPerformanceResponseDTO response = performanceService.getStaffPerformance(testPrincipal);

        assertNotNull(response.getLeaderboard());
        assertEquals(3, response.getLeaderboard().size());
        assertEquals(1, response.getLeaderboard().get(0).getRank());
        assertEquals(2, response.getLeaderboard().get(1).getRank());
        assertEquals(3, response.getLeaderboard().get(2).getRank());
        // 5 conversions first; then 3 and 3, broken by revenue (Priya's POS sale)
        assertEquals(11L, response.getLeaderboard().get(0).getStaffId());
        assertEquals(12L, response.getLeaderboard().get(1).getStaffId());
        assertEquals(10L, response.getLeaderboard().get(2).getStaffId());

        // Verify currentUser marker matches testStaff
        long currentUserCount = response.getLeaderboard().stream().filter(StaffPerformanceResponseDTO.LeaderboardItemDTO::isCurrentUser).count();
        assertEquals(1, currentUserCount);
    }
}
