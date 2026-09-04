package com.company.project.services.mobile.dashboard;

import com.company.project.dto.mobile.dashboard.MemberDashboardResponseDTO;
import com.company.project.dto.mobile.dashboard.MemberDashboardResponseDTO.*;
import com.company.project.entities.Attendance;
import com.company.project.entities.Booking;
import com.company.project.entities.Member;
import com.company.project.entities.PromotionCampaign;
import com.company.project.entities.TrainingSession;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.BookingRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.PromotionCampaignRepository;
import com.company.project.repositories.mobile.dashboard.MobileMemberDashboardBookingRepository;
import com.company.project.security.UserDetailsImpl;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class MobileMemberDashboardService {

    private final MemberRepository memberRepository;
    private final AttendanceRepository attendanceRepository;
    private final BookingRepository bookingRepository;
    private final MobileMemberDashboardBookingRepository dashboardBookingRepository;
    private final PromotionCampaignRepository promotionCampaignRepository;

    public MobileMemberDashboardService(
            MemberRepository memberRepository,
            AttendanceRepository attendanceRepository,
            BookingRepository bookingRepository,
            MobileMemberDashboardBookingRepository dashboardBookingRepository,
            PromotionCampaignRepository promotionCampaignRepository) {
        this.memberRepository = memberRepository;
        this.attendanceRepository = attendanceRepository;
        this.bookingRepository = bookingRepository;
        this.dashboardBookingRepository = dashboardBookingRepository;
        this.promotionCampaignRepository = promotionCampaignRepository;
    }

    public MemberDashboardResponseDTO getMemberDashboard(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }

        Optional<Member> memberOpt = memberRepository.findByUserId(principal.getId());

        if (memberOpt.isEmpty()) {
            String role = principal.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .filter(auth -> auth.startsWith("ROLE_"))
                    .findFirst()
                    .orElse("ROLE_MEMBER");

            MemberIdentityDTO identity = new MemberIdentityDTO(
                    null,
                    principal.getUsername(),
                    principal.getEmail(),
                    null,
                    role
            );
            
            MembershipDetailsDTO membership = new MembershipDetailsDTO(
                    null, null, null, false, null, null, null, 0, null, null
            );

            CheckInStatusDTO checkInStatus = new CheckInStatusDTO(false, null, null);
            MemberActivityStatsDTO activityStats = new MemberActivityStatsDTO(0, 0, 0);

            return new MemberDashboardResponseDTO(
                    identity,
                    membership,
                    checkInStatus,
                    Collections.emptyList(),
                    activityStats,
                    null
            );
        }

        Member member = memberOpt.get();

        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(LocalTime.MAX);

        // 1. Identity
        String role = principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(auth -> auth.startsWith("ROLE_"))
                .findFirst()
                .orElse("ROLE_MEMBER");

        MemberIdentityDTO identity = new MemberIdentityDTO(
                member.getMemberId(),
                member.getName(),
                member.getEmail(),
                member.getPhone(),
                role
        );

        // 2. Membership Details
        boolean isActive = "active".equalsIgnoreCase(member.getMembershipStatus());
        Integer daysRemaining = computeDaysRemaining(member, today, isActive);

        MembershipDetailsDTO membership = new MembershipDetailsDTO(
                member.getMembershipPlan(),
                member.getMembershipType(),
                member.getMembershipStatus(),
                isActive,
                member.getMembershipStartDate(),
                member.getMembershipEndDate(),
                member.getExpiryDate(),
                daysRemaining,
                member.getPaymentStatus(),
                member.getOutstandingBalance()
        );

        // 3. Attendance History & Check-In Status
        List<Attendance> attendances = attendanceRepository.findByMember_IdOrderByCheckInTimeDesc(member.getId());

        boolean isCheckedIn = attendanceRepository.existsActiveSessionForMember(member.getId(), startOfDay, endOfDay);
        Long activeAttendanceId = null;
        LocalDateTime activeCheckInTime = null;

        if (isCheckedIn && attendances != null) {
            Attendance activeAttendance = attendances.stream()
                    .filter(a -> "active".equalsIgnoreCase(a.getStatus())
                            && a.getCheckInTime() != null
                            && !a.getCheckInTime().isBefore(startOfDay)
                            && !a.getCheckInTime().isAfter(endOfDay))
                    .findFirst()
                    .orElse(null);

            if (activeAttendance != null) {
                activeAttendanceId = activeAttendance.getId();
                activeCheckInTime = activeAttendance.getCheckInTime();
            }
        }

        CheckInStatusDTO checkInStatus = new CheckInStatusDTO(
                isCheckedIn,
                activeAttendanceId,
                activeCheckInTime
        );

        // 4. Today's Schedule
        List<Booking> todayBookings = dashboardBookingRepository.findTodayBookingsByMemberId(member.getId(), today);
        List<MemberScheduleItemDTO> scheduleItems = mapScheduleItems(todayBookings, today);

        // 5. Activity Stats (backed strictly by verified database records)
        int totalVisits = member.getTotalVisits() != null ? member.getTotalVisits() : (attendances != null ? attendances.size() : 0);
        int activeBookingsCount = (int) dashboardBookingRepository.countActiveBookingsByMemberId(member.getId());
        int streakDays = computeStreakDays(attendances, today);

        MemberActivityStatsDTO activityStats = new MemberActivityStatsDTO(
                totalVisits,
                activeBookingsCount,
                streakDays
        );

        // 6. Active Promotion (if supported and currently active)
        ActivePromotionDTO activePromotion = resolveActivePromotion(today);

        return new MemberDashboardResponseDTO(
                identity,
                membership,
                checkInStatus,
                scheduleItems,
                activityStats,
                activePromotion
        );
    }

    private Integer computeDaysRemaining(Member member, LocalDate today, boolean isActive) {
        if (!isActive) {
            return 0;
        }

        LocalDate expiry = null;
        if (member.getExpiryDate() != null) {
            expiry = member.getExpiryDate().toLocalDate();
        } else if (member.getMembershipEndDate() != null) {
            expiry = member.getMembershipEndDate().toLocalDate();
        }

        if (expiry == null || expiry.isBefore(today)) {
            return 0;
        }

        return (int) ChronoUnit.DAYS.between(today, expiry);
    }

    private List<MemberScheduleItemDTO> mapScheduleItems(List<Booking> bookings, LocalDate today) {
        if (bookings == null || bookings.isEmpty()) {
            return Collections.emptyList();
        }

        List<MemberScheduleItemDTO> items = new ArrayList<>();
        for (Booking booking : bookings) {
            TrainingSession session = booking.getSession();
            if (session == null) {
                continue;
            }

            int bookedCount = (int) bookingRepository.countBySessionIdAndStatusNot(session.getId(), "cancelled");
            int capacity = session.getCapacity() != null ? session.getCapacity() : 0;
            int availableSpots = Math.max(0, capacity - bookedCount);

            items.add(new MemberScheduleItemDTO(
                    booking.getId(),
                    session.getId(),
                    session.getName(),
                    session.getType(),
                    session.getTrainer() != null ? session.getTrainer().getName() : null,
                    session.getDate() != null ? session.getDate() : today,
                    session.getStartTime(),
                    session.getEndTime(),
                    session.getDurationMinutes(),
                    session.getLocation(),
                    capacity,
                    bookedCount,
                    availableSpots,
                    booking.getStatus()
            ));
        }

        return items;
    }

    private int computeStreakDays(List<Attendance> attendances, LocalDate today) {
        if (attendances == null || attendances.isEmpty()) {
            return 0;
        }

        Set<LocalDate> checkInDates = attendances.stream()
                .map(Attendance::getCheckInTime)
                .filter(Objects::nonNull)
                .map(LocalDateTime::toLocalDate)
                .collect(Collectors.toSet());

        if (checkInDates.isEmpty()) {
            return 0;
        }

        int streak = 0;
        LocalDate cursor = today;

        // If member hasn't visited today yet, check if they had a streak ending yesterday
        if (!checkInDates.contains(cursor)) {
            cursor = today.minusDays(1);
        }

        while (checkInDates.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }

        return streak;
    }

    private ActivePromotionDTO resolveActivePromotion(LocalDate today) {
        List<PromotionCampaign> activePromotions = promotionCampaignRepository.findByStatusOrderByCreatedAtDesc("active");
        if (activePromotions == null || activePromotions.isEmpty()) {
            return null;
        }

        for (PromotionCampaign promo : activePromotions) {
            boolean startsValid = promo.getStartDate() == null || !promo.getStartDate().isAfter(today);
            boolean endsValid = promo.getEndDate() == null || !promo.getEndDate().isBefore(today);

            if (startsValid && endsValid) {
                return new ActivePromotionDTO(
                        promo.getId(),
                        promo.getName(),
                        promo.getType(),
                        promo.getDescription(),
                        promo.getDiscountType(),
                        promo.getDiscountValue(),
                        promo.getCode(),
                        promo.getStartDate(),
                        promo.getEndDate()
                );
            }
        }

        return null;
    }
}
