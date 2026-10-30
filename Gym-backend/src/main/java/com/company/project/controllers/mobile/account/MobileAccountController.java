package com.company.project.controllers.mobile.account;

import com.company.project.controlplane.entities.AccountLinkRequest;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.accounts.AccountSelfService;
import com.company.project.services.accounts.GlobalAccountService;
import com.company.project.services.accounts.MobileAccountLinkService;
import jakarta.persistence.EntityManagerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.jpa.EntityManagerFactoryUtils;
import org.springframework.orm.jpa.EntityManagerHolder;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * The signed-in person's own GymBios account: its email, and gyms asking to link a
 * membership to it. Strictly global (TenantContextFilter) — none of this depends on
 * the gym selected in the app. Gym-created logins (not yet moved to a GymBios
 * account, plan §4) have no account here.
 */
@RestController
@RequestMapping("/api/mobile/account")
public class MobileAccountController {

    public record AccountView(String username, String email, boolean emailVerified) {}

    public record LinkRequestView(Long id, String tenantSlug, String gymName, String memberName,
                                  LocalDateTime requestedAt, LocalDateTime expiresAt) {}

    private final AccountSelfService selfService;
    private final MobileAccountLinkService linkService;
    private final EntityManagerFactory entityManagerFactory;

    public MobileAccountController(AccountSelfService selfService, MobileAccountLinkService linkService,
                                   EntityManagerFactory entityManagerFactory) {
        this.selfService = selfService;
        this.linkService = linkService;
        this.entityManagerFactory = entityManagerFactory;
    }

    @GetMapping
    public ResponseEntity<AccountView> getAccount(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(view(selfService.account(requireGlobal(user))));
    }

    /** Body: { "email": "..." } — sets it unverified and emails a code. */
    @PutMapping("/email")
    public ResponseEntity<AccountSelfService.CodeSent> changeEmail(@AuthenticationPrincipal UserDetailsImpl user,
                                                                   @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(selfService.changeEmail(requireGlobal(user), body.get("email")));
    }

    @PostMapping("/email/send-code")
    public ResponseEntity<AccountSelfService.CodeSent> sendEmailCode(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(selfService.sendEmailCode(requireGlobal(user)));
    }

    /** Body: { "code": "123456" } */
    @PostMapping("/email/verify")
    public ResponseEntity<AccountView> verifyEmail(@AuthenticationPrincipal UserDetailsImpl user,
                                                   @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(view(selfService.verifyEmail(requireGlobal(user), body.get("code"))));
    }

    @GetMapping("/link-requests")
    public ResponseEntity<List<LinkRequestView>> linkRequests(@AuthenticationPrincipal UserDetailsImpl user) {
        if (!user.isGlobal()) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(linkService.pending(user.getId()).stream().map(MobileAccountController::view).toList());
    }

    /** Links the gym's member record to this account; the app then switches to that gym. */
    @PostMapping("/link-requests/{id}/accept")
    public ResponseEntity<LinkRequestView> accept(@AuthenticationPrincipal UserDetailsImpl user, @PathVariable Long id) {
        long globalUserId = requireGlobal(user);
        // The link is written in the request's gym database; an open-session-in-view
        // EntityManager would pin it to whichever database this request touched first.
        if (TransactionSynchronizationManager.hasResource(entityManagerFactory)) {
            EntityManagerHolder holder = (EntityManagerHolder) TransactionSynchronizationManager.unbindResource(entityManagerFactory);
            EntityManagerFactoryUtils.closeEntityManager(holder.getEntityManager());
        }
        return ResponseEntity.ok(view(linkService.accept(id, globalUserId)));
    }

    @PostMapping("/link-requests/{id}/decline")
    public ResponseEntity<LinkRequestView> decline(@AuthenticationPrincipal UserDetailsImpl user, @PathVariable Long id) {
        return ResponseEntity.ok(view(linkService.decline(id, requireGlobal(user))));
    }

    private static long requireGlobal(UserDetailsImpl user) {
        if (user == null || !user.isGlobal()) {
            throw new BusinessRuleViolationException("This sign-in isn't a GymBios account yet.");
        }
        return user.getId();
    }

    private static AccountView view(GlobalAccountService.Account a) {
        return new AccountView(a.username(), a.email(), a.emailVerified());
    }

    private static LinkRequestView view(AccountLinkRequest r) {
        return new LinkRequestView(r.getId(), r.getTenantSlug(), r.getGymName(), r.getMemberName(),
                r.getCreatedAt(), r.getExpiresAt());
    }
}
