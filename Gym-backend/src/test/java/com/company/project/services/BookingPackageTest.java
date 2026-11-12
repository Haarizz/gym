package com.company.project.services;

import com.company.project.dto.BookingRequestDTO;
import com.company.project.dto.BookingResponseDTO;
import com.company.project.entities.Booking;
import com.company.project.entities.Member;
import com.company.project.entities.PackageEnrolment;
import com.company.project.entities.TrainingSession;
import com.company.project.packages.PackageUsageService;
import com.company.project.repositories.BookingRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.PackageEnrolmentRepository;
import com.company.project.repositories.TrainingSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** A member's PT booking uses their training package: free, and never charged in the app. */
class BookingPackageTest {

    @Mock private BookingRepository bookingRepository;
    @Mock private TrainingSessionRepository sessionRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private NotificationService notificationService;
    @Mock private QrCodeService qrCodeService;
    @Mock private RewardRedemptionService rewardRedemptionService;
    @Mock private BookingPaymentService bookingPaymentService;
    @Mock private com.company.project.services.mobile.push.SessionMemberNotifier sessionMemberNotifier;
    @Mock private com.company.project.services.pos.PosBusinessDayService businessDay;
    @Mock private PackageUsageService packageUsage;
    @Mock private PackageEnrolmentRepository enrolmentRepository;

    private BookingService service;
    private TrainingSession session;
    private PackageEnrolment enrolment;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new BookingService(bookingRepository, sessionRepository, memberRepository, notificationService,
                qrCodeService, rewardRedemptionService, bookingPaymentService, sessionMemberNotifier, businessDay,
                packageUsage, enrolmentRepository);
        session = new TrainingSession();
        session.setId(1L);
        session.setType("pt");
        session.setPrice(new BigDecimal("150"));
        when(sessionRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(session));
        Member member = new Member();
        member.setId(10L);
        member.setMemberId("MBR-10");
        when(memberRepository.findById(10L)).thenReturn(Optional.of(member));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            if (b.getId() == null) b.setId(55L);
            return b;
        });
        enrolment = new PackageEnrolment();
        enrolment.setId(3L);
        enrolment.setPackageName("PT 15 Sessions");
        when(enrolmentRepository.findById(3L)).thenReturn(Optional.of(enrolment));
    }

    private BookingRequestDTO request() {
        BookingRequestDTO r = new BookingRequestDTO();
        r.setSessionId(1L);
        r.setMemberId(10L);
        return r;
    }

    @Test
    void packageCoversTheBooking() {
        when(packageUsage.pickFor(eq(10L), eq(session), isNull())).thenReturn(enrolment);
        BookingResponseDTO dto = service.createBooking(request());
        assertEquals(3L, dto.getEnrolmentId());
        assertEquals("PT 15 Sessions", dto.getPackageName());
        assertEquals(0, BigDecimal.ZERO.compareTo(dto.getPrice()));
    }

    @Test
    void appBookingWithAPackageIsNotCharged() {
        when(packageUsage.pickFor(eq(10L), eq(session), isNull())).thenReturn(enrolment);
        service.createBooking(request(), true);
        verify(bookingPaymentService, never()).charge(any(), any(), any(), any());
    }

    @Test
    void appBookingThatBringsAPaymentIsChargedNotCovered() {
        // The card was already verified before the booking runs, so it must be recorded, not dropped.
        BookingRequestDTO r = request();
        r.setExpectedAmount(new BigDecimal("150"));
        service.createBooking(r, true);
        verify(packageUsage, never()).pickFor(any(), any(), any());
        verify(bookingPaymentService).charge(any(), any(), any(), any());
    }

    @Test
    void appCantPayForASessionItsPackageCovers() {
        BookingRequestDTO r = request();
        r.setExpectedAmount(new BigDecimal("150"));
        r.setEnrolmentId(3L);
        assertThrows(com.company.project.exceptions.BusinessRuleViolationException.class, () -> service.createBooking(r, true));
    }

    @Test
    void withoutAPackageTheAppCharges() {
        service.createBooking(request(), true);
        verify(bookingPaymentService).charge(any(), any(), any(), any());
    }

    @Test
    void skipPackageBooksTheSessionOnItsOwn() {
        BookingRequestDTO r = request();
        r.setSkipPackage(true);
        BookingResponseDTO dto = service.createBooking(r);
        verify(packageUsage, never()).pickFor(any(), any(), any());
        assertNull(dto.getEnrolmentId());
        assertEquals(0, new BigDecimal("150").compareTo(dto.getPrice()));
    }

    @Test
    void usedAndHeldRules() {
        LocalDateTime t = LocalDateTime.of(2026, 1, 1, 7, 0);
        assertTrue(PackageUsageService.isUsed("checked-in", null, true));
        assertTrue(PackageUsageService.isUsed("confirmed", t, true));     // checked in at the door
        assertTrue(PackageUsageService.isUsed("no-show", null, true));
        assertFalse(PackageUsageService.isUsed("no-show", null, false));
        assertFalse(PackageUsageService.isUsed("cancelled", t, true));
        assertTrue(PackageUsageService.isHeld("confirmed", null, false)); // upcoming booking holds a session
        assertFalse(PackageUsageService.isHeld("no-show", null, false));  // handed back when no-shows don't count
        assertTrue(PackageUsageService.isHeld("no-show", null, true));
        assertFalse(PackageUsageService.isHeld("cancelled", null, true));
        assertFalse(PackageUsageService.isHeld("waitlisted", null, true));
    }
}
