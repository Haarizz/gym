package com.company.project.services;

import com.company.project.entities.Attendance;
import com.company.project.entities.CheckInSettings;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipPlan;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.MembershipPlanRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CheckInPolicyServiceTest {

    @Mock
    private AttendanceRepository attendanceRepository;

    @Mock
    private MembershipPlanRepository membershipPlanRepository;

    @Mock
    private CheckInSettingsService checkInSettingsService;

    @InjectMocks
    private CheckInPolicyService policy;

    private Member member;
    private MembershipPlan plan;
    private CheckInSettings settings;

    @BeforeEach
    void setUp() {
        member = new Member();
        member.setId(50L);
        member.setName("Sarah Johnson");
        member.setMembershipPlan("Gold");
        member.setMembershipStatus("active");

        plan = new MembershipPlan();
        plan.setName("Gold");
        plan.setAttendanceLimit("Unlimited");
        plan.setDurationValue("1");
        plan.setDurationType("months");

        settings = new CheckInSettings(); // cooldown 120, no minimum visit
        lenient().when(checkInSettingsService.forMember(any())).thenReturn(settings);
        lenient().when(membershipPlanRepository.findByName("Gold")).thenReturn(Optional.of(plan));
        lenient().when(attendanceRepository.findMemberAttendanceSince(eq(50L), any())).thenReturn(Collections.emptyList());
        lenient().when(attendanceRepository.findFirstByMember_IdAndCheckOutTimeIsNotNullOrderByCheckOutTimeDesc(50L))
                .thenReturn(Optional.empty());
    }

    private static Attendance visit(LocalDateTime in, Integer minutes) {
        Attendance a = new Attendance();
        a.setCheckInTime(in);
        if (minutes != null) {
            a.setCheckOutTime(in.plusMinutes(minutes));
            a.setTotalMinutes(minutes);
            a.setStatus("completed");
        }
        return a;
    }

    @Test
    @DisplayName("Unlimited plan with no visits today is allowed")
    void unlimitedAllowed() {
        CheckInPolicyService.Allowance a = policy.evaluate(member);
        assertTrue(a.canCheckIn());
        assertNull(a.limitValue());
        assertEquals(0, a.checkInsToday());
        assertDoesNotThrow(() -> policy.enforce(member));
    }

    @Test
    @DisplayName("Fourth check-in of the day is blocked")
    void dailyCapBlocks() {
        LocalDateTime today = LocalDateTime.now().toLocalDate().atStartOfDay();
        // Only use times before "now" so the test works early in the morning too.
        LocalDateTime now = LocalDateTime.now();
        List<Attendance> visits = List.of(
                visit(today.plusSeconds(1), 0),
                visit(today.plusSeconds(2), 0),
                visit(today.plusSeconds(3), 0));
        assertTrue(now.isAfter(today.plusSeconds(3)));
        when(attendanceRepository.findMemberAttendanceSince(eq(50L), any())).thenReturn(visits);

        BusinessRuleViolationException ex = assertThrows(BusinessRuleViolationException.class, () -> policy.enforce(member));
        assertTrue(ex.getMessage().contains("Daily limit reached"));
    }

    @Test
    @DisplayName("Check-in within the cooldown after a check-out is blocked")
    void cooldownBlocks() {
        Attendance last = visit(LocalDateTime.now().minusMinutes(70), 60); // checked out 10 min ago
        when(attendanceRepository.findFirstByMember_IdAndCheckOutTimeIsNotNullOrderByCheckOutTimeDesc(50L))
                .thenReturn(Optional.of(last));

        CheckInPolicyService.Allowance a = policy.evaluate(member);
        assertFalse(a.canCheckIn());
        assertNotNull(a.nextCheckInAllowedAt());
        assertTrue(a.blockedReason().contains("check in again at"));
    }

    @Test
    @DisplayName("Check-in after the cooldown has passed is allowed")
    void cooldownElapsedAllowed() {
        Attendance last = visit(LocalDateTime.now().minusMinutes(120 + 90), 60);
        when(attendanceRepository.findFirstByMember_IdAndCheckOutTimeIsNotNullOrderByCheckOutTimeDesc(50L))
                .thenReturn(Optional.of(last));

        assertTrue(policy.evaluate(member).canCheckIn());
    }

    @Test
    @DisplayName("Any check-out starts the cooldown — a workout break length doesn't open a re-entry window")
    void noReEntryAfterCheckOut() {
        settings.setBreakGraceMinutes(15);
        Attendance last = visit(LocalDateTime.now().minusMinutes(25), 20); // checked out 5 min ago
        when(attendanceRepository.findFirstByMember_IdAndCheckOutTimeIsNotNullOrderByCheckOutTimeDesc(50L))
                .thenReturn(Optional.of(last));

        CheckInPolicyService.Allowance a = policy.evaluate(member);
        assertFalse(a.canCheckIn());
        assertNotNull(a.nextCheckInAllowedAt());
    }

    @Test
    @DisplayName("The branch's cooldown setting replaces the 120-min default")
    void configuredCooldown() {
        settings.setCooldownMinutes(30);
        Attendance last = visit(LocalDateTime.now().minusMinutes(100), 60); // checked out 40 min ago
        when(attendanceRepository.findFirstByMember_IdAndCheckOutTimeIsNotNullOrderByCheckOutTimeDesc(50L))
                .thenReturn(Optional.of(last));

        assertTrue(policy.evaluate(member).canCheckIn());
    }

    @Test
    @DisplayName("Sessions-per-payment quota counts only the current paid cycle")
    void sessionQuotaPerPaymentCycle() {
        plan.setAttendanceLimit("Sessions");
        plan.setAttendanceValue(2);
        plan.setAttendancePeriod("Payment");
        LocalDateTime now = LocalDateTime.now();
        // Two cycles paid: started 1.5 months ago, renewed once, expires in 0.5 month.
        member.setMembershipStartDate(now.minusDays(45));
        member.setExpiryDate(now.minusDays(45).plusMonths(2));

        List<Attendance> visits = new ArrayList<>();
        visits.add(visit(now.minusDays(40), 60)); // previous cycle
        visits.add(visit(now.minusDays(35), 60)); // previous cycle
        visits.add(visit(now.minusDays(3), 60));  // current cycle
        when(attendanceRepository.findMemberAttendanceSince(eq(50L), any())).thenReturn(visits);

        CheckInPolicyService.Allowance a = policy.evaluate(member);
        assertEquals(1, a.used());
        assertEquals(2, a.limitValue());
        assertTrue(a.canCheckIn());

        // Query window starts at the current cycle (≈ 15 days ago), not the membership start.
        ArgumentCaptor<LocalDateTime> since = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(attendanceRepository).findMemberAttendanceSince(eq(50L), since.capture());
        assertTrue(since.getValue().isAfter(now.minusDays(20)));
    }

    @Test
    @DisplayName("Sessions quota reached blocks check-in")
    void sessionQuotaExhausted() {
        plan.setAttendanceLimit("Sessions");
        plan.setAttendanceValue(2);
        plan.setAttendancePeriod("Payment");
        LocalDateTime now = LocalDateTime.now();
        member.setMembershipStartDate(now.minusDays(10));
        member.setExpiryDate(now.minusDays(10).plusMonths(1));
        when(attendanceRepository.findMemberAttendanceSince(eq(50L), any())).thenReturn(List.of(
                visit(now.minusDays(5), 60),
                visit(now.minusDays(4), 60)));

        BusinessRuleViolationException ex = assertThrows(BusinessRuleViolationException.class, () -> policy.enforce(member));
        assertTrue(ex.getMessage().contains("used all 2 sessions"));
    }

    @Test
    @DisplayName("Days quota: another visit on an already-counted day is allowed")
    void daysQuotaSameDayAllowed() {
        plan.setAttendanceLimit("Days");
        plan.setAttendanceValue(1);
        plan.setAttendancePeriod("Week");
        LocalDateTime startOfToday = LocalDateTime.now().toLocalDate().atStartOfDay();
        member.setMembershipStartDate(startOfToday.minusMonths(1));
        when(attendanceRepository.findMemberAttendanceSince(eq(50L), any())).thenReturn(List.of(
                visit(startOfToday.plusSeconds(1), 0)));

        CheckInPolicyService.Allowance a = policy.evaluate(member);
        assertEquals(1, a.used());
        assertTrue(a.canCheckIn());
    }

    @Test
    @DisplayName("Hours quota reached blocks check-in")
    void hoursQuotaExhausted() {
        plan.setAttendanceLimit("Hours");
        plan.setAttendanceValue(2);
        plan.setAttendancePeriod("Month");
        LocalDateTime startOfToday = LocalDateTime.now().toLocalDate().atStartOfDay();
        member.setMembershipStartDate(startOfToday.minusMonths(3));
        when(attendanceRepository.findMemberAttendanceSince(eq(50L), any())).thenReturn(List.of(
                visit(startOfToday.plusSeconds(1), 120)));

        BusinessRuleViolationException ex = assertThrows(BusinessRuleViolationException.class, () -> policy.enforce(member));
        assertTrue(ex.getMessage().contains("used all 2 gym hours"));
    }
}
