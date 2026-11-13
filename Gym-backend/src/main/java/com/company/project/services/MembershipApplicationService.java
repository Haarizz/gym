package com.company.project.services;

import com.company.project.dto.FamilyMemberDTO;
import com.company.project.dto.MemberRequestDTO;
import com.company.project.dto.MemberResponseDTO;
import com.company.project.dto.MembershipApplicationDTOs.ApplicationView;
import com.company.project.dto.PaymentSplitDTO;
import com.company.project.community.global.identity.TenantDataSources;
import com.company.project.entities.Branch;
import com.company.project.entities.MembershipApplication;
import com.company.project.entities.MembershipPlan;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.MembershipApplicationRepository;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.TenantContextHolder;
import com.company.project.services.email.MailErrors;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import java.util.stream.Collectors;

/**
 * The admin side of online membership applications (from the public Service
 * Portfolios link). Shown in Approvals → Applications.
 *
 * <p>Approval is the only way an application becomes a member: it creates the member
 * profile with the chosen plan through the normal {@link MemberService#createMember}
 * path (receipt, ledger, receipt voucher), starting today. A cash application needs
 * the admin to confirm the cash was received as part of approving; an online one must
 * already be paid. Rejecting a paid application marks its (simulated) payment refunded.
 *
 * <p>Applications follow the active branch like other branch records. Deciding one from
 * All Branches mode runs inside the application's own branch after checking the
 * admin may act there.
 *
 * <p>Once a decision is saved the applicant is emailed (approved: their member ID; rejected:
 * the reason as staff wrote it). Best effort, like every GymBios email: the decision stands
 * whatever happens to the email, and the outcome is kept on the application so staff can see
 * it and resend. Sent on the request thread after the decision's transaction has committed —
 * the gym's own mailbox (GymOS › Settings › Email) is found through the request's tenant.
 */
@Service
public class MembershipApplicationService {

    private static final Logger log = LoggerFactory.getLogger(MembershipApplicationService.class);

    private final MembershipApplicationRepository applicationRepository;
    private final MembershipPlanRepository planRepository;
    private final BranchRepository branchRepository;
    private final BranchService branchService;
    private final MemberService memberService;
    private final MemberRepository memberRepository;
    private final EmailService emailService;
    private final TenantDataSources tenantDataSources;
    private final ServicePortfolioService portfolioService;
    private final TransactionTemplate tx;

    public MembershipApplicationService(MembershipApplicationRepository applicationRepository,
                                        MembershipPlanRepository planRepository,
                                        BranchRepository branchRepository,
                                        BranchService branchService,
                                        MemberService memberService,
                                        MemberRepository memberRepository,
                                        EmailService emailService,
                                        TenantDataSources tenantDataSources,
                                        ServicePortfolioService portfolioService,
                                        PlatformTransactionManager transactionManager) {
        this.memberRepository = memberRepository;
        this.applicationRepository = applicationRepository;
        this.planRepository = planRepository;
        this.branchRepository = branchRepository;
        this.branchService = branchService;
        this.memberService = memberService;
        this.emailService = emailService;
        this.tenantDataSources = tenantDataSources;
        this.portfolioService = portfolioService;
        this.tx = new TransactionTemplate(transactionManager);
    }

    /**
     * status: "pending" (default) for the queue, "decided" for recent approvals/rejections.
     * Annotated (not the template) so BranchFilterAspect scopes it to the active branch.
     */
    @Transactional(readOnly = true)
    public List<ApplicationView> list(String status) {
        List<MembershipApplication> rows = "decided".equalsIgnoreCase(status)
                ? applicationRepository.findTop100ByApprovalStatusInOrderByDecidedAtDesc(
                        List.of(MembershipApplication.APPROVAL_APPROVED, MembershipApplication.APPROVAL_REJECTED))
                : applicationRepository.findByApprovalStatusOrderByCreatedAtDesc(MembershipApplication.APPROVAL_PENDING);
        Map<Long, String> branchNames = branchRepository.findAll().stream()
                .collect(Collectors.toMap(Branch::getId, b -> b.getBranchName() != null ? b.getBranchName() : "", (a, b) -> a));
        boolean emailConfigured = emailService.isConfigured();
        return rows.stream().map(a -> toView(a, branchNames.get(a.getBranchId()), emailConfigured)).toList();
    }

    @Transactional(readOnly = true)
    public long countPending() {
        return applicationRepository.countByApprovalStatus(MembershipApplication.APPROVAL_PENDING);
    }

    public ApplicationView approve(Long id, boolean cashReceived, String approvedBy) {
        return inApplicationBranch(id, () -> emailDecision(tx.execute(s -> {
            MembershipApplication app = lockPending(id);

            if (MembershipApplication.METHOD_CASH.equals(app.getPaymentMethod()) && !app.isPaid()) {
                if (!cashReceived) {
                    throw new BusinessRuleViolationException(
                            "Confirm you've received " + app.getAmount() + " in cash before approving.");
                }
                app.setPaymentStatus(MembershipApplication.PAYMENT_PAID);
                app.setPaymentReference("CASH");
                app.setPaidAt(LocalDateTime.now());
                app.setCashReceivedBy(approvedBy);
            }
            if (!app.isPaid()) {
                throw new BusinessRuleViolationException("This application hasn't been paid yet.");
            }

            MembershipPlan plan = planRepository.findById(app.getPlanId())
                    .filter(p -> "Active".equalsIgnoreCase(p.getStatus()))
                    .orElseThrow(() -> new BusinessRuleViolationException(
                            "The " + app.getPlanName() + " plan is no longer active. Reject this application"
                                    + " (the payment is refunded) and ask the applicant to apply again."));

            if (!app.getFamilyMembers().isEmpty()) requireHouseholdPrice(app, plan);
            MemberResponseDTO member = memberService.createMember(memberRequest(app, plan));
            app.setMemberId(Long.valueOf(member.getId()));
            app.setMemberCode(member.getMemberId());
            app.setApprovalStatus(MembershipApplication.APPROVAL_APPROVED);
            app.setDecidedBy(approvedBy);
            app.setDecidedAt(LocalDateTime.now());
            return applicationRepository.save(app);
        })));
    }

    public ApplicationView reject(Long id, String reason, String rejectedBy) {
        String why = reason == null ? "" : reason.trim();
        if (why.isEmpty()) throw new IllegalArgumentException("A rejection reason is required");
        return inApplicationBranch(id, () -> emailDecision(tx.execute(s -> {
            MembershipApplication app = lockPending(id);
            // The card charge is simulated, so the refund is too — recorded so the
            // payment and approval trails both read correctly.
            app.setPaymentStatus(app.isPaid() ? MembershipApplication.PAYMENT_REFUNDED : MembershipApplication.PAYMENT_VOID);
            app.setApprovalStatus(MembershipApplication.APPROVAL_REJECTED);
            app.setRejectionReason(why.length() > 2000 ? why.substring(0, 2000) : why);
            app.setDecidedBy(rejectedBy);
            app.setDecidedAt(LocalDateTime.now());
            return applicationRepository.save(app);
        })));
    }

    /** Emails the applicant their decision again, e.g. after the gym has set up its mailbox. */
    public ApplicationView resendDecisionEmail(Long id) {
        return inApplicationBranch(id, () -> {
            MembershipApplication app = applicationRepository.findById(id)
                    .orElseThrow(() -> new EntityNotFoundException("Application not found"));
            if (app.isAwaitingDecision()) {
                throw new BusinessRuleViolationException("This application hasn't been approved or rejected yet.");
            }
            return emailDecision(app);
        });
    }

    // ── Decision email ──────────────────────────────────────────────────────────

    /**
     * Called after the decision's transaction has committed. Never throws: the outcome is
     * recorded on the application and returned in the view.
     */
    private ApplicationView emailDecision(MembershipApplication app) {
        Branch branch = branchRepository.findById(app.getBranchId()).orElse(null);
        String branchName = branch != null ? branch.getBranchName() : null;
        boolean configured = emailService.isConfigured();
        String status;
        String error = null;
        if (!configured) {
            status = MembershipApplication.EMAIL_NOT_CONFIGURED;
        } else if (!StringUtils.hasText(app.getEmail())) {
            status = MembershipApplication.EMAIL_FAILED;
            error = "The application has no email address.";
        } else {
            try {
                MembershipApplicationEmails.Email email = decisionEmail(app, branch);
                emailService.sendEmail(app.getEmail().trim(), email.subject(), email.html());
                status = MembershipApplication.EMAIL_SENT;
            } catch (Exception e) {
                status = MembershipApplication.EMAIL_FAILED;
                error = MailErrors.explain(e, null, null);
                log.warn("Couldn't email the decision on membership application {} to the applicant: {}",
                        app.getId(), e.getMessage());
            }
        }
        app.setDecisionEmailStatus(status);
        app.setDecisionEmailError(error);
        app.setDecisionEmailAt(LocalDateTime.now());
        try {
            MembershipApplication saved = tx.execute(s -> applicationRepository.findById(app.getId()).map(fresh -> {
                fresh.setDecisionEmailStatus(app.getDecisionEmailStatus());
                fresh.setDecisionEmailError(app.getDecisionEmailError());
                fresh.setDecisionEmailAt(app.getDecisionEmailAt());
                return applicationRepository.save(fresh);
            }).orElse(app));
            return toView(saved != null ? saved : app, branchName, configured);
        } catch (Exception e) {
            // The decision is already saved; only the email's record is missing.
            log.warn("Couldn't record the decision email for membership application {}: {}", app.getId(), e.getMessage());
            return toView(app, branchName, configured);
        }
    }

    private MembershipApplicationEmails.Email decisionEmail(MembershipApplication app, Branch branch) {
        MembershipApplicationEmails.Context c = new MembershipApplicationEmails.Context(
                gymName(),
                branch != null ? branch.getBranchName() : null,
                branch != null ? branch.getPhone() : null,
                branch != null ? branch.getEmail() : null,
                portfolioService.currencyCode(app.getBranchId()));
        return MembershipApplication.APPROVAL_APPROVED.equals(app.getApprovalStatus())
                ? MembershipApplicationEmails.approved(app, c)
                : MembershipApplicationEmails.rejected(app, c);
    }

    /** The gym's display name (the same one the public join page shows). */
    private String gymName() {
        String tenant = TenantContextHolder.getCurrentTenant();
        if (tenant == null) return null;
        try {
            return tenantDataSources.gymName(tenant).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private MembershipApplication lockPending(Long id) {
        MembershipApplication app = applicationRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new EntityNotFoundException("Application not found"));
        if (!app.isAwaitingDecision()) {
            throw new BusinessRuleViolationException("This application has already been "
                    + app.getApprovalStatus().toLowerCase() + ".");
        }
        return app;
    }

    /**
     * Runs the decision inside the application's branch: records it creates (member,
     * receipt, voucher) belong there, and branch-scoped writes are refused in All
     * Branches mode. From All Branches the admin's access to that branch is checked first.
     */
    private <T> T inApplicationBranch(Long id, Supplier<T> work) {
        Long branchId = tx.execute(s -> applicationRepository.findById(id)
                .map(MembershipApplication::getBranchId)
                .orElseThrow(() -> new EntityNotFoundException("Application not found")));
        Long previous = BranchContextHolder.getActiveBranchId();
        if (previous == null) {
            branchService.resolveBranchForCreate(branchId);
        } else if (!previous.equals(branchId)) {
            throw new BusinessRuleViolationException("Switch to this application's branch to decide it.");
        }
        BranchContextHolder.setActiveBranchId(branchId);
        try {
            return work.get();
        } finally {
            BranchContextHolder.setActiveBranchId(previous);
        }
    }

    /**
     * For a Family / Couple plan createMember bills the household at the plan's CURRENT price
     * (per member × headcount, or the flat price). If that's no longer what the applicant paid —
     * the plan's price or offer changed since — creating the member would leave the receipt and
     * the payment out of step, so the admin is asked to reject (refunding it) instead.
     */
    private void requireHouseholdPrice(MembershipApplication app, MembershipPlan plan) {
        if (!MembershipPlan.isGroupPlanType(plan.getPlanType())) {
            throw new BusinessRuleViolationException("The " + app.getPlanName() + " plan is no longer a family or couple"
                    + " plan. Reject this application (the payment is refunded) and ask the applicant to apply again.");
        }
        int headcount = 1 + app.getFamilyMembers().size();
        BigDecimal expected;
        if (memberService.pricesPerMember(plan)) {
            expected = BigDecimal.ZERO;
            for (int i = 0; i < headcount; i++) expected = expected.add(memberService.memberPriceForIndex(plan, i));
        } else {
            expected = PlanOfferPricing.effectivePrice(plan);
        }
        if (expected.compareTo(app.getAmount()) != 0) {
            throw new BusinessRuleViolationException("The " + app.getPlanName() + " price for this household is now "
                    + expected + ", but the applicant paid " + app.getAmount() + ". Reject this application"
                    + " (the payment is refunded) and ask the applicant to apply again.");
        }
    }

    private MemberRequestDTO memberRequest(MembershipApplication app, MembershipPlan plan) {
        MemberRequestDTO r = new MemberRequestDTO();
        r.setName(app.getFullName());
        r.setPhone(app.getPhone());
        r.setEmail(app.getEmail());
        r.setGender(app.getGender());
        if (app.getDateOfBirth() != null) r.setDateOfBirth(app.getDateOfBirth().toString());
        r.setAddress(app.getAddress());
        r.setEmergencyContactName(app.getEmergencyContactName());
        r.setEmergencyContactPhone(app.getEmergencyContactPhone());
        if (StringUtils.hasText(app.getNotes())) r.setHealthNotes(app.getNotes());
        if (StringUtils.hasText(app.getMedicalConditions())) r.setMedicalConditions(app.getMedicalConditions());
        if (StringUtils.hasText(app.getRegDocNumber())) r.setRegDocNumber(app.getRegDocNumber());

        r.setMembershipPlanId(plan.getId());
        r.setMembershipType(StringUtils.hasText(plan.getPlanType()) ? plan.getPlanType() : "Standard");
        r.setMembershipStatus("Active");
        String now = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        r.setJoinDate(now);
        r.setMembershipStartDate(now);

        // Charged at the price the applicant saw (the plan's offer at the time), paid in full.
        r.setMembershipFee(app.getAmount());
        BigDecimal offer = app.getListPrice().subtract(app.getAmount());
        if (offer.signum() > 0) {
            r.setOfferDiscount(offer);
            r.setOfferLabel(PlanOfferPricing.receiptLabel(app.getOfferLabel()));
        }
        r.setOutstandingBalance(BigDecimal.ZERO);
        r.setPaymentStatus("paid");
        r.setLastPaymentDate(LocalDate.now().toString());

        boolean online = MembershipApplication.METHOD_ONLINE.equals(app.getPaymentMethod());
        PaymentSplitDTO leg = new PaymentSplitDTO();
        leg.setMethod(online ? "Card" : "Cash");
        leg.setAmount(app.getAmount());
        leg.setPaymentDate(LocalDate.now().toString());
        if (online) {
            leg.setCardType(app.getCardBrand());
            leg.setReference(app.getPaymentReference());
        }
        r.setPaymentMethodUsed(leg.getMethod());
        r.setPaymentBreakdown(List.of(leg));

        // Family / Couple: the applicant is the head; createMember adds everyone else, billed
        // to the head on the one invoice paid above (memberships start with the head's).
        if (!app.getFamilyMembers().isEmpty()) {
            r.setFamilyMembers(app.getFamilyMembers().stream().map(m -> {
                FamilyMemberDTO fm = new FamilyMemberDTO();
                fm.setName(m.name());
                fm.setRelationship(m.relationship());
                fm.setGender(m.gender());
                fm.setIsMinor(Boolean.TRUE.equals(m.minor()));
                fm.setDateOfBirth(m.dateOfBirth());
                fm.setPhone(m.phone());
                // Member emails are unique and optional for family members: one that already
                // belongs to another member is left off rather than failing the whole household.
                boolean emailTaken = StringUtils.hasText(m.email()) && memberRepository.existsByEmailIgnoreCase(m.email().trim());
                fm.setEmail(emailTaken ? null : m.email());
                return fm;
            }).collect(java.util.stream.Collectors.toCollection(java.util.ArrayList::new)));
        }
        return r;
    }

    private static ApplicationView toView(MembershipApplication a, String branchName, boolean emailConfigured) {
        return new ApplicationView(
                a.getId(), a.getReference(), a.getBranchId(), branchName,
                a.getFullName(), a.getPhone(), a.getEmail(), a.getGender(), a.getDateOfBirth(), a.getAddress(),
                a.getEmergencyContactName(), a.getEmergencyContactPhone(), a.getNotes(),
                a.getPlanId(), a.getPlanName(), a.getPlanDuration(), a.getListPrice(), a.getAmount(), a.getOfferLabel(),
                a.getPaymentMethod(), a.getPaymentStatus(), a.getPaymentReference(), a.getCardBrand(), a.getCardLast4(),
                a.getPaidAt(), a.getCashReceivedBy(),
                a.getApprovalStatus(), a.getDecidedBy(), a.getDecidedAt(), a.getRejectionReason(),
                a.getMemberId(), a.getMemberCode(), a.getCreatedAt(),
                a.getSource(), MembershipApplication.SOURCE_DESK.equals(a.getSource()) ? a.getCreatedBy() : null,
                a.getRegDocNumber(), a.getMedicalConditions(), a.getFamilyMembers(),
                a.getDecisionEmailStatus(), a.getDecisionEmailError(), a.getDecisionEmailAt(), emailConfigured);
    }
}
