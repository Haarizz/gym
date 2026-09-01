package com.company.project.services.mobile.checkin;

import com.company.project.dto.mobile.checkin.MemberCheckInResponseDTO;
import com.company.project.dto.mobile.checkin.MemberCheckInStatusResponseDTO;
import com.company.project.dto.mobile.checkin.MemberCheckOutResponseDTO;
import com.company.project.entities.Attendance;
import com.company.project.entities.Member;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.security.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDateTime;
import java.util.Collections;
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

    @InjectMocks
    private MobileMemberCheckInService checkInService;

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
        testMember.setMembershipStatus("active");
        testMember.setMembershipStartDate(LocalDateTime.now().minusMonths(2));
        testMember.setMembershipEndDate(LocalDateTime.now().plusMonths(10));
        testMember.setExpiryDate(LocalDateTime.now().plusMonths(10));
        testMember.setTotalVisits(10);
    }

    @Test
    @DisplayName("Should successfully check in eligible active member and increment total visits")
    void testCheckInSuccess() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));
        when(attendanceRepository.existsActiveSessionForMember(eq(50L), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(false);

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
        when(attendanceRepository.existsActiveSessionForMember(eq(50L), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(true);

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

        when(attendanceRepository.findByMember_IdOrderByCheckInTimeDesc(50L))
                .thenReturn(List.of(activeAttendance));

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
    @DisplayName("Should throw BusinessRuleViolationException when checking out without active session")
    void testCheckOutWithoutActiveSessionFails() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.of(testMember));

        Attendance completedAttendance = new Attendance();
        completedAttendance.setId(900L);
        completedAttendance.setMember(testMember);
        completedAttendance.setStatus("completed");
        completedAttendance.setCheckInTime(LocalDateTime.now().minusDays(1));

        when(attendanceRepository.findByMember_IdOrderByCheckInTimeDesc(50L))
                .thenReturn(List.of(completedAttendance));

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

        when(attendanceRepository.findByMember_IdOrderByCheckInTimeDesc(50L))
                .thenReturn(List.of(activeAttendance));

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
        when(attendanceRepository.findByMember_IdOrderByCheckInTimeDesc(50L))
                .thenReturn(Collections.emptyList());

        MemberCheckInStatusResponseDTO status = checkInService.getCheckInStatus(testPrincipal);

        assertNotNull(status);
        assertFalse(status.isCheckedIn());
        assertNull(status.getAttendanceId());
        assertNull(status.getCheckInTime());
    }

    @Test
    @DisplayName("Should throw EntityNotFoundException when principal is null")
    void testNullPrincipalThrows() {
        assertThrows(EntityNotFoundException.class, () -> checkInService.getCheckInStatus(null));
        assertThrows(EntityNotFoundException.class, () -> checkInService.checkIn(null));
        assertThrows(EntityNotFoundException.class, () -> checkInService.checkOut(null));
        verifyNoInteractions(memberRepository);
    }

    @Test
    @DisplayName("Should throw EntityNotFoundException when authenticated user has no linked member record")
    void testNonMemberUserThrows() {
        when(memberRepository.findByUserId(101L)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> checkInService.getCheckInStatus(testPrincipal));
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
        when(attendanceRepository.findByMember_IdOrderByCheckInTimeDesc(50L))
                .thenReturn(Collections.emptyList());

        // When Sarah attempts to check out, she cannot close Bob's session — it must fail
        assertThrows(BusinessRuleViolationException.class, () -> checkInService.checkOut(testPrincipal));

        // Bob's attendance session remains untouched
        assertEquals("active", bobAttendance.getStatus());
        verify(attendanceRepository, never()).save(bobAttendance);

        // Verification query was scoped strictly to Sarah's member ID (50L), never Bob's (99L)
        verify(attendanceRepository, times(1)).findByMember_IdOrderByCheckInTimeDesc(50L);
        verify(attendanceRepository, never()).findByMember_IdOrderByCheckInTimeDesc(99L);
    }
}
