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
 * Finds members whose membership expires within `days_before` days.
 * Default: 7 days.
 */
@Component
public class MembershipExpiryHandler implements TriggerHandler {

    private final MemberRepository memberRepository;

    public MembershipExpiryHandler(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    @Override
    public String triggerType() { return "membership_expiry"; }

    @Override
    public List<Member> findQualifyingMembers(AutomationWorkflow workflow) {
        Map<String, Object> params = TriggerParams.parse(workflow.getTriggerParams());
        int daysBefore = TriggerParams.getInt(params, "days_before", 7);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime windowEnd = now.plusDays(daysBefore);

        // Apply segment filter if targetType = SEGMENT
        return memberRepository.findExpiringBetween(now, windowEnd);
    }
}
