package com.company.project.services.mobile.dashboard.admin;

import com.company.project.dto.mobile.dashboard.admin.AdminDashboardOperationalHighlightDTO;
import com.company.project.entities.FollowUp;
import com.company.project.entities.StaffAttendance;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.FollowUpRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.StaffAttendanceRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Operational highlights: staff actually clocked in during the selected window,
 * footfall (check-ins), renewals due in the next 7 days and pending follow-ups.
 * All four rows are always returned (zero when there is no data) so the card
 * layout never changes shape.
 *
 * There is no "expected staff" concept anywhere in the schema (no
 * shift-roster-with-headcount entity) — by explicit decision, staff attendance
 * shows only the real, clocked-in count rather than inventing a target to
 * compare it against.
 *
 * Renewals-due and pending-follow-ups use the same windows as
 * {@link AdminDashboardAlertService} so the highlight counts always agree with
 * the alert banners for the same request.
 */
@Service
public class AdminDashboardOperationalService {

    private static final int RENEWAL_WINDOW_DAYS = 7;

    private final StaffAttendanceRepository staffAttendanceRepository;
    private final AttendanceRepository attendanceRepository;
    private final MemberRepository memberRepository;
    private final FollowUpRepository followUpRepository;

    public AdminDashboardOperationalService(StaffAttendanceRepository staffAttendanceRepository,
                                             AttendanceRepository attendanceRepository,
                                             MemberRepository memberRepository,
                                             FollowUpRepository followUpRepository) {
        this.staffAttendanceRepository = staffAttendanceRepository;
        this.attendanceRepository = attendanceRepository;
        this.memberRepository = memberRepository;
        this.followUpRepository = followUpRepository;
    }

    public List<AdminDashboardOperationalHighlightDTO> getOperationalHighlights(AdminDashboardFilterContext ctx) {
        AdminDashboardDateRange range = ctx.getDateRange();

        List<StaffAttendance> clockIns = staffAttendanceRepository.findByDateRange(range.getStart(), range.getEnd());
        long distinctStaffClockedIn = clockIns.stream()
                .map(sa -> sa.getStaff() != null ? sa.getStaff().getId() : null)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .count();

        long footfall = attendanceRepository.countByDateRange(range.getStart(), range.getEnd());

        LocalDateTime referenceDate = range.getEnd();
        long renewalsDue = memberRepository
                .findExpiringBetween(referenceDate, referenceDate.plusDays(RENEWAL_WINDOW_DAYS))
                .size();

        long pendingFollowUps = followUpRepository.count(pendingFollowUpsInRange(range));

        return List.of(
                new AdminDashboardOperationalHighlightDTO("staff-attendance", "Staff Attendance",
                        String.valueOf(distinctStaffClockedIn)),
                new AdminDashboardOperationalHighlightDTO("footfall", footfallLabel(range),
                        pluralize(footfall, "visit", "visits")),
                new AdminDashboardOperationalHighlightDTO("renewals-due",
                        "Renewals Due (" + RENEWAL_WINDOW_DAYS + " days)",
                        pluralize(renewalsDue, "member", "members")),
                new AdminDashboardOperationalHighlightDTO("pending-follow-ups", "Pending Follow-ups",
                        pluralize(pendingFollowUps, "lead", "leads"))
        );
    }

    private static String footfallLabel(AdminDashboardDateRange range) {
        LocalDate today = LocalDate.now();
        boolean isToday = range.getFromDate().equals(today) && range.getToDate().equals(today);
        return isToday ? "Today's Footfall" : "Footfall";
    }

    private static String pluralize(long count, String singular, String plural) {
        return count + " " + (count == 1 ? singular : plural);
    }

    private Specification<FollowUp> pendingFollowUpsInRange(AdminDashboardDateRange range) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), "pending"));
            predicates.add(cb.greaterThanOrEqualTo(root.get("dueDate"), range.getStart()));
            predicates.add(cb.lessThan(root.get("dueDate"), range.getEnd()));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
