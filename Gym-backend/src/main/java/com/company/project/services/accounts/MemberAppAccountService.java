package com.company.project.services.accounts;

import com.company.project.community.global.identity.TenantDataSources;
import com.company.project.controlplane.entities.AccountLinkRequest;
import com.company.project.controlplane.repositories.AccountLinkRequestRepository;
import com.company.project.dto.MemberResponseDTO;
import com.company.project.entities.Member;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.controlplane.repositories.UserDirectoryRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.security.TenantContextHolder;
import com.company.project.services.EmailService;
import com.company.project.services.GlobalMembershipService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Staff side of a member's GymBios app account
 * (docs/global-accounts-for-gym-created-members-plan.md §1): create one at the desk,
 * or ask to link one that already exists. Either way the account belongs to the
 * person afterwards — nothing here edits, resets or disables it.
 */
@Service
public class MemberAppAccountService {

    private static final Logger log = LoggerFactory.getLogger(MemberAppAccountService.class);

    /** How long the account owner has to accept a link request in their app. */
    private static final int LINK_REQUEST_DAYS = 14;

    /**
     * NONE — no app account; GYM_LOGIN — an old gym-only login that no longer signs in
     * (plan §4: the migration moves these; staff can also replace it by creating or
     * linking a GymBios account); LINKED — a GymBios account; AWAITING_CONFIRMATION — a
     * link request is waiting for the account owner.
     */
    public record AppAccountStatus(String status, String username, String email, Boolean emailVerified,
                                   Long linkRequestId, String linkRequestedAccount, LocalDateTime linkRequestExpiresAt) {}

    private final MemberRepository memberRepository;
    private final GlobalAccountService accounts;
    private final GlobalMembershipService globalMembershipService;
    private final AccountLinkRequestRepository linkRequestRepository;
    private final TenantDataSources tenantDataSources;
    private final EmailService emailService;
    private final UserRepository userRepository;
    private final UserDirectoryRepository userDirectoryRepository;

    public MemberAppAccountService(MemberRepository memberRepository,
                                   GlobalAccountService accounts,
                                   GlobalMembershipService globalMembershipService,
                                   AccountLinkRequestRepository linkRequestRepository,
                                   TenantDataSources tenantDataSources,
                                   EmailService emailService,
                                   UserRepository userRepository,
                                   UserDirectoryRepository userDirectoryRepository) {
        this.memberRepository = memberRepository;
        this.accounts = accounts;
        this.globalMembershipService = globalMembershipService;
        this.linkRequestRepository = linkRequestRepository;
        this.tenantDataSources = tenantDataSources;
        this.emailService = emailService;
        this.userRepository = userRepository;
        this.userDirectoryRepository = userDirectoryRepository;
    }

    public AppAccountStatus status(Long memberId) {
        Member member = load(memberId);
        if (member.getGlobalUserId() != null) {
            return accounts.findById(member.getGlobalUserId())
                    .map(a -> new AppAccountStatus("LINKED", a.username(), a.email(), a.emailVerified(), null, null, null))
                    .orElse(new AppAccountStatus("LINKED", member.getAppUsername(), null, null, null, null, null));
        }
        if (member.getUserId() != null) {
            return new AppAccountStatus("GYM_LOGIN", member.getAppUsername(), null, null, null, null, null);
        }
        return openRequest(member.getId())
                .map(r -> new AppAccountStatus("AWAITING_CONFIRMATION", null, null, null, r.getId(),
                        accounts.findById(r.getGlobalUserId()).map(GlobalAccountService.Account::username).orElse(null),
                        r.getExpiresAt()))
                .orElse(new AppAccountStatus("NONE", null, null, null, null, null, null));
    }

    public MemberResponseDTO createAccount(Long memberId, String username, String password, String email) {
        return MemberResponseDTO.fromEntity(createForMember(load(memberId), username, password, email));
    }

    /**
     * Creates a GymBios account for this member and links it straight away — staff do
     * this with the person at the desk. Refused if the username or email already
     * belongs to any login: then it's probably the person's own account, and staff
     * must ask to link it instead (the owner confirms in their app).
     */
    public Member createForMember(Member member, String username, String password, String email) {
        if (member.getGlobalUserId() != null) {
            throw new BusinessRuleViolationException("This member already has an app account.");
        }
        GlobalAccountService.validateUsername(username);
        GlobalAccountService.validatePassword(password);
        String accountEmail = usableEmail(email != null && !email.isBlank() ? email : member.getEmail());
        accounts.findClash(username, accountEmail).ifPresent(clash -> {
            throw new BusinessRuleViolationException(clash == GlobalAccountService.Clash.USERNAME
                    ? "This username is already taken. Choose another one."
                    : "This email already belongs to a GymBios account — probably the member's own. Save the"
                        + " member without app login details, then use \"Link existing account\".");
        });

        long accountId = accounts.createDeskAccount(member.getName(), username, accountEmail, member.getPhone(),
                password, currentUsername());
        // The new account starts with everything the gym recorded about the person (plan §3).
        accounts.writeProfile(accountId, IdentityField.valuesOf(member), EnumSet.allOf(IdentityField.class));
        cancelOpenRequests(member.getId());
        retireGymLogin(member);
        member.setGlobalUserId(accountId);
        member.setAppUsername(username.trim());
        member.setAppAccessEnabled(true);
        Member saved = memberRepository.save(member);
        globalMembershipService.recordLink(accountId, saved.getId());
        return saved;
    }

    /**
     * Retires an old gym-only login once the member has a GymBios account: disabled
     * rather than deleted (other rows still reference it) and dropped from the login
     * directory. Same as the migration does (GymLoginMigrationService). The caller saves
     * the member.
     */
    public void retireGymLogin(Member member) {
        Long loginId = member.getUserId();
        if (loginId == null) {
            return;
        }
        userRepository.findById(loginId).ifPresent(login -> {
            login.setEnabled(false);
            userRepository.save(login);
            String tenant = TenantContextHolder.getCurrentTenant();
            userDirectoryRepository.findByUsername(login.getUsername())
                    .filter(entry -> tenant != null && tenant.equals(entry.getTenantSlug()))
                    .ifPresent(userDirectoryRepository::delete);
        });
        member.setUserId(null);
    }

    /**
     * Asks the owner of an existing GymBios account to link this member record. Nothing
     * is linked until they accept in their app (MobileAccountLinkService).
     */
    public AppAccountStatus requestLink(Long memberId, String usernameOrEmail) {
        Member member = load(memberId);
        if (member.getGlobalUserId() != null) {
            throw new BusinessRuleViolationException("This member already has an app account.");
        }
        if (usernameOrEmail == null || usernameOrEmail.isBlank()) {
            throw new IllegalArgumentException("Enter the member's GymBios username or email.");
        }
        GlobalAccountService.Account account = accounts.findMemberAccount(usernameOrEmail)
                .orElseThrow(() -> new EntityNotFoundException(
                        "No GymBios account found with that username or email."));
        memberRepository.findByGlobalUserId(account.id()).ifPresent(other -> {
            throw new BusinessRuleViolationException(
                    "That account is already linked to another member at this gym (" + other.getName() + ").");
        });

        String tenant = TenantContextHolder.getCurrentTenant();
        String gymName = tenant != null ? tenantDataSources.gymName(tenant).orElse(tenant) : null;
        cancelOpenRequests(member.getId());
        AccountLinkRequest request = new AccountLinkRequest();
        request.setGlobalUserId(account.id());
        request.setTenantSlug(tenant);
        request.setMemberId(member.getId());
        request.setGymName(gymName);
        request.setMemberName(member.getName());
        request.setRequestedBy(currentUsername());
        request.setExpiresAt(LocalDateTime.now().plusDays(LINK_REQUEST_DAYS));
        linkRequestRepository.save(request);

        if (account.email() != null && account.emailVerified()) {
            notifyByEmail(account.email(), gymName);
        }
        return status(memberId);
    }

    /**
     * A staff edit of a linked member's own details is copied to their GymBios account
     * once the gym's save has committed — never the other way round on a rollback.
     * Best-effort: a failure here never fails the staff edit.
     */
    public void copyToAccountAfterCommit(Member member, Set<IdentityField> fields) {
        Long accountId = member.getGlobalUserId();
        if (accountId == null || fields.isEmpty()) {
            return;
        }
        Map<IdentityField, Object> values = IdentityField.valuesOf(member);
        Runnable copy = () -> {
            try {
                accounts.writeProfile(accountId, values, fields);
            } catch (Exception e) {
                log.warn("Could not copy member {} details to account {}: {}", member.getId(), accountId, e.getMessage());
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    copy.run();
                }
            });
        } else {
            copy.run();
        }
    }

    public AppAccountStatus cancelLink(Long memberId) {
        cancelOpenRequests(load(memberId).getId());
        return status(memberId);
    }

    private java.util.Optional<AccountLinkRequest> openRequest(Long memberId) {
        String tenant = TenantContextHolder.getCurrentTenant();
        if (tenant == null) {
            return java.util.Optional.empty();
        }
        return linkRequestRepository.findByTenantSlugAndMemberIdAndStatus(tenant, memberId, AccountLinkRequest.PENDING)
                .stream().filter(AccountLinkRequest::isOpen).findFirst();
    }

    private void cancelOpenRequests(Long memberId) {
        String tenant = TenantContextHolder.getCurrentTenant();
        if (tenant == null) {
            return;
        }
        List<AccountLinkRequest> open = linkRequestRepository.findByTenantSlugAndMemberIdAndStatus(
                tenant, memberId, AccountLinkRequest.PENDING);
        for (AccountLinkRequest r : open) {
            r.setStatus(AccountLinkRequest.CANCELLED);
            r.setDecidedAt(LocalDateTime.now());
            linkRequestRepository.save(r);
        }
    }

    private void notifyByEmail(String email, String gymName) {
        if (!emailService.isConfigured()) {
            return;
        }
        String gym = gymName != null ? gymName : "A gym";
        try {
            emailService.sendEmail(email, gym + " wants to link your membership",
                    "<p><strong>" + HtmlUtils.htmlEscape(gym) + "</strong> asked to link your membership there to your"
                            + " GymBios account.</p><p>Open the GymBios app to accept or decline. Nothing is linked"
                            + " unless you accept.</p>");
        } catch (Exception e) {
            log.error("Failed to email link request to {}", email, e);
        }
    }

    // Family dependents without their own email get a placeholder address — never an account email.
    private static String usableEmail(String email) {
        if (email == null || email.isBlank() || email.trim().toLowerCase().endsWith("@family.local")) {
            return null;
        }
        return email.trim();
    }

    private Member load(Long memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found: " + memberId));
    }

    private static String currentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }
}
