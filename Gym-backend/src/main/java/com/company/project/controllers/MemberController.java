package com.company.project.controllers;

import com.company.project.dto.MemberRequestDTO;
import com.company.project.dto.MemberResponseDTO;
import com.company.project.dto.MembersPageResponseDTO;
import com.company.project.community.global.identity.TenantDataSources;
import com.company.project.security.TenantContextHolder;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.LeadService;
import com.company.project.services.MemberService;
import com.company.project.services.MembershipFreezeService;
import com.company.project.services.accounts.MemberAppAccountService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService memberService;
    private final MembershipFreezeService freezeService;
    private final LeadService leadService;
    private final com.company.project.services.FamilyPlanChangeService familyPlanChangeService;
    private final TenantDataSources tenantDataSources;
    private final MemberAppAccountService appAccountService;
    private final com.company.project.services.MemberSubscriptionTimelineService subscriptionTimelineService;

    public MemberController(MemberService memberService, MembershipFreezeService freezeService,
                            LeadService leadService,
                            com.company.project.services.FamilyPlanChangeService familyPlanChangeService,
                            TenantDataSources tenantDataSources,
                            MemberAppAccountService appAccountService,
                            com.company.project.services.MemberSubscriptionTimelineService subscriptionTimelineService) {
        this.memberService = memberService;
        this.freezeService = freezeService;
        this.leadService = leadService;
        this.familyPlanChangeService = familyPlanChangeService;
        this.tenantDataSources = tenantDataSources;
        this.appAccountService = appAccountService;
        this.subscriptionTimelineService = subscriptionTimelineService;
    }

    /**
     * GET /api/members?page=1&limit=20&search=&status=&membership_type=&payment_status=
     * Returns paginated list: { members: [...], pagination: {...} }
     */
    @GetMapping
    public ResponseEntity<MembersPageResponseDTO> getMembers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(name = "membership_type", required = false) String membershipType,
            @RequestParam(name = "payment_status",  required = false) String paymentStatus,
            @RequestParam(required = false) String plan,
            @RequestParam(name = "expiring_within", required = false) Integer expiringWithin,
            @RequestParam(required = false) String dues,
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int limit) {

        return ResponseEntity.ok(
                memberService.getMembers(search, status, membershipType, paymentStatus,
                        plan, expiringWithin, dues, page, limit)
        );
    }

    /**
     * GET /api/members/pending-approvals?page=1&limit=20
     * Mobile Cash/Credit/Mixed purchases awaiting reception approval — backs the
     * Approvals sidebar tab.
     */
    @GetMapping("/pending-approvals")
    public ResponseEntity<MembersPageResponseDTO> getPendingApprovals(
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(memberService.getPendingApprovals(page, limit));
    }

    /**
     * GET /api/members/approval-history?status=APPROVED|REJECTED&search=&page=1&limit=20
     * Mobile Cash/Credit/Mixed purchases staff already approved or rejected — backs
     * the Approvals > History sidebar tab. Omit status for both.
     */
    @GetMapping("/approval-history")
    public ResponseEntity<MembersPageResponseDTO> getApprovalHistory(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(memberService.getApprovalHistory(status, search, page, limit));
    }

    /**
     * GET /api/members/approval-history/summary
     * { "approved": n, "rejected": n } across all branches.
     */
    @GetMapping("/approval-history/summary")
    public ResponseEntity<java.util.Map<String, Long>> getApprovalHistorySummary() {
        return ResponseEntity.ok(memberService.getApprovalHistorySummary());
    }

    /**
     * POST /api/members/{id}/approve-payment
     * Body (optional): { "remarks": "..." }
     * Approves a mobile Cash/Credit/Mixed purchase awaiting reception approval —
     * unlocks the member's app access and posts the payment to the ledger.
     */
    @PostMapping("/{id}/approve-payment")
    public ResponseEntity<MemberResponseDTO> approveMemberPayment(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        String approvedBy = principal != null ? principal.getUsername() : "Admin";
        return ResponseEntity.ok(memberService.approveMemberPayment(id, approvedBy));
    }

    /**
     * POST /api/members/{id}/reject-payment
     * Body: { "reason": "..." }
     * Rejects a mobile Cash/Credit/Mixed purchase — the member stays locked out and
     * their membership is marked inactive.
     */
    @PostMapping("/{id}/reject-payment")
    public ResponseEntity<?> rejectMemberPayment(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        String reason = body != null ? body.get("reason") : null;
        if (reason == null || reason.isBlank()) {
            return ResponseEntity.badRequest().body("A rejection reason is required");
        }
        String rejectedBy = principal != null ? principal.getUsername() : "Admin";
        return ResponseEntity.ok(memberService.rejectMemberPayment(id, rejectedBy, reason));
    }

    /**
     * GET /api/members/me
     * Returns the member record for the currently authenticated user (extracted from JWT).
     */
    @GetMapping("/me")
    public ResponseEntity<?> getMyMembership(@AuthenticationPrincipal UserDetailsImpl principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        try {
            MemberResponseDTO me;
            if (principal.isGlobal()) {
                try {
                    me = memberService.getMemberByGlobalUserId(principal.getId());
                } catch (RuntimeException e) {
                    // Fallback for stale tokens with IS_GLOBAL_CLAIM=true but no globalUserId record
                    me = memberService.getMemberByUserId(principal.getId());
                }
            } else {
                me = memberService.getMemberByUserId(principal.getId());
            }
            // The app's pending/rejected/suspended screens name the gym this membership is at.
            String tenant = TenantContextHolder.getCurrentTenant();
            if (tenant != null) {
                me.setGymName(tenantDataSources.gymName(tenant).orElse(null));
            }
            return ResponseEntity.ok(me);
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body("No membership record found for this account.");
        }
    }

    /**
     * GET /api/members/by-user/{userId}
     * Returns the member record linked to the given app user account.
     */
    @GetMapping("/by-user/{userId}")
    public ResponseEntity<MemberResponseDTO> getMemberByUserId(@PathVariable Long userId) {
        return ResponseEntity.ok(memberService.getMemberByUserId(userId));
    }

    /**
     * GET /api/members/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<MemberResponseDTO> getMemberById(@PathVariable Long id) {
        return ResponseEntity.ok(memberService.getMemberById(id));
    }

    /**
     * POST /api/members
     */
    @PostMapping
    public ResponseEntity<MemberResponseDTO> createMember(@RequestBody MemberRequestDTO request) {
        // Registering a converted lead: credit the sale to the lead's staff unless someone
        // else was picked as "Processed By", and close the lead out as converted.
        Long leadId = request.getLeadId();
        if (leadId != null) {
            leadService.assertNotRegistered(leadId);
            if (request.getProcessedByStaffId() == null) {
                request.setProcessedByStaffId(leadService.resolveCreditedStaffId(leadId));
            }
        }
        MemberResponseDTO created = memberService.createMember(request);
        if (leadId != null) {
            leadService.linkRegisteredMember(leadId, Long.valueOf(created.getId()));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * PUT /api/members/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<MemberResponseDTO> updateMember(
            @PathVariable Long id,
            @RequestBody MemberRequestDTO request) {
        return ResponseEntity.ok(memberService.updateMember(id, request));
    }

    /**
     * DELETE /api/members/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMember(@PathVariable Long id) {
        memberService.deleteMember(id);
        leadService.unlinkMember(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/members/{id}/renew
     */
    @PostMapping("/{id}/renew")
    public ResponseEntity<MemberResponseDTO> renewMember(
            @PathVariable Long id,
            @RequestBody com.company.project.dto.RenewalRequestDTO request) {
        return ResponseEntity.ok(freezeService.renewEndingFreeze(id, request));
    }

    /**
     * POST /api/members/{id}/renew-minor
     * Renews a minor family member — bills the charge to their guardian's
     * account instead of creating an independent balance for the minor.
     */
    @PostMapping("/{id}/renew-minor")
    public ResponseEntity<MemberResponseDTO> renewFamilyMinor(
            @PathVariable Long id,
            @RequestBody com.company.project.dto.MinorRenewalRequestDTO request) {
        return ResponseEntity.ok(memberService.renewFamilyMinor(id, request));
    }

    /**
     * POST /api/members/{headId}/renew-family
     * Renews an entire family together in ONE invoice under family_head billing
     * mode — recalculates pricePerMember × current headcount and extends every
     * member's membership dates in sync.
     */
    @PostMapping("/{headId}/renew-family")
    public ResponseEntity<MemberResponseDTO> renewFamily(
            @PathVariable Long headId,
            @RequestBody com.company.project.dto.FamilyRenewalRequestDTO request) {
        return ResponseEntity.ok(freezeService.renewFamilyEndingFreeze(headId, request));
    }

    /**
     * POST /api/members/{headId}/family-plan-change/quote
     * What a Couple/Family renewal or plan change would do and cost — nothing is saved.
     */
    @PostMapping("/{headId}/family-plan-change/quote")
    public ResponseEntity<com.company.project.dto.FamilyPlanChangeQuoteDTO> quoteFamilyPlanChange(
            @PathVariable Long headId,
            @RequestBody com.company.project.dto.FamilyPlanChangeRequestDTO request) {
        return ResponseEntity.ok(familyPlanChangeService.quote(headId, request));
    }

    /**
     * POST /api/members/{headId}/family-plan-change
     * Renews the head on a plan and sets who is in their Couple/Family: keep, add new
     * people, link existing members, detach the rest (BG_75).
     */
    @PostMapping("/{headId}/family-plan-change")
    public ResponseEntity<MemberResponseDTO> applyFamilyPlanChange(
            @PathVariable Long headId,
            @RequestBody com.company.project.dto.FamilyPlanChangeRequestDTO request) {
        return ResponseEntity.ok(familyPlanChangeService.apply(headId, request));
    }

    /**
     * GET /api/members/{id}/family
     * Returns the family head plus all linked family members (adults + minors).
     */
    @GetMapping("/{id}/family")
    public ResponseEntity<com.company.project.dto.FamilyGroupResponseDTO> getFamilyGroup(@PathVariable Long id) {
        return ResponseEntity.ok(memberService.getFamilyGroup(id));
    }

    /**
     * POST /api/members/{headId}/family-members
     * Adds a new adult or minor family member to an existing family head.
     */
    @PostMapping("/{headId}/family-members")
    public ResponseEntity<MemberResponseDTO> addFamilyMember(
            @PathVariable Long headId,
            @RequestBody com.company.project.dto.FamilyMemberDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(memberService.addFamilyMember(headId, request));
    }

    /**
     * POST /api/members/{id}/freeze
     */
    @PostMapping("/{id}/freeze")
    public ResponseEntity<MemberResponseDTO> freezeMember(
            @PathVariable Long id,
            @RequestBody com.company.project.dto.FreezeRequestDTO request,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(freezeService.freezeByStaff(id, request, MembershipFreezeService.StaffActor.of(principal)));
    }

    /**
     * GET /api/members/{id}/freeze-allowance — freeze days/occurrences left in the current plan period
     */
    @GetMapping("/{id}/freeze-allowance")
    public ResponseEntity<java.util.Map<String, Object>> freezeAllowance(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(freezeService.getAllowanceView(id, MembershipFreezeService.StaffActor.of(principal)));
    }

    /**
     * GET /api/members/{id}/freezes — every freeze recorded for the member, newest first
     */
    @GetMapping("/{id}/freezes")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> freezeHistory(@PathVariable Long id) {
        return ResponseEntity.ok(freezeService.getHistoryView(id));
    }

    /**
     * GET /api/members/{id}/subscription-timeline — every plan period (bill, start,
     * expiry), the freezes in it and the expiry they moved to, plus add-ons and PT
     */
    @GetMapping("/{id}/subscription-timeline")
    public ResponseEntity<java.util.Map<String, Object>> subscriptionTimeline(@PathVariable Long id) {
        return ResponseEntity.ok(subscriptionTimelineService.getTimeline(id));
    }

    /**
     * POST /api/members/{id}/unfreeze
     */
    @PostMapping("/{id}/unfreeze")
    public ResponseEntity<MemberResponseDTO> unfreezeMember(@PathVariable Long id) {
        return ResponseEntity.ok(freezeService.unfreeze(id));
    }

    /**
     * POST /api/members/{id}/set-credentials
     * Body: { "appUsername": "...", "appPassword": "..." }
     * Kept for older clients: creates the member's own GymBios account, the same as
     * POST /app-account (replacing an old gym-only login if any). A GymBios account →
     * refused: it belongs to the member, who resets it themselves.
     */
    @PostMapping("/{id}/set-credentials")
    public ResponseEntity<?> setMemberCredentials(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        try {
            String appUsername = body.get("appUsername");
            String appPassword = body.get("appPassword");
            if (appPassword == null || appPassword.isBlank()) {
                return ResponseEntity.badRequest().body("Password is required");
            }
            return ResponseEntity.ok(memberService.setMemberCredentials(id, appUsername, appPassword));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * GET /api/members/{id}/app-account
     * NONE | GYM_LOGIN | LINKED | AWAITING_CONFIRMATION, with the account's username/email.
     */
    @GetMapping("/{id}/app-account")
    public ResponseEntity<MemberAppAccountService.AppAccountStatus> getAppAccount(@PathVariable Long id) {
        return ResponseEntity.ok(appAccountService.status(id));
    }

    /**
     * POST /api/members/{id}/app-account
     * Body: { "username", "password", "email" (optional — defaults to the member's) }
     * Creates the member's own GymBios account at the desk and links it. The gym can't
     * change or reset it afterwards.
     */
    @PostMapping("/{id}/app-account")
    public ResponseEntity<MemberResponseDTO> createAppAccount(@PathVariable Long id,
                                                              @RequestBody java.util.Map<String, String> body) {
        return ResponseEntity.ok(appAccountService.createAccount(id, body.get("username"), body.get("password"),
                body.get("email")));
    }

    /**
     * POST /api/members/{id}/app-account/link
     * Body: { "identifier": "username or email" }
     * Asks the owner of an existing GymBios account to link it; they accept in their app.
     */
    @PostMapping("/{id}/app-account/link")
    public ResponseEntity<MemberAppAccountService.AppAccountStatus> requestAccountLink(
            @PathVariable Long id, @RequestBody java.util.Map<String, String> body) {
        return ResponseEntity.ok(appAccountService.requestLink(id, body.get("identifier")));
    }

    /** DELETE /api/members/{id}/app-account/link — withdraws a pending link request. */
    @DeleteMapping("/{id}/app-account/link")
    public ResponseEntity<MemberAppAccountService.AppAccountStatus> cancelAccountLink(@PathVariable Long id) {
        return ResponseEntity.ok(appAccountService.cancelLink(id));
    }

    /**
     * POST /api/members/{id}/suspend
     * Body: { "reason": "..." } (optional)
     * Suspends this gym's membership. The member can still sign in to the app and use
     * Community and gym discovery; only this gym's member features are refused.
     */
    @PostMapping("/{id}/suspend")
    public ResponseEntity<MemberResponseDTO> suspendMembership(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        String reason = body != null ? body.get("reason") : null;
        String by = principal != null ? principal.getUsername() : "Admin";
        return ResponseEntity.ok(memberService.suspendMembership(id, reason, by));
    }

    /**
     * POST /api/members/{id}/resume
     */
    @PostMapping("/{id}/resume")
    public ResponseEntity<MemberResponseDTO> resumeMembership(@PathVariable Long id) {
        return ResponseEntity.ok(memberService.resumeMembership(id));
    }

    /**
     * PATCH /api/members/{id}/toggle-access
     * Body: { "enabled": true/false }
     * Deprecated alias of suspend/resume for older app builds — never disables the login.
     */
    @PatchMapping("/{id}/toggle-access")
    public ResponseEntity<?> toggleMemberAccess(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, Boolean> body,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        try {
            Boolean enabled = body.get("enabled");
            if (enabled == null) {
                return ResponseEntity.badRequest().body("Missing 'enabled' field");
            }
            String by = principal != null ? principal.getUsername() : "Admin";
            return ResponseEntity.ok(memberService.toggleMemberAccess(id, enabled, by));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
