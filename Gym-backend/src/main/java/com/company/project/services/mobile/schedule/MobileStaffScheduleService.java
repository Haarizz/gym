package com.company.project.services.mobile.schedule;

import com.company.project.dto.mobile.schedule.*;
import com.company.project.entities.FollowUp;
import com.company.project.entities.Lead;
import com.company.project.entities.Staff;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.FollowUpRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.FollowUpService;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class MobileStaffScheduleService {

    private final StaffRepository staffRepository;
    private final FollowUpRepository followUpRepository;
    private final FollowUpService followUpService;

    public MobileStaffScheduleService(StaffRepository staffRepository,
                                      FollowUpRepository followUpRepository,
                                      FollowUpService followUpService) {
        this.staffRepository = staffRepository;
        this.followUpRepository = followUpRepository;
        this.followUpService = followUpService;
    }

    public StaffScheduleResponseDTO getStaffSchedule(UserDetailsImpl principal, LocalDate selectedDate) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }

        Staff staff = staffRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new EntityNotFoundException("No staff record linked to this account"));
                
        if (selectedDate == null) {
            selectedDate = LocalDate.now();
        }

        LocalDateTime startOfDay = selectedDate.atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        LocalDate startOfWeek = selectedDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDateTime startOfWeekTime = startOfWeek.atStartOfDay();
        LocalDateTime endOfWeekTime = startOfWeek.plusDays(7).atStartOfDay();

        String staffName = staff.getName() != null ? staff.getName() : principal.getUsername();

        // Summary: today
        int todayCount = (int) followUpRepository.count(
                buildSpec(staffName, startOfDay, endOfDay, null, null)
        );

        // Summary: thisWeek
        int thisWeekCount = (int) followUpRepository.count(
                buildSpec(staffName, startOfWeekTime, endOfWeekTime, null, null)
        );

        // Summary: pending
        int pendingCount = (int) followUpRepository.count(
                buildSpec(staffName, null, null, "pending", null)
        );

        // Summary: highPriority (due on selected date)
        int highPriorityCount = (int) followUpRepository.count(
                buildSpec(staffName, startOfDay, endOfDay, null, "high")
        );

        StaffScheduleSummaryDTO summary = new StaffScheduleSummaryDTO(
                todayCount, thisWeekCount, pendingCount, highPriorityCount
        );

        // Today's Tasks
        List<FollowUp> todaysFollowUps = followUpRepository.findAll(
                buildSpec(staffName, startOfDay, endOfDay, null, null),
                Sort.by("dueDate").ascending()
        );
        List<StaffScheduleTaskDTO> tasks = todaysFollowUps.stream()
                .map(this::mapToTaskDTO)
                .collect(Collectors.toList());

        // Upcoming Follow-ups (pending/rescheduled and due after end of selected date)
        Specification<FollowUp> upcomingSpec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (staffName != null && !staffName.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("assignedStaff")), "%" + staffName.toLowerCase() + "%"));
            }
            predicates.add(cb.greaterThanOrEqualTo(root.get("dueDate"), endOfDay));
            predicates.add(root.get("status").in("pending", "rescheduled"));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        List<FollowUp> upcomingList = followUpRepository.findAll(
                upcomingSpec,
                PageRequest.of(0, 50, Sort.by("dueDate").ascending())
        ).getContent();
        
        List<UpcomingFollowUpDTO> upcomingFollowUps = upcomingList.stream()
                .map(this::mapToUpcomingDTO)
                .collect(Collectors.toList());

        return new StaffScheduleResponseDTO(selectedDate, summary, tasks, upcomingFollowUps);
    }

    @Transactional
    public void markTaskDone(UserDetailsImpl principal, Long taskId) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }

        Staff staff = staffRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new EntityNotFoundException("No staff record linked to this account"));
                
        FollowUp followUp = followUpRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Follow-up not found: " + taskId));
                
        String staffName = staff.getName() != null ? staff.getName() : principal.getUsername();
        if (followUp.getAssignedStaff() == null || !followUp.getAssignedStaff().toLowerCase().contains(staffName.toLowerCase())) {
             throw new IllegalArgumentException("Unauthorized to complete this follow-up");
        }
        
        // Delegate completion to existing service
        followUpService.complete(taskId, "Completed via Mobile", "Marked done from staff schedule");
    }

    private Specification<FollowUp> buildSpec(String staffName, LocalDateTime start, LocalDateTime end, String status, String priority) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (staffName != null && !staffName.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("assignedStaff")), "%" + staffName.toLowerCase() + "%"));
            }
            if (start != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("dueDate"), start));
            }
            if (end != null) {
                predicates.add(cb.lessThan(root.get("dueDate"), end));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (priority != null) {
                predicates.add(cb.equal(cb.lower(root.get("priority")), priority.toLowerCase()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private StaffScheduleTaskDTO mapToTaskDTO(FollowUp fu) {
        return new StaffScheduleTaskDTO(
                fu.getId(),
                fu.getDueDate(),
                fu.getType(),
                fu.getPriority(),
                fu.getStatus(),
                fu.getSubject(),
                mapToContactDTO(fu.getLead())
        );
    }

    private UpcomingFollowUpDTO mapToUpcomingDTO(FollowUp fu) {
        return new UpcomingFollowUpDTO(
                fu.getId(),
                fu.getDueDate(),
                fu.getSubject(),
                fu.getType(),
                mapToContactDTO(fu.getLead())
        );
    }

    private StaffScheduleContactDTO mapToContactDTO(Lead lead) {
        if (lead == null) return null;
        String name = (lead.getFirstName() + " " + (lead.getLastName() != null ? lead.getLastName() : "")).trim();
        return new StaffScheduleContactDTO(lead.getId(), name, lead.getPhone());
    }
}
