package com.company.project.automation;

import com.company.project.entities.AutomationWorkflow;
import com.company.project.entities.Member;

import java.util.List;

/**
 * Strategy interface — one implementation per trigger type.
 * Each handler is responsible for querying the DB and returning
 * the list of members that qualify for the given workflow right now.
 */
public interface TriggerHandler {

    /** The trigger type string this handler responds to, e.g. "membership_expiry". */
    String triggerType();

    /**
     * Returns members that qualify for this workflow at the current moment.
     * Implementations must push filtering to the DB; never load all members.
     *
     * @param workflow The workflow being evaluated (use triggerParams + targetParams).
     * @return List of qualifying members (may be empty, never null).
     */
    List<Member> findQualifyingMembers(AutomationWorkflow workflow);
}
