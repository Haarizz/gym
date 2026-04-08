package com.company.project.automation.handlers;

import com.company.project.automation.TriggerHandler;
import com.company.project.entities.AutomationWorkflow;
import com.company.project.entities.Member;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * The "new_signup" trigger is event-driven, NOT scheduler-driven.
 * AutomationExecutorService.handleEvent() calls the executor directly
 * with the newly-created member — this handler returns empty from
 * findQualifyingMembers() so the scheduler never re-fires it.
 */
@Component
public class NewSignupHandler implements TriggerHandler {

    @Override
    public String triggerType() { return "new_signup"; }

    @Override
    public List<Member> findQualifyingMembers(AutomationWorkflow workflow) {
        // Event-based: member is passed directly via handleEvent(), not polled
        return List.of();
    }
}
