package com.company.project.services.mobile.schedule;

import com.company.project.dto.FollowUpRequestDTO;
import com.company.project.dto.FollowUpResponseDTO;
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
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.Map;
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
    public void markTaskDone(UserDetailsImpl principal, Long taskId, String outcome, String notes) {
        requireOwnFollowUp(principal, taskId);
        // The outcome drives the lead: "converted" marks it converted, "not-interested" marks it lost.
        followUpService.complete(taskId,
                outcome != null && !outcome.isBlank() ? outcome : "Completed via Mobile",
                notes != null && !notes.isBlank() ? notes : "Marked done from staff schedule");
    }

    /**
     * Books the next follow-up for the same lead, assigned to the calling staff member — the
     * "call them back on Friday" step after completing one.
     */
    @Transactional
    public FollowUpResponseDTO scheduleNextFollowUp(UserDetailsImpl principal, Long taskId, Map<String, String> body) {
        Staff staff = requireOwnFollowUp(principal, taskId);
        FollowUp previous = followUpRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Follow-up not found: " + taskId));
        if (previous.getLead() == null) {
            throw new IllegalArgumentException("This follow-up is not linked to a lead");
        }
        String dueDateRaw = body.get("due_date");
        if (dueDateRaw == null || dueDateRaw.isBlank()) {
            throw new IllegalArgumentException("due_date is required");
        }
        LocalDate dueDate = LocalDate.parse(dueDateRaw);
        String scheduledTime = body.get("scheduled_time");
        LocalTime time = parseTime(scheduledTime);

        FollowUpRequestDTO req = new FollowUpRequestDTO();
        req.setLeadId(previous.getLead().getId());
        req.setAssignedStaff(staff.getName() != null ? staff.getName() : principal.getUsername());
        req.setType(firstNonBlank(body.get("type"), previous.getType(), "call"));
        req.setPriority(firstNonBlank(body.get("priority"), previous.getPriority(), "medium"));
        req.setSubject(firstNonBlank(body.get("subject"), previous.getSubject(), "Follow-up"));
        req.setNotes(body.get("notes"));
        req.setStatus("pending");
        req.setDueDate(time != null ? dueDate.atTime(time) : dueDate.atStartOfDay());
        req.setScheduledTime(time != null ? scheduledTime : null);
        return followUpService.createFollowUp(req);
    }

    /** Resolves the calling staff member and checks the follow-up is assigned to them. */
    private Staff requireOwnFollowUp(UserDetailsImpl principal, Long taskId) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }

        Staff staff = staffRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new EntityNotFoundException("No staff record linked to this account"));

        FollowUp followUp = followUpRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Follow-up not found: " + taskId));

        String staffName = staff.getName() != null ? staff.getName() : principal.getUsername();
        if (followUp.getAssignedStaff() == null || !followUp.getAssignedStaff().toLowerCase().contains(staffName.toLowerCase())) {
             throw new IllegalArgumentException("Unauthorized to update this follow-up");
        }
        return staff;
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }

    /** Parses "HH:mm" / "HH:mm:ss" scheduled times; null when absent or unparseable. */
    private static LocalTime parseTime(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return LocalTime.parse(raw.trim());
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    /**
     * Follow-ups created with a separate scheduled time keep dueDate at midnight — fold the
     * time in so the schedule shows when the call is actually due instead of 12:00 AM.
     */
    private static LocalDateTime effectiveDueAt(FollowUp fu) {
        LocalDateTime due = fu.getDueDate();
        LocalTime time = parseTime(fu.getScheduledTime());
        if (due == null || time == null || !due.toLocalTime().equals(LocalTime.MIDNIGHT)) return due;
        return due.toLocalDate().atTime(time);
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
                effectiveDueAt(fu),
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
                effectiveDueAt(fu),
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
