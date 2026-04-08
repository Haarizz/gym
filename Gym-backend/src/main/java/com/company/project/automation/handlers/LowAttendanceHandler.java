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
 * Finds active members who haven't checked in for at least `threshold_days`.
 * Default: 14 days. Reuses the same DB query as MissedWorkoutHandler with
 * a longer window, so both triggers are distinct in intent but share the same
 * efficient query.
 */
@Component
public class LowAttendanceHandler implements TriggerHandler {

    private final MemberRepository memberRepository;

    public LowAttendanceHandler(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    @Override
    public String triggerType() { return "low_attendance"; }

    @Override
    public List<Member> findQualifyingMembers(AutomationWorkflow workflow) {
        Map<String, Object> params = TriggerParams.parse(workflow.getTriggerParams());
        int thresholdDays = TriggerParams.getInt(params, "threshold_days", 14);
        LocalDateTime cutoff = LocalDateTime.now().minusDays(thresholdDays);
        return memberRepository.findMembersAbsentSince(cutoff);
    }
}
