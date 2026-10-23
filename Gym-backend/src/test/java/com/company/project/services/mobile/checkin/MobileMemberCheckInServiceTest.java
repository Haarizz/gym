package com.company.project.services.mobile.checkin;

import com.company.project.dto.mobile.checkin.MemberCheckInResponseDTO;
import com.company.project.dto.mobile.checkin.MemberCheckInStatusResponseDTO;
import com.company.project.dto.mobile.checkin.MemberCheckOutResponseDTO;
import com.company.project.dto.mobile.checkin.MemberBreakResponseDTO;
import com.company.project.entities.Attendance;
import com.company.project.entities.Member;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.StaffAttendanceRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.AttendanceSessionService;
import com.company.project.services.CheckInPolicyService;
import com.company.project.services.CheckInSettingsService;
import com.company.project.exceptions.MinVisitNotReachedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MobileMemberCheckInServiceTest {

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private AttendanceRepository attendanceRepository;

    @Mock
    private CheckInPolicyService checkInPolicyService;

    @Mock
    private StaffAttendanceRepository staffAttendanceRepository;

    @Mock
    private CheckInSettingsService checkInSettingsService;

    private MobileMemberCheckInService checkInService;

    private UserDetailsImpl testPrincipal;
    private Member testMember;

    @BeforeEach
    void setUp() {
        checkInService = new MobileMemberCheckInService(memberRepository, attendanceRepository, checkInPolicyService,
                new AttendanceSessionService(attendanceRepository, staffAttendanceRepository), checkInSettingsService);

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
        testMember.setMembershipStatus("active");
        testMember.setMembershipStartDate(LocalDateTime.now().minusMonths(2));
        testMember.setMembershipEndDate(LocalDateTime.now().plusMonths(10));
        testMember.setExpiryDate(LocalDateTime.now().plusMonths(10));
        testMember.setTotalVisits(10);

        lenient().when(checkInSettingsService.forMember(any(Member.class)))
                .thenReturn(new com.company.project.entities.CheckInSettings());
        lenient().when(checkInPolicyService.evaluate(any(Member.class))).thenReturn(
                new CheckInPolicyService.Allowance(null, null, null, null, 0, 3, null, null));
    }

    @Test
    @DisplayName("Should successfully check in eligible active member and increment total visits")
    void testCheckInSuccess() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));

        MemberCheckInResponseDTO response = checkInService.checkIn(testPrincipal);

        assertNotNull(response);
        assertTrue(response.isCheckedIn());
        assertNotNull(response.getCheckInTime());

        // Verify Attendance record creation with exact verified semantics
        ArgumentCaptor<Attendance> attendanceCaptor = ArgumentCaptor.forClass(Attendance.class);
        verify(attendanceRepository, times(1)).saveAndFlush(attendanceCaptor.capture());
        Attendance savedAttendance = attendanceCaptor.getValue();

        assertEquals(testMember, savedAttendance.getMember());
        assertEquals("active", savedAttendance.getStatus());
        assertEquals("member", savedAttendance.getType());
        assertEquals("app", savedAttendance.getCheckInMethod());
        assertEquals("MOBILE", savedAttendance.getDeviceId());
        assertEquals("member_id", savedAttendance.getResolvedBy());
        assertNotNull(savedAttendance.getCheckInTime());

        // Verify member total visits incremented
        assertEquals(11, testMember.getTotalVisits());
        verify(memberRepository, times(1)).save(testMember);
    }

    @Test
    @DisplayName("Should throw BusinessRuleViolationException on duplicate active check-in")
    void testDuplicateCheckInFails() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));
        stubOpenVisit(visit(LocalDateTime.now().minusMinutes(10)));

        BusinessRuleViolationException exception = assertThrows(
                BusinessRuleViolationException.class,
                () -> checkInService.checkIn(testPrincipal)
        );

        assertTrue(exception.getMessage().contains("already checked in"));
        verify(attendanceRepository, never()).saveAndFlush(any(Attendance.class));
        verify(memberRepository, never()).save(any(Member.class));
    }

    @Test
    @DisplayName("Should throw BusinessRuleViolationException when membership status is inactive or suspended")
    void testInactiveMembershipStatusCheckInFails() {
        testMember.setMembershipStatus("suspended");
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));

        BusinessRuleViolationException exception = assertThrows(
                BusinessRuleViolationException.class,
                () -> checkInService.checkIn(testPrincipal)
        );

        assertTrue(exception.getMessage().contains("membership is suspended"));
        verify(attendanceRepository, never()).saveAndFlush(any(Attendance.class));
    }

    @Test
    @DisplayName("Should refuse check-in for a staff-suspended membership, with staff's reason")
    void testStaffSuspendedMembershipCheckInFails() {
        testMember.setMembershipSuspended(true);
        testMember.setSuspendedReason("Unpaid locker fees");
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));

        BusinessRuleViolationException exception = assertThrows(
                BusinessRuleViolationException.class,
                () -> checkInService.checkIn(testPrincipal)
        );

        assertTrue(exception.getMessage().contains("membership is suspended"));
        assertTrue(exception.getMessage().contains("Unpaid locker fees"));
        verify(attendanceRepository, never()).saveAndFlush(any(Attendance.class));
    }

    @Test
    @DisplayName("Should throw BusinessRuleViolationException when membership has expired")
    void testExpiredMembershipCheckInFails() {
        testMember.setExpiryDate(LocalDateTime.now().minusDays(5));
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));

        BusinessRuleViolationException exception = assertThrows(
                BusinessRuleViolationException.class,
                () -> checkInService.checkIn(testPrincipal)
        );

        assertTrue(exception.getMessage().contains("membership expired"));
        verify(attendanceRepository, never()).saveAndFlush(any(Attendance.class));
    }

    @Test
    @DisplayName("Should successfully check out active attendance session and compute duration")
    void testCheckOutSuccess() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));

        Attendance activeAttendance = new Attendance();
        activeAttendance.setId(901L);
        activeAttendance.setMember(testMember);
        activeAttendance.setStatus("active");
        activeAttendance.setCheckInTime(LocalDateTime.now().minusMinutes(45));

        stubOpenVisit(activeAttendance);

        MemberCheckOutResponseDTO response = checkInService.checkOut(testPrincipal);

        assertNotNull(response);
        assertFalse(response.isCheckedIn());
        assertEquals(901L, response.getAttendanceId());
        assertNotNull(response.getCheckOutTime());
        assertTrue(response.getDurationMinutes() >= 44 && response.getDurationMinutes() <= 46);

        // Verify attendance state updated
        assertEquals("completed", activeAttendance.getStatus());
        assertNotNull(activeAttendance.getCheckOutTime());
        assertEquals(response.getDurationMinutes(), activeAttendance.getTotalMinutes());
        verify(attendanceRepository, times(1)).save(activeAttendance);
    }

    @Test
    @DisplayName("Check-out before the minimum visit time is refused for members")
    void testCheckOutBeforeMinimumVisitFails() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));

        Attendance activeAttendance = new Attendance();
        activeAttendance.setId(906L);
        activeAttendance.setMember(testMember);
        activeAttendance.setStatus("active");
        activeAttendance.setCheckInTime(LocalDateTime.now().minusMinutes(5));
        stubOpenVisit(activeAttendance);
        doThrow(new MinVisitNotReachedException("Minimum visit time is 30 min"))
                .when(checkInSettingsService).enforceMinVisit(activeAttendance, testMember);

        assertThrows(MinVisitNotReachedException.class, () -> checkInService.checkOut(testPrincipal));
        assertEquals("active", activeAttendance.getStatus());
        verify(attendanceRepository, never()).save(any(Attendance.class));
    }

    @Test
    @DisplayName("Should throw BusinessRuleViolationException when checking out without active session")
    void testCheckOutWithoutActiveSessionFails() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));

        Attendance completedAttendance = new Attendance();
        completedAttendance.setId(900L);
        completedAttendance.setMember(testMember);
        completedAttendance.setStatus("completed");
        completedAttendance.setCheckInTime(LocalDateTime.now().minusDays(1));

        // Only "active" visits are looked up, so a completed one is never returned.

        BusinessRuleViolationException exception = assertThrows(
                BusinessRuleViolationException.class,
                () -> checkInService.checkOut(testPrincipal)
        );

        assertTrue(exception.getMessage().contains("No active check-in session found"));
        verify(attendanceRepository, never()).save(any(Attendance.class));
    }

    @Test
    @DisplayName("Should return checkedIn = true with attendance ID and time when member has active session")
    void testGetCheckInStatusActive() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));

        Attendance activeAttendance = new Attendance();
        activeAttendance.setId(901L);
        activeAttendance.setMember(testMember);
        activeAttendance.setStatus("active");
        activeAttendance.setCheckInTime(LocalDateTime.now().minusMinutes(30));

        stubOpenVisit(activeAttendance);

        MemberCheckInStatusResponseDTO status = checkInService.getCheckInStatus(testPrincipal);

        assertNotNull(status);
        assertTrue(status.isCheckedIn());
        assertEquals(901L, status.getAttendanceId());
        assertEquals(activeAttendance.getCheckInTime(), status.getCheckInTime());
    }

    @Test
    @DisplayName("Should return checkedIn = false when member has no active session")
    void testGetCheckInStatusNotActive() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));

        MemberCheckInStatusResponseDTO status = checkInService.getCheckInStatus(testPrincipal);

        assertNotNull(status);
        assertFalse(status.isCheckedIn());
        assertNull(status.getAttendanceId());
        assertNull(status.getCheckInTime());
    }

    @Test
    @DisplayName("Should return empty status when principal is null")
    void testNullPrincipalThrows() {
        MemberCheckInStatusResponseDTO result = checkInService.getCheckInStatus(null);
        assertNotNull(result);
        assertFalse(result.isCheckedIn());

        assertThrows(EntityNotFoundException.class, () -> checkInService.checkIn(null));
        assertThrows(EntityNotFoundException.class, () -> checkInService.checkOut(null));
        verifyNoInteractions(memberRepository);
    }

    @Test
    @DisplayName("Should return empty status when authenticated user has no linked member record")
    void testNonMemberUserThrows() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.empty());

        MemberCheckInStatusResponseDTO result = checkInService.getCheckInStatus(testPrincipal);
        assertNotNull(result);
        assertFalse(result.isCheckedIn());

        assertThrows(EntityNotFoundException.class, () -> checkInService.checkIn(testPrincipal));
        assertThrows(EntityNotFoundException.class, () -> checkInService.checkOut(testPrincipal));
    }

    @Test
    @DisplayName("Explicit Member Scoping: Authenticated member can ONLY check in/out their own session, not another member's session")
    void testMemberScopingIsolation() {
        // Authenticated principal has userId 101L -> memberId 50L (Sarah)
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));

        // Create another member with memberId 99L (Bob)
        Member otherMember = new Member();
        otherMember.setId(99L);
        otherMember.setUserId(202L);
        otherMember.setName("Bob Smith");

        // Bob has an active attendance session
        Attendance bobAttendance = new Attendance();
        bobAttendance.setId(777L);
        bobAttendance.setMember(otherMember);
        bobAttendance.setStatus("active");
        bobAttendance.setCheckInTime(LocalDateTime.now().minusMinutes(20));

        // When searching attendance for Sarah (memberId 50L), Bob's attendance is NOT returned

        // When Sarah attempts to check out, she cannot close Bob's session — it must fail
        assertThrows(BusinessRuleViolationException.class, () -> checkInService.checkOut(testPrincipal));

        // Bob's attendance session remains untouched
        assertEquals("active", bobAttendance.getStatus());
        verify(attendanceRepository, never()).save(bobAttendance);

        // Verification query was scoped strictly to Sarah's member ID (50L), never Bob's (99L)
        verify(attendanceRepository, times(1)).findFirstByMember_IdAndStatusOrderByCheckInTimeDesc(50L, "active");
        verify(attendanceRepository, never()).findFirstByMember_IdAndStatusOrderByCheckInTimeDesc(eq(99L), anyString());
    }

    @Test
    @DisplayName("Should not create attendance when the check-in policy rejects the member")
    void testPolicyRejectionBlocksCheckIn() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));
        doThrow(new BusinessRuleViolationException("Daily limit reached"))
                .when(checkInPolicyService).enforce(testMember);

        assertThrows(BusinessRuleViolationException.class, () -> checkInService.checkIn(testPrincipal));
        verify(attendanceRepository, never()).saveAndFlush(any(Attendance.class));
        verify(memberRepository, never()).save(any(Member.class));
    }

    // ── Unclosed visit from an earlier day ───────────────────────────────────

    @Test
    @DisplayName("Check-in closes a visit left open from yesterday at the capped length, then checks in")
    void testCheckInAutoClosesStaleVisit() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));
        LocalDateTime yesterday = LocalDate.now().minusDays(1).atTime(9, 0);
        Attendance stale = visit(yesterday);
        stubOpenVisit(stale);

        MemberCheckInResponseDTO response = checkInService.checkIn(testPrincipal);

        assertTrue(response.isCheckedIn());
        assertEquals("completed", stale.getStatus());
        assertEquals(yesterday.plusMinutes(AttendanceSessionService.STALE_SESSION_MAX_MINUTES), stale.getCheckOutTime());
        assertEquals(AttendanceSessionService.STALE_SESSION_MAX_MINUTES, stale.getTotalMinutes());
        verify(attendanceRepository, times(2)).saveAndFlush(any(Attendance.class));
        assertEquals(11, testMember.getTotalVisits());
    }

    @Test
    @DisplayName("Status reports a stale visit as unclosed, not as checked in")
    void testStatusReportsUnclosedVisit() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));
        LocalDateTime yesterday = LocalDate.now().minusDays(1).atTime(18, 0);
        stubOpenVisit(visit(yesterday));

        MemberCheckInStatusResponseDTO status = checkInService.getCheckInStatus(testPrincipal);

        assertFalse(status.isCheckedIn());
        assertNull(status.getAttendanceId());
        assertEquals(901L, status.getUnclosedAttendanceId());
        assertEquals(yesterday, status.getUnclosedCheckInTime());
        assertEquals(yesterday.plusMinutes(AttendanceSessionService.STALE_SESSION_MAX_MINUTES), status.getUnclosedAutoCloseTime());
    }

    // ── Take Break ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("Take Break pauses the visit; break time is left out of the visit length")
    void testBreakAndResume() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));
        com.company.project.entities.CheckInSettings settings = new com.company.project.entities.CheckInSettings();
        settings.setBreakGraceMinutes(5);
        when(checkInSettingsService.forMember(testMember)).thenReturn(settings);
        Attendance current = visit(LocalDateTime.now().minusMinutes(60));
        stubOpenVisit(current);

        assertThrows(BusinessRuleViolationException.class, () -> checkInService.resumeFromBreak(testPrincipal));
        MemberBreakResponseDTO onBreak = checkInService.startBreak(testPrincipal);
        assertNotNull(onBreak.getBreakStartTime());
        assertEquals("active", current.getStatus()); // still checked in
        assertThrows(BusinessRuleViolationException.class, () -> checkInService.startBreak(testPrincipal));

        current.setBreakStartTime(LocalDateTime.now().minusMinutes(10));
        MemberBreakResponseDTO resumed = checkInService.resumeFromBreak(testPrincipal);
        assertNull(resumed.getBreakStartTime());
        assertEquals(10, resumed.getBreakMinutes());

        // A break still running at check-out is closed and left out too
        current.setBreakStartTime(LocalDateTime.now().minusMinutes(5));
        MemberCheckOutResponseDTO out = checkInService.checkOut(testPrincipal);
        assertNull(current.getBreakStartTime());
        assertTrue(out.getDurationMinutes() >= 44 && out.getDurationMinutes() <= 46); // 60 − 10 − 5
    }

    @Test
    @DisplayName("Take Break is refused when the branch has no quick break time")
    void testBreakDisabled() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));
        when(checkInSettingsService.forMember(testMember)).thenReturn(new com.company.project.entities.CheckInSettings());
        Attendance current = visit(LocalDateTime.now().minusMinutes(30));
        stubOpenVisit(current);

        assertThrows(BusinessRuleViolationException.class, () -> checkInService.startBreak(testPrincipal));
        assertNull(current.getBreakStartTime());
    }

    @Test
    @DisplayName("Take Break needs a check-in today")
    void testBreakRequiresCurrentVisit() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));
        assertThrows(BusinessRuleViolationException.class, () -> checkInService.startBreak(testPrincipal));

        stubOpenVisit(visit(LocalDate.now().minusDays(1).atTime(9, 0)));
        assertThrows(BusinessRuleViolationException.class, () -> checkInService.startBreak(testPrincipal));
        verify(attendanceRepository, never()).saveAndFlush(any(Attendance.class));
    }

    @Test
    @DisplayName("Checking out still ends a workout left running from before Start Workout was removed")
    void testCheckOutEndsLegacyWorkout() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));
        Attendance current = visit(LocalDateTime.now().minusMinutes(60));
        current.setWorkoutStartTime(LocalDateTime.now().minusMinutes(40));
        stubOpenVisit(current);

        checkInService.checkOut(testPrincipal);

        assertEquals(current.getCheckOutTime(), current.getWorkoutEndTime());
    }

    private Attendance visit(LocalDateTime checkInTime) {
        Attendance a = new Attendance();
        a.setId(901L);
        a.setMember(testMember);
        a.setStatus("active");
        a.setCheckInTime(checkInTime);
        return a;
    }

    private void stubOpenVisit(Attendance a) {
        when(attendanceRepository.findFirstByMember_IdAndStatusOrderByCheckInTimeDesc(50L, "active"))
                .thenReturn(Optional.of(a));
    }
}
