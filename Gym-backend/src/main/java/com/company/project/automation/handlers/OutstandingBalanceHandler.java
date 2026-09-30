package com.company.project.automation.handlers;

import com.company.project.automation.TriggerHandler;
import com.company.project.entities.AutomationWorkflow;
import com.company.project.entities.Member;
import com.company.project.repositories.MemberRepository;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

/**
 * Finds members who still owe money on their membership (e.g. a Credit purchase
 * made on the Web and only partly paid). Balance-driven: a member qualifies only
 * while Member.outstandingBalance > 0, so settling the balance ends the reminders.
 * How often a qualifying member is reminded is the workflow's own frequency —
 * the executor's schedule and once-per-day guard are the cooldown.
 *
 * Excludes members whose mobile purchase is still awaiting (or was refused)
 * reception approval — their payment is reception's call, not theirs.
 */
@Component
public class OutstandingBalanceHandler implements TriggerHandler {

    public static final String TRIGGER_TYPE = "outstanding_balance";

    private final MemberRepository memberRepository;

    public OutstandingBalanceHandler(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    @Override
    public String triggerType() { return TRIGGER_TYPE; }

    @Override
    public List<Member> findQualifyingMembers(AutomationWorkflow workflow) {
        Specification<Member> hasBalance = (root, query, cb) -> cb.and(
                cb.isNotNull(root.get("outstandingBalance")),
                cb.greaterThan(root.get("outstandingBalance"), BigDecimal.ZERO));
        Specification<Member> approvalSettled = (root, query, cb) -> cb.or(
                cb.isNull(root.get("approvalStatus")),
                cb.equal(root.get("approvalStatus"), "APPROVED"));
        return memberRepository.findAll(hasBalance.and(approvalSettled));
    }
}
