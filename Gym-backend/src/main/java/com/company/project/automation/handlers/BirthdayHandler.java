package com.company.project.automation.handlers;

import com.company.project.automation.TriggerHandler;
import com.company.project.entities.AutomationWorkflow;
import com.company.project.entities.Member;
import com.company.project.repositories.MemberRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

/**
 * Finds members whose birthday is today.
 */
@Component
public class BirthdayHandler implements TriggerHandler {

    private final MemberRepository memberRepository;

    public BirthdayHandler(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    @Override
    public String triggerType() { return "birthday"; }

    @Override
    public List<Member> findQualifyingMembers(AutomationWorkflow workflow) {
        LocalDate today = LocalDate.now();
        return memberRepository.findBirthdayMembers(today.getMonthValue(), today.getDayOfMonth());
    }
}
