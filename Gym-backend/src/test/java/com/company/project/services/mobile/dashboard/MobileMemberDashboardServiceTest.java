package com.company.project.services.mobile.dashboard;

import com.company.project.dto.mobile.dashboard.MemberDashboardResponseDTO;
import com.company.project.entities.*;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.BookingRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.PromotionCampaignRepository;
import com.company.project.repositories.mobile.dashboard.MobileMemberDashboardBookingRepository;
import com.company.project.security.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MobileMemberDashboardServiceTest {

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private AttendanceRepository attendanceRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private MobileMemberDashboardBookingRepository dashboardBookingRepository;

    @Mock
    private PromotionCampaignRepository promotionCampaignRepository;

    @InjectMocks
    private MobileMemberDashboardService dashboardService;

    private UserDetailsImpl testPrincipal;
    private Member testMember;

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
        testMember.setPhone("+15551234567");
        testMember.setMembershipType("Premium");
        testMember.setMembershipPlan("Premium Annual");
        testMember.setMembershipStatus("active");
        testMember.setMembershipStartDate(LocalDateTime.now().minusMonths(2));
        testMember.setMembershipEndDate(LocalDateTime.now().plusMonths(10));
        testMember.setExpiryDate(LocalDateTime.now().plusMonths(10));
        testMember.setTotalVisits(24);
        testMember.setPaymentStatus("paid");
        testMember.setOutstandingBalance(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Should successfully return member dashboard dataset for authenticated member")
    void testGetMemberDashboardSuccess() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));

        // Active check-in mock
        when(attendanceRepository.existsActiveSessionForMember(eq(50L), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(true);

        Attendance activeAtt = new Attendance();
        activeAtt.setId(901L);
        activeAtt.setMember(testMember);
        activeAtt.setStatus("active");
        activeAtt.setCheckInTime(LocalDateTime.now().minusHours(1));

        Attendance pastAtt1 = new Attendance();
        pastAtt1.setId(900L);
        pastAtt1.setMember(testMember);
        pastAtt1.setStatus("completed");
        pastAtt1.setCheckInTime(LocalDateTime.now().minusDays(1));

        Attendance pastAtt2 = new Attendance();
        pastAtt2.setId(899L);
        pastAtt2.setMember(testMember);
        pastAtt2.setStatus("completed");
        pastAtt2.setCheckInTime(LocalDateTime.now().minusDays(2));

        when(attendanceRepository.findByMember_IdOrderByCheckInTimeDesc(50L))
                .thenReturn(List.of(activeAtt, pastAtt1, pastAtt2));

        // Schedule mock
        Staff trainer = new Staff();
        trainer.setId(10L);
        trainer.setName("Maya Singh");

        TrainingSession session = new TrainingSession();
        session.setId(201L);
        session.setName("Morning Yoga");
        session.setType("class");
        session.setTrainer(trainer);
        session.setDate(LocalDate.now());
        session.setStartTime(LocalTime.of(6, 0));
        session.setEndTime(LocalTime.of(7, 0));
        session.setDurationMinutes(60);
        session.setLocation("Studio A");
        session.setCapacity(20);

        Booking booking = new Booking();
        booking.setId(301L);
        booking.setMember(testMember);
        booking.setSession(session);
        booking.setStatus("confirmed");

        when(dashboardBookingRepository.findTodayBookingsByMemberId(eq(50L), eq(LocalDate.now())))
                .thenReturn(List.of(booking));
        when(bookingRepository.countBySessionIdAndStatusNot(201L, "cancelled")).thenReturn(17L);
        when(dashboardBookingRepository.countActiveBookingsByMemberId(50L)).thenReturn(4L);

        // Promotion mock
        PromotionCampaign promo = new PromotionCampaign();
        promo.setId(1L);
        promo.setName("Special Offer! 🎉");
        promo.setType("discount");
        promo.setDescription("Renew your membership now and get 15% off");
        promo.setDiscountType("percentage");
        promo.setDiscountValue(new BigDecimal("15.00"));
        promo.setCode("RENEW15");
        promo.setStartDate(LocalDate.now().minusDays(5));
        promo.setEndDate(LocalDate.now().plusDays(25));
        when(promotionCampaignRepository.findByStatusOrderByCreatedAtDesc("active"))
                .thenReturn(List.of(promo));

        MemberDashboardResponseDTO result = dashboardService.getMemberDashboard(testPrincipal);

        assertNotNull(result);

        // Verify Identity
        assertEquals("MBR-00050", result.getIdentity().getMemberId());
        assertEquals("Sarah Johnson", result.getIdentity().getName());
        assertEquals("sarah@example.com", result.getIdentity().getEmail());
        assertEquals("ROLE_MEMBER", result.getIdentity().getUserRole());

        // Verify Membership
        assertEquals("Premium Annual", result.getMembership().getPlanName());
        assertEquals("Premium", result.getMembership().getMembershipType());
        assertTrue(result.getMembership().isActive());
        assertTrue(result.getMembership().getDaysRemaining() > 290);
        assertEquals("paid", result.getMembership().getPaymentStatus());

        // Verify Check-In Status
        assertTrue(result.getCheckInStatus().isCheckedIn());
        assertEquals(901L, result.getCheckInStatus().getActiveAttendanceId());
        assertNotNull(result.getCheckInStatus().getCheckInTime());

        // Verify Schedule & Available Spots calculation
        assertEquals(1, result.getTodaysSchedule().size());
        assertEquals("Morning Yoga", result.getTodaysSchedule().get(0).getSessionName());
        assertEquals("Maya Singh", result.getTodaysSchedule().get(0).getTrainerName());
        assertEquals(20, result.getTodaysSchedule().get(0).getCapacity());
        assertEquals(17, result.getTodaysSchedule().get(0).getBookedCount());
        assertEquals(3, result.getTodaysSchedule().get(0).getAvailableSpots());

        // Verify Activity Stats
        assertEquals(24, result.getActivityStats().getTotalVisits());
        assertEquals(4, result.getActivityStats().getActiveBookingsCount());
        assertEquals(3, result.getActivityStats().getCurrentStreakDays()); // Today, yesterday, day before

        // Verify Promotion
        assertNotNull(result.getActivePromotion());
        assertEquals("RENEW15", result.getActivePromotion().getCode());

        verify(memberRepository, times(1)).findByUserId(101L);
    }

    @Test
    @DisplayName("Should throw EntityNotFoundException when principal is null")
    void testNullPrincipalThrows() {
        assertThrows(EntityNotFoundException.class, () -> dashboardService.getMemberDashboard(null));
        verifyNoInteractions(memberRepository);
    }

    @Test
    @DisplayName("Should throw EntityNotFoundException when principal has no linked Member record")
    void testNonMemberUserThrows() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.empty());

        EntityNotFoundException exception = assertThrows(
                EntityNotFoundException.class,
                () -> dashboardService.getMemberDashboard(testPrincipal)
        );

        assertTrue(exception.getMessage().contains("No member profile linked"));
        verify(memberRepository, times(1)).findByUserId(101L);
        verifyNoInteractions(attendanceRepository);
    }

    @Test
    @DisplayName("Should compute 0 days remaining when membership is inactive or expired")
    void testInactiveOrExpiredMembership() {
        testMember.setMembershipStatus("expired");
        testMember.setExpiryDate(LocalDateTime.now().minusDays(10));
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));
        when(attendanceRepository.findByMember_IdOrderByCheckInTimeDesc(50L)).thenReturn(Collections.emptyList());
        when(dashboardBookingRepository.findTodayBookingsByMemberId(eq(50L), any(LocalDate.class))).thenReturn(Collections.emptyList());
        when(dashboardBookingRepository.countActiveBookingsByMemberId(50L)).thenReturn(0L);
        when(promotionCampaignRepository.findByStatusOrderByCreatedAtDesc("active")).thenReturn(Collections.emptyList());

        MemberDashboardResponseDTO result = dashboardService.getMemberDashboard(testPrincipal);

        assertNotNull(result);
        assertFalse(result.getMembership().isActive());
        assertEquals(0, result.getMembership().getDaysRemaining());
        assertEquals("expired", result.getMembership().getStatus());
    }

    @Test
    @DisplayName("Should compute streak correctly when member visited yesterday but not yet today")
    void testStreakEndingYesterday() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));

        Attendance pastAtt1 = new Attendance();
        pastAtt1.setId(900L);
        pastAtt1.setMember(testMember);
        pastAtt1.setStatus("completed");
        pastAtt1.setCheckInTime(LocalDateTime.now().minusDays(1)); // Yesterday

        Attendance pastAtt2 = new Attendance();
        pastAtt2.setId(899L);
        pastAtt2.setMember(testMember);
        pastAtt2.setStatus("completed");
        pastAtt2.setCheckInTime(LocalDateTime.now().minusDays(2)); // Day before

        when(attendanceRepository.findByMember_IdOrderByCheckInTimeDesc(50L))
                .thenReturn(List.of(pastAtt1, pastAtt2));
        when(dashboardBookingRepository.findTodayBookingsByMemberId(eq(50L), any(LocalDate.class))).thenReturn(Collections.emptyList());
        when(dashboardBookingRepository.countActiveBookingsByMemberId(50L)).thenReturn(0L);
        when(promotionCampaignRepository.findByStatusOrderByCreatedAtDesc("active")).thenReturn(Collections.emptyList());

        MemberDashboardResponseDTO result = dashboardService.getMemberDashboard(testPrincipal);

        assertNotNull(result);
        assertFalse(result.getCheckInStatus().isCheckedIn());
        assertEquals(2, result.getActivityStats().getCurrentStreakDays());
    }

    @Test
    @DisplayName("Should filter out promotions outside active date window")
    void testPromotionDateWindowFiltering() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));
        when(attendanceRepository.findByMember_IdOrderByCheckInTimeDesc(50L)).thenReturn(Collections.emptyList());
        when(dashboardBookingRepository.findTodayBookingsByMemberId(eq(50L), any(LocalDate.class))).thenReturn(Collections.emptyList());
        when(dashboardBookingRepository.countActiveBookingsByMemberId(50L)).thenReturn(0L);

        PromotionCampaign futurePromo = new PromotionCampaign();
        futurePromo.setId(10L);
        futurePromo.setName("Future Promo");
        futurePromo.setStartDate(LocalDate.now().plusDays(5));
        futurePromo.setEndDate(LocalDate.now().plusDays(15));

        PromotionCampaign expiredPromo = new PromotionCampaign();
        expiredPromo.setId(11L);
        expiredPromo.setName("Past Promo");
        expiredPromo.setStartDate(LocalDate.now().minusDays(20));
        expiredPromo.setEndDate(LocalDate.now().minusDays(5));

        when(promotionCampaignRepository.findByStatusOrderByCreatedAtDesc("active"))
                .thenReturn(List.of(futurePromo, expiredPromo));

        MemberDashboardResponseDTO result = dashboardService.getMemberDashboard(testPrincipal);

        assertNotNull(result);
        assertNull(result.getActivePromotion());
    }
}
