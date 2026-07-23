package com.company.project.automation.handlers;

import com.company.project.automation.TriggerHandler;
import com.company.project.automation.TriggerParams;
import com.company.project.entities.AutomationWorkflow;
import com.company.project.entities.Member;
import com.company.project.repositories.BookingRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

/**
 * Finds members with a confirmed booking whose class starts within
 * `hours_before` hours from now. Default: 2 hours.
 */
@Component
public class ClassReminderHandler implements TriggerHandler {

    private final BookingRepository bookingRepository;

    public ClassReminderHandler(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    @Override
    public String triggerType() { return "class_reminder"; }

    @Override
    public List<Member> findQualifyingMembers(AutomationWorkflow workflow) {
        Map<String, Object> params = TriggerParams.parse(workflow.getTriggerParams());
        int hoursBefore = TriggerParams.getInt(params, "hours_before", 2);

        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        LocalTime windowEnd = now.plusHours(hoursBefore);

        return bookingRepository.findMembersWithUpcomingClass(today, now, windowEnd);
    }
}
