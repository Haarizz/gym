package com.company.project.services.accounts;

import com.company.project.controlplane.entities.AccountLinkRequest;
import com.company.project.controlplane.repositories.AccountLinkRequestRepository;
import com.company.project.entities.Member;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MemberRepository;
import com.company.project.security.TenantContextHolder;
import com.company.project.services.GlobalMembershipService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The account owner's side of a gym's link request (MemberAppAccountService.requestLink):
 * they see it in the app without any gym selected, and only their accept links the
 * gym's member record to their account.
 *
 * Callers run without a tenant and must not hold an open-session-in-view
 * EntityManager — accept switches into the request's gym database for the link,
 * like MobileFamilyClaimController does for invitation claims.
 */
@Service
public class MobileAccountLinkService {

    private final AccountLinkRequestRepository linkRequestRepository;
    private final MemberRepository memberRepository;
    private final GlobalMembershipService globalMembershipService;
    private final GlobalAccountService accounts;
    private final MemberAppAccountService memberAppAccountService;

    public MobileAccountLinkService(AccountLinkRequestRepository linkRequestRepository,
                                    MemberRepository memberRepository,
                                    GlobalMembershipService globalMembershipService,
                                    GlobalAccountService accounts,
                                    MemberAppAccountService memberAppAccountService) {
        this.linkRequestRepository = linkRequestRepository;
        this.memberRepository = memberRepository;
        this.globalMembershipService = globalMembershipService;
        this.accounts = accounts;
        this.memberAppAccountService = memberAppAccountService;
    }

    public List<AccountLinkRequest> pending(long globalUserId) {
        return linkRequestRepository
                .findByGlobalUserIdAndStatusOrderByCreatedAtDesc(globalUserId, AccountLinkRequest.PENDING)
                .stream().filter(AccountLinkRequest::isOpen).toList();
    }

    /** Links the gym's member record to this account. Returns the request, now ACCEPTED. */
    public AccountLinkRequest accept(long requestId, long globalUserId) {
        AccountLinkRequest request = openRequestOf(requestId, globalUserId);

        String previousTenant = TenantContextHolder.getCurrentTenant();
        TenantContextHolder.setCurrentTenant(request.getTenantSlug());
        try {
            Member member = memberRepository.findById(request.getMemberId()).orElse(null);
            if (member == null) {
                close(request, AccountLinkRequest.CANCELLED);
                throw new BusinessRuleViolationException("This membership no longer exists at the gym.");
            }
            if (member.getGlobalUserId() != null && member.getGlobalUserId() != globalUserId) {
                close(request, AccountLinkRequest.CANCELLED);
                throw new BusinessRuleViolationException("This membership is already linked to another account.");
            }
            memberRepository.findByGlobalUserId(globalUserId)
                    .filter(other -> !other.getId().equals(member.getId()))
                    .ifPresent(other -> {
                        throw new BusinessRuleViolationException(
                                "Your account is already linked to a membership at this gym.");
                    });
            // Linking fills gaps both ways and overwrites nothing: the gym's record gets
            // details only the account has, the account gets details only the gym has.
            Map<IdentityField, Object> accountValues = accounts.readProfile(globalUserId);
            Set<IdentityField> missingOnAccount = EnumSet.noneOf(IdentityField.class);
            for (IdentityField f : IdentityField.values()) {
                if (IdentityField.blankToNull(accountValues.get(f)) == null && IdentityField.blankToNull(f.of(member)) != null) {
                    missingOnAccount.add(f);
                }
            }
            IdentityField.fillGaps(accountValues, member);
            memberAppAccountService.retireGymLogin(member);
            member.setGlobalUserId(globalUserId);
            memberRepository.save(member);
            globalMembershipService.recordLink(globalUserId, member.getId());
            accounts.writeProfile(globalUserId, IdentityField.valuesOf(member), missingOnAccount);
        } finally {
            if (previousTenant != null) {
                TenantContextHolder.setCurrentTenant(previousTenant);
            } else {
                TenantContextHolder.clear();
            }
        }
        return close(request, AccountLinkRequest.ACCEPTED);
    }

    public AccountLinkRequest decline(long requestId, long globalUserId) {
        return close(openRequestOf(requestId, globalUserId), AccountLinkRequest.DECLINED);
    }

    private AccountLinkRequest openRequestOf(long requestId, long globalUserId) {
        AccountLinkRequest request = linkRequestRepository.findById(requestId)
                .filter(r -> r.getGlobalUserId() == globalUserId)
                .orElseThrow(() -> new EntityNotFoundException("Link request not found."));
        if (!request.isOpen()) {
            throw new BusinessRuleViolationException("This link request is no longer open.");
        }
        return request;
    }

    private AccountLinkRequest close(AccountLinkRequest request, String status) {
        request.setStatus(status);
        request.setDecidedAt(LocalDateTime.now());
        return linkRequestRepository.save(request);
    }
}
