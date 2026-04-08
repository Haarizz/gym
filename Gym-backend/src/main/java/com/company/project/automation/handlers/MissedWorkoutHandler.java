package com.company.project.automation.handlers;

import com.company.project.automation.TriggerHandler;
import com.company.project.automation.TriggerParams;
import com.company.project.entities.AutomationWorkflow;
import com.company.project.entities.Member;
import com.company.project.repositories.MemberRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Finds active members who haven't checked in for at least `consecutive_days`.
 * Default: 3 days.
 */
@Component
public class MissedWorkoutHandler implements TriggerHandler {

    private final MemberRepository memberRepository;

    public MissedWorkoutHandler(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    @Override
    public String triggerType() { return "missed_workout"; }

    @Override
    public List<Member> findQualifyingMembers(AutomationWorkflow workflow) {
        Map<String, Object> params = TriggerParams.parse(workflow.getTriggerParams());
        int consecutiveDays = TriggerParams.getInt(params, "consecutive_days", 3);
        LocalDateTime cutoff = LocalDateTime.now().minusDays(consecutiveDays);
        return memberRepository.findMembersAbsentSince(cutoff);
    }
}
