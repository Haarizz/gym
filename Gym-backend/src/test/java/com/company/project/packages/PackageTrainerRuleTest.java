package com.company.project.packages;

import com.company.project.entities.PackageEnrolment;
import com.company.project.entities.Staff;
import com.company.project.entities.TrainingSession;
import com.company.project.performance.PerformanceClock;
import com.company.project.repositories.BookingRepository;
import com.company.project.repositories.MemberAddonRepository;
import com.company.project.repositories.PackageEnrolmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

/** A package covers only sessions with its own trainer; anyone else's session is paid for. */
class PackageTrainerRuleTest {

    @Mock private PackageEnrolmentRepository enrolments;
    @Mock private BookingRepository bookings;
    @Mock private MemberAddonRepository addons;
    @Mock private PerformanceClock clock;

    private PackageUsageService service;
    private PackageEnrolment enrolment;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new PackageUsageService(enrolments, bookings, addons, clock);
        enrolment = new PackageEnrolment();
        enrolment.setId(5L);
        enrolment.setMemberId(10L);
        enrolment.setTrainerId(1L);
        enrolment.setStartDate(LocalDate.now().minusDays(1));
        enrolment.setEndDate(LocalDate.now().plusDays(30));
        enrolment.setSessionsTotal(10);
        when(enrolments.bookingStatesFor(anyList())).thenReturn(List.of());
        when(enrolments.findByMemberIdAndStatusOrderByEndDateAsc(eq(10L), any())).thenReturn(List.of(enrolment));
    }

    private TrainingSession ptWith(Long trainerId) {
        TrainingSession s = new TrainingSession();
        s.setType("pt");
        s.setDate(LocalDate.now().plusDays(2));
        if (trainerId != null) {
            Staff t = new Staff();
            t.setId(trainerId);
            s.setTrainer(t);
        }
        return s;
    }

    @Test
    void ownTrainersSessionIsCovered() {
        assertNull(service.whyNotUsable(enrolment, ptWith(1L)));
        assertSame(enrolment, service.coverFor(10L, ptWith(1L)));
    }

    @Test
    void anotherTrainersSessionIsNotCovered() {
        assertNotNull(service.whyNotUsable(enrolment, ptWith(2L)));
        assertNull(service.coverFor(10L, ptWith(2L)));
    }

    @Test
    void sessionWithoutATrainerIsNotCovered() {
        assertNotNull(service.whyNotUsable(enrolment, ptWith(null)));
    }
}
