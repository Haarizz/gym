package com.company.project.services;

import com.company.project.dto.CenterTrainerDTO;
import com.company.project.dto.FacilityResponseDTO;
import com.company.project.dto.MembershipApplicationDTOs.*;
import com.company.project.dto.MembershipPlanResponseDTO;
import com.company.project.dto.TrainingSessionResponseDTO;
import com.company.project.entities.Branch;
import com.company.project.entities.BranchImage;
import com.company.project.entities.CatalogDisplaySection;
import com.company.project.entities.MembershipApplication;
import com.company.project.entities.MembershipPlan;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.BranchImageRepository;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.CatalogDisplaySectionRepository;
import com.company.project.repositories.FinancialSettingRepository;
import com.company.project.repositories.MembershipApplicationRepository;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.TenantContextHolder;
import com.company.project.services.mobile.staff.MobileMemberStaffService;
import com.company.project.services.payments.SimulatedCardCheckout;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * The public Service Portfolios link: an admin shares /join/{tenant}/{branch}/{token},
 * a visitor browses the branch's plans and services without logging in and applies
 * for a membership, paying cash at the gym or online (simulated card checkout).
 * An application never creates a member — staff approve it in the Approvals queue
 * ({@link MembershipApplicationService}).
 *
 * <p>Public methods expect the controller to have set the tenant + branch context.
 */
@Service
public class ServicePortfolioService {

    private static final Logger log = LoggerFactory.getLogger(ServicePortfolioService.class);

    static final String WALK_IN_PLAN_TYPE = "Walk-In";
    private static final Set<String> HOUSEHOLD_PLAN_TYPES = Set.of("family", "couple");
    private static final String TOKEN_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final String REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern TRAINER_ROLE = Pattern.compile("(?i).*(train|coach|instruct).*");
    private static final int SCHEDULE_DAYS = 30;
    private static final int MAX_SESSIONS = 60;

    private final BranchRepository branchRepository;
    private final BranchImageRepository branchImageRepository;
    private final CatalogDisplaySectionRepository catalogSectionRepository;
    private final FinancialSettingRepository financialSettingRepository;
    private final MembershipApplicationRepository applicationRepository;
    private final MembershipPlanService planService;
    private final FacilityService facilityService;
    private final TrainingStreamService streamService;
    private final TrainingSessionService sessionService;
    private final MobileMemberStaffService memberStaffService;
    private final SimulatedCardCheckout cardCheckout;
    private final NotificationService notificationService;
    private final SecureRandom random = new SecureRandom();

    public ServicePortfolioService(BranchRepository branchRepository,
                                   BranchImageRepository branchImageRepository,
                                   CatalogDisplaySectionRepository catalogSectionRepository,
                                   FinancialSettingRepository financialSettingRepository,
                                   MembershipApplicationRepository applicationRepository,
                                   MembershipPlanService planService,
                                   FacilityService facilityService,
                                   TrainingStreamService streamService,
                                   TrainingSessionService sessionService,
                                   MobileMemberStaffService memberStaffService,
                                   SimulatedCardCheckout cardCheckout,
                                   NotificationService notificationService) {
        this.branchRepository = branchRepository;
        this.branchImageRepository = branchImageRepository;
        this.catalogSectionRepository = catalogSectionRepository;
        this.financialSettingRepository = financialSettingRepository;
        this.applicationRepository = applicationRepository;
        this.planService = planService;
        this.facilityService = facilityService;
        this.streamService = streamService;
        this.sessionService = sessionService;
        this.memberStaffService = memberStaffService;
        this.cardCheckout = cardCheckout;
        this.notificationService = notificationService;
    }

    // ── Share link (staff, authenticated) ───────────────────────────────────────

    /** The active branch's share link, creating its token the first time. */
    @Transactional
    public ShareLink shareLink(boolean reset) {
        Branch branch = currentBranch();
        if (reset || !StringUtils.hasText(branch.getCatalogShareToken())) {
            branch.setCatalogShareToken(randomString(TOKEN_ALPHABET, 20));
            branchRepository.save(branch);
        }
        String tenantSlug = TenantContextHolder.getCurrentTenant();
        if (tenantSlug == null) {
            throw new IllegalStateException("Share links are only available inside a gym account");
        }
        return new ShareLink("/join/" + tenantSlug + "/" + branch.getId() + "/" + branch.getCatalogShareToken(),
                branch.getId(), branch.getBranchName());
    }

    private Branch currentBranch() {
        Long branchId = BranchContextHolder.getActiveBranchId();
        if (branchId == null) {
            // All Branches mode: share the default branch, like the walk-in QR does.
            branchId = branchRepository.findAll().stream()
                    .filter(Branch::isDefault).map(Branch::getId).findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Select a branch first"));
        }
        return branchRepository.findById(branchId)
                .orElseThrow(() -> new EntityNotFoundException("Branch not found"));
    }

    // ── Public page ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PublicCatalog describe(Long branchId, String token, String gymName) {
        Branch branch = openBranch(branchId, token);

        List<BranchImage> images = branchImageRepository.findByBranchIdOrderBySortOrderAsc(branchId);
        String cover = images.stream().filter(BranchImage::isCover).findFirst()
                .or(() -> images.stream().findFirst())
                .map(BranchImage::getImageUrl).orElse(null);

        // Same GymOS switches the in-app catalog follows (V47 defaults when a row is missing).
        Map<String, Boolean> sections = catalogSectionRepository.findAll().stream()
                .collect(Collectors.toMap(CatalogDisplaySection::getSectionKey, CatalogDisplaySection::isEnabled, (a, b) -> a));
        boolean showPlans = sections.getOrDefault("membership-plans", true);
        boolean showStreams = sections.getOrDefault("training-streams", true);
        boolean showClasses = sections.getOrDefault("classes", false);

        List<FacilityResponseDTO> facilities = facilityService.getFacilities("Active", null);
        Map<String, String> facilityNames = new HashMap<>();
        facilities.forEach(f -> facilityNames.put(f.getId(), f.getName()));

        List<PublicPlan> plans = showPlans
                ? publicPlans().stream().map(p -> toPublicPlan(p, facilityNames)).toList()
                : List.of();

        List<PublicStream> streams = !showStreams ? List.of() : streamService.getStreams(null, null, null).stream()
                // Recordings and links are members' content — the public page only teases what's on.
                .filter(s -> "Live".equals(s.getStatus()) || "Scheduled".equals(s.getStatus()))
                .map(s -> new PublicStream(s.getId(), s.getTitle(), s.getInstructorName(), s.getCategory(),
                        s.getDifficulty(), s.getDuration(), s.getStatus(), s.getScheduledTime(), s.getDescription()))
                .toList();

        List<PublicSession> classes = showClasses ? upcomingSessions("class") : List.of();
        List<PublicSession> programs = upcomingSessions("pt");

        Map<Long, MobileMemberStaffService.PublicTrainerExtras> trainerExtras =
                memberStaffService.getPublicTrainerExtras(branchId);
        List<PublicTrainer> trainers = memberStaffService.getCenterTrainers(branchId).stream()
                .filter(t -> TRAINER_ROLE.matcher(Objects.toString(t.getRole(), "") + " "
                        + Objects.toString(t.getDepartment(), "")).matches())
                .map(t -> toPublicTrainer(t, trainerExtras.get(t.getId())))
                .toList();

        return new PublicCatalog(
                gymName,
                branch.getBranchName(),
                branch.getAddress(),
                branch.getPhone(),
                branch.getEmail(),
                branch.getOperatingHours(),
                branch.getDescription(),
                branch.getTermsAndPolicies(),
                cover,
                images.stream().map(BranchImage::getImageUrl).toList(),
                currencyCode(branchId),
                true,
                plans,
                streams,
                classes,
                programs,
                facilities.stream()
                        .map(f -> new PublicFacility(f.getId(), f.getName(), f.getDescription(), f.getIconName()))
                        .toList(),
                trainers,
                BranchAccessPolicy.access(branch.getAccessType()).name());
    }

    /**
     * A visitor's application. ONLINE charges the simulated card first (a declined card
     * saves nothing); CASH is saved with payment PENDING until reception takes the money.
     * Either way approval stays PENDING — only staff approval creates the member.
     */
    @Transactional
    public ApplicationReceipt apply(Long branchId, String token, PublicApplication req) {
        Branch branch = openBranch(branchId, token);
        if (!Boolean.TRUE.equals(req.acceptTerms())) {
            throw new IllegalArgumentException("Please accept the terms to continue");
        }
        String method = req.paymentMethod() == null ? "" : req.paymentMethod().trim().toUpperCase(Locale.ROOT);
        if (!MembershipApplication.METHOD_CASH.equals(method) && !MembershipApplication.METHOD_ONLINE.equals(method)) {
            throw new IllegalArgumentException("Please choose how you'd like to pay");
        }

        MembershipApplication app = newApplication(branch, new Applicant(req.fullName(), req.phone(), req.email(),
                req.gender(), req.dateOfBirth(), req.address(), req.emergencyContactName(), req.emergencyContactPhone(),
                req.notes(), req.planId(), req.familyMembers()), false);
        app.setSource(MembershipApplication.SOURCE_SHARE_LINK);
        app.setPaymentMethod(method);

        if (MembershipApplication.METHOD_ONLINE.equals(method)) {
            SimulatedCardCheckout.Charge charge = cardCheckout.charge(req.card(), app.getAmount());
            app.setPaymentStatus(MembershipApplication.PAYMENT_PAID);
            app.setPaymentReference(charge.id());
            app.setCardBrand(charge.brand());
            app.setCardLast4(charge.last4());
            app.setPaidAt(LocalDateTime.now());
        } else {
            app.setPaymentStatus(MembershipApplication.PAYMENT_PENDING);
        }
        MembershipApplication saved = applicationRepository.save(app);
        notifyStaff(saved);

        String message = saved.isPaid()
                ? "Payment received. Your membership will be activated once the gym approves your application."
                : "Application received. Visit the gym and pay at reception — your membership is activated after that.";
        return receipt(saved, message);
    }

    /**
     * Staff raise an application for a walk-in from the Service Portfolios page
     * (Choose Plan or Member On-board), with the household on a Family / Couple plan. It waits in Approvals → Applications as a
     * cash application, exactly like one from the share link; approving it creates the member.
     * Runs in the staff user's active branch.
     */
    @Transactional
    public ApplicationReceipt applyAtDesk(DeskApplication req) {
        Long branchId = BranchContextHolder.getActiveBranchId();
        if (branchId == null) {
            throw new BusinessRuleViolationException("Switch to a branch before registering a new member.");
        }
        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new EntityNotFoundException("Branch not found"));

        MembershipApplication app = newApplication(branch, new Applicant(req.fullName(), req.phone(), req.email(),
                req.gender(), req.dateOfBirth(), req.address(), req.emergencyContactName(), req.emergencyContactPhone(),
                req.notes(), req.planId(), req.familyMembers()), true);
        app.setSource(MembershipApplication.SOURCE_DESK);
        app.setRegDocNumber(limit(trim(req.regDocNumber()), 100));
        app.setMedicalConditions(limit(trim(req.medicalConditions()), 2000));
        app.setPaymentMethod(MembershipApplication.METHOD_CASH);
        app.setPaymentStatus(MembershipApplication.PAYMENT_PENDING);
        MembershipApplication saved = applicationRepository.save(app);
        notifyStaff(saved);
        return receipt(saved, "Request sent to Approvals → Applications. Take payment at reception and approve it there.");
    }

    /** The fields both application paths collect. */
    private record Applicant(String fullName, String phone, String email, String gender, String dateOfBirth,
                             String address, String emergencyContactName, String emergencyContactPhone,
                             String notes, Long planId, List<ApplicationFamilyMember> familyMembers) {}

    /**
     * Validates the applicant and plan and builds an unsaved application. {@code desk}
     * only changes the wording of messages (staff are filling it in, not the visitor).
     */
    private MembershipApplication newApplication(Branch branch, Applicant req, boolean desk) {
        Long branchId = branch.getId();
        String name = trim(req.fullName());
        String phone = trim(req.phone());
        String email = trim(req.email());
        if (name == null || name.length() > 255) throw new IllegalArgumentException(desk ? "Please enter the full name" : "Please enter your full name");
        if (phone == null || phoneKey(phone).length() < 7 || phone.length() > 50) {
            throw new IllegalArgumentException("Please enter a valid phone number");
        }
        if (email == null || email.length() > 255 || !EMAIL.matcher(email).matches()) {
            throw new IllegalArgumentException("Please enter a valid email address");
        }
        String gender = trim(req.gender());
        if (gender == null) throw new IllegalArgumentException(desk ? "Please select the gender" : "Please select your gender");
        String refusal = BranchAccessPolicy.refusalReason(branch, gender, true);
        if (refusal != null) {
            throw new BusinessRuleViolationException(
                    (branch.getBranchName() != null ? branch.getBranchName() : "This branch")
                            + (desk ? " isn't open to this gender." : " isn't open to your gender."));
        }
        LocalDate dob = parseDob(req.dateOfBirth());

        MembershipPlanResponseDTO plan = publicPlans().stream()
                .filter(p -> p.getId().equals(req.planId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(desk
                        ? "That plan can't be requested here — it may be inactive or a walk-in day pass"
                        : "That plan is no longer available — please pick another"));
        // Family / Couple plans come with their household (both the share link and the desk form).
        if (!isJoinable(plan)) {
            throw new IllegalArgumentException(desk
                    ? "This plan's type isn't Family or Couple, so its household can't be added here — set it up through Add Member instead"
                    : "This plan is set up at reception — please contact the gym");
        }
        List<ApplicationFamilyMember> family = isHousehold(plan)
                ? householdMembers(branch, plan, req.familyMembers(), email)
                : List.of();
        BigDecimal listPrice = orZero(plan.getPrice());
        BigDecimal amount = plan.getEffectivePrice() != null ? plan.getEffectivePrice() : listPrice;
        if (!family.isEmpty() && MemberService.pricesPerMember(plan.getAutoCalculateTotal(), plan.getPricePerMember())) {
            // Per-member pricing, head included — the same total createMember bills on approval.
            amount = householdTotal(plan, 1 + family.size());
            listPrice = amount;
        }

        // One open application per phone number, so a double-tap or a second visit
        // doesn't charge twice or queue the applicant twice.
        String key = phoneKey(phone);
        applicationRepository.findByBranchIdAndApprovalStatus(branchId, MembershipApplication.APPROVAL_PENDING).stream()
                .filter(a -> key.equals(phoneKey(a.getPhone())))
                .findFirst()
                .ifPresent(existing -> {
                    throw new BusinessRuleViolationException(desk
                            ? "There's already a pending application for this phone number (reference "
                                    + existing.getReference() + ") in Approvals → Applications."
                            : "You already have an application under review (reference "
                                    + existing.getReference() + "). The gym will be in touch soon.");
                });

        MembershipApplication app = new MembershipApplication();
        app.setBranchId(branchId);
        app.setReference(newReference());
        app.setFullName(name);
        app.setPhone(phone);
        app.setEmail(email);
        app.setGender(gender);
        app.setDateOfBirth(dob);
        app.setAddress(limit(trim(req.address()), 1000));
        app.setEmergencyContactName(limit(trim(req.emergencyContactName()), 255));
        app.setEmergencyContactPhone(limit(trim(req.emergencyContactPhone()), 50));
        app.setNotes(limit(trim(req.notes()), 2000));
        app.setPlanId(plan.getId());
        app.setPlanName(plan.getName());
        app.setPlanDuration(plan.getDuration());
        app.setListPrice(listPrice);
        app.setAmount(amount);
        app.setOfferLabel(amount.compareTo(listPrice) < 0 ? plan.getOfferLabel() : null);
        app.setFamilyMembers(family);
        return app;
    }

    private ApplicationReceipt receipt(MembershipApplication saved, String message) {
        return new ApplicationReceipt(saved.getReference(), saved.getPlanName(), saved.getAmount(),
                currencyCode(saved.getBranchId()), saved.getPaymentMethod(), saved.getPaymentStatus(),
                saved.getApprovalStatus(), saved.getPaymentReference(), saved.getCardBrand(), saved.getCardLast4(),
                saved.getPaidAt(), message);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private Branch openBranch(Long branchId, String token) {
        Branch branch = branchRepository.findById(branchId).orElse(null);
        if (branch == null || !"ACTIVE".equalsIgnoreCase(branch.getStatus())
                || !StringUtils.hasText(branch.getCatalogShareToken()) || token == null
                || !MessageDigest.isEqual(branch.getCatalogShareToken().getBytes(StandardCharsets.UTF_8),
                        token.getBytes(StandardCharsets.UTF_8))) {
            throw new EntityNotFoundException("This link isn't available");
        }
        return branch;
    }

    /** Active plans a visitor can see — day passes belong to the walk-in QR page. */
    private List<MembershipPlanResponseDTO> publicPlans() {
        return planService.getPlans("Active").stream()
                .filter(p -> !WALK_IN_PLAN_TYPE.equalsIgnoreCase(p.getPlanType()))
                .toList();
    }

    /** Family / Couple by either type field. */
    private static boolean isHousehold(MembershipPlanResponseDTO plan) {
        String type = Objects.toString(plan.getPlanType(), "").trim().toLowerCase(Locale.ROOT);
        String mType = Objects.toString(plan.getType(), "").trim().toLowerCase(Locale.ROOT);
        return HOUSEHOLD_PLAN_TYPES.contains(type) || HOUSEHOLD_PLAN_TYPES.contains(mType);
    }

    /**
     * Whether a visitor can apply for the plan on the public page. Family / Couple plans can,
     * with their household — but only when the plan's own plan type is Family / Couple, since
     * that's what createMember keys the household (head, dependents, one invoice) on.
     */
    private static boolean isJoinable(MembershipPlanResponseDTO plan) {
        return !isHousehold(plan) || MembershipPlan.isGroupPlanType(plan.getPlanType());
    }

    private static boolean isCouple(MembershipPlanResponseDTO plan) {
        return "couple".equalsIgnoreCase(Objects.toString(plan.getPlanType(), "").trim());
    }

    private static BigDecimal householdTotal(MembershipPlanResponseDTO plan, int headcount) {
        BigDecimal total = BigDecimal.ZERO;
        for (int i = 0; i < headcount; i++) {
            total = total.add(MemberService.memberPriceForIndex(plan.getPricePerMember(), plan.getMaxFamilyMembers(),
                    plan.getAdditionalMemberPrice(), i));
        }
        return total;
    }

    private static PublicHousehold toPublicHousehold(MembershipPlanResponseDTO plan) {
        if (!isHousehold(plan) || !MembershipPlan.isGroupPlanType(plan.getPlanType())) return null;
        boolean perMember = MemberService.pricesPerMember(plan.getAutoCalculateTotal(), plan.getPricePerMember());
        boolean couple = isCouple(plan);
        return new PublicHousehold(
                couple ? "couple" : "family",
                couple ? Integer.valueOf(2) : positiveOrNull(plan.getMaxAdultMembers()),
                couple ? Integer.valueOf(0) : positiveOrNull(plan.getMaxChildMembers()),
                // Always the plan's own value: per-member pricing past this count uses additionalMemberPrice.
                positiveOrNull(plan.getMaxFamilyMembers()),
                !couple && !Boolean.FALSE.equals(plan.getAllowAdditionalMembers()),
                perMember ? plan.getPricePerMember() : null,
                perMember ? plan.getAdditionalMemberPrice() : null);
    }

    private static Integer positiveOrNull(Integer v) {
        return v != null && v > 0 ? v : null;
    }

    private static final int MAX_HOUSEHOLD_ROWS = 20;
    /** Same choices as the desk's Add Member family section (add-member.tsx FAMILY_RELATIONSHIPS). */
    private static final List<String> RELATIONSHIPS =
            List.of("Wife", "Husband", "Son", "Daughter", "Father", "Mother", "Brother", "Sister", "Other");

    /**
     * Validates the household the visitor entered for a Family / Couple plan, so approval doesn't
     * fail later on something the applicant could have fixed: names, relationship, gender (also
     * against Ladies Only / Men Only branches), the Couple rule and the plan's member caps.
     */
    private List<ApplicationFamilyMember> householdMembers(Branch branch, MembershipPlanResponseDTO plan,
                                                           List<ApplicationFamilyMember> rows, String headEmail) {
        // Member emails are unique, so no two people in the household can share one.
        Set<String> emailsUsed = new HashSet<>();
        if (headEmail != null) emailsUsed.add(headEmail.toLowerCase(Locale.ROOT));
        boolean couple = isCouple(plan);
        if (rows == null || rows.isEmpty()) {
            throw new IllegalArgumentException(couple ? "Please add your partner's details" : "Please add at least one family member");
        }
        if (rows.size() > MAX_HOUSEHOLD_ROWS) {
            throw new IllegalArgumentException("Too many family members — please contact the gym");
        }
        List<ApplicationFamilyMember> out = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            ApplicationFamilyMember r = rows.get(i);
            String who = couple ? "Your partner" : "Family member " + (i + 1);
            String name = trim(r == null ? null : r.name());
            if (name == null || name.length() > 255) throw new IllegalArgumentException(who + ": please enter their full name");
            String rel = RELATIONSHIPS.stream().filter(x -> x.equalsIgnoreCase(Objects.toString(trim(r.relationship()), "")))
                    .findFirst().orElseThrow(() -> new IllegalArgumentException(who + ": please choose their relationship to you"));
            String gender = trim(r.gender());
            if (gender == null) {
                String implied = MemberService.genderFromRelationship(rel);
                gender = implied == null ? null : implied.substring(0, 1).toUpperCase(Locale.ROOT) + implied.substring(1);
            }
            if (gender == null) throw new IllegalArgumentException(who + ": please select their gender");
            if (BranchAccessPolicy.refusalReason(branch, gender, true) != null) {
                throw new BusinessRuleViolationException(who + " (" + name + "): "
                        + (branch.getBranchName() != null ? branch.getBranchName() : "this branch")
                        + " isn't open to this gender.");
            }
            LocalDate dob = null;
            String dobText = trim(r.dateOfBirth());
            if (dobText != null) {
                try {
                    dob = LocalDate.parse(dobText.length() > 10 ? dobText.substring(0, 10) : dobText);
                } catch (DateTimeParseException e) {
                    throw new IllegalArgumentException(who + ": please enter a valid date of birth");
                }
                if (dob.isAfter(LocalDate.now()) || dob.isBefore(LocalDate.now().minusYears(110))) {
                    throw new IllegalArgumentException(who + ": please enter a valid date of birth");
                }
            }
            boolean minor = dob != null ? dob.isAfter(LocalDate.now().minusYears(18)) : Boolean.TRUE.equals(r.minor());
            String phone = limit(trim(r.phone()), 50);
            String email = trim(r.email());
            if (email != null && (email.length() > 255 || !EMAIL.matcher(email).matches())) {
                throw new IllegalArgumentException(who + ": please enter a valid email address or leave it blank");
            }
            if (email != null && !minor && !emailsUsed.add(email.toLowerCase(Locale.ROOT))) {
                throw new IllegalArgumentException(who + ": each person needs their own email address — use a different one or leave it blank");
            }
            out.add(new ApplicationFamilyMember(name, rel, gender, dob != null ? dob.toString() : null, minor,
                    minor ? null : phone, minor ? null : email));
        }
        if (couple && (out.size() != 1 || Boolean.TRUE.equals(out.get(0).minor()))) {
            throw new IllegalArgumentException("A couple plan is for you and one adult partner");
        }
        long adults = 1 + out.stream().filter(m -> !Boolean.TRUE.equals(m.minor())).count();
        long children = out.stream().filter(m -> Boolean.TRUE.equals(m.minor())).count();
        MemberService.enforceFamilyMemberCaps(plan.getMaxAdultMembers(), plan.getMaxChildMembers(),
                plan.getMaxFamilyMembers(), plan.getAllowAdditionalMembers(), adults, children);
        return out;
    }

    private static PublicPlan toPublicPlan(MembershipPlanResponseDTO plan, Map<String, String> facilityNames) {
        // Same wording as the in-app catalog cards (service-portfolios.tsx getPlanFeatures).
        List<String> features = new ArrayList<>();
        features.add(plan.getMaxSessions() != null && plan.getMaxSessions() > 0
                ? plan.getMaxSessions() + " sessions included" : "Unlimited sessions");
        if (plan.getAttendanceLimit() != null && !"Unlimited".equalsIgnoreCase(plan.getAttendanceLimit())
                && plan.getAttendanceValue() != null) {
            features.add(plan.getAttendanceValue() + " visits per "
                    + (plan.getAttendancePeriod() != null ? plan.getAttendancePeriod() : "period"));
        } else {
            features.add("Unlimited gym access");
        }
        if (plan.getSelectedFacilities() != null && !plan.getSelectedFacilities().isEmpty()) {
            List<String> names = plan.getSelectedFacilities().stream()
                    .map(facilityNames::get).filter(Objects::nonNull).toList();
            if (!names.isEmpty()) features.add("Facility access: " + String.join(", ", names));
        }
        if (plan.getMaxFreezeDays() != null && plan.getMaxFreezeDays() > 0) {
            features.add("Up to " + plan.getMaxFreezeDays() + " freeze day" + (plan.getMaxFreezeDays() == 1 ? "" : "s"));
        }
        BigDecimal effective = plan.getEffectivePrice() != null ? plan.getEffectivePrice() : orZero(plan.getPrice());
        boolean hasOffer = plan.getPrice() != null && effective.compareTo(plan.getPrice()) < 0;
        // The public page filters by Individual / Family / Couple. A plan is household if either
        // type field says so (same rule as isJoinable), so send that type when it applies.
        String publicType = plan.getPlanType();
        for (String raw : new String[] { plan.getPlanType(), plan.getType() }) {
            String v = Objects.toString(raw, "").trim().toLowerCase(Locale.ROOT);
            if (HOUSEHOLD_PLAN_TYPES.contains(v)) { publicType = v; break; }
        }
        return new PublicPlan(plan.getId(), plan.getName(), publicType, plan.getDuration(), plan.getDescription(),
                orZero(plan.getPrice()), effective, hasOffer ? plan.getOfferLabel() : null, features, isJoinable(plan),
                toPublicHousehold(plan));
    }

    private List<PublicSession> upcomingSessions(String type) {
        LocalDate today = LocalDate.now();
        return sessionService.getSessions(type, null, today, today.plusDays(SCHEDULE_DAYS), null).stream()
                .filter(s -> {
                    String st = Objects.toString(s.getStatus(), "").toLowerCase(Locale.ROOT);
                    return !st.equals("cancelled") && !st.equals("completed");
                })
                .sorted(Comparator.comparing(TrainingSessionResponseDTO::getDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(TrainingSessionResponseDTO::getStartTime, Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(MAX_SESSIONS)
                .map(s -> new PublicSession(s.getId(), s.getName(), s.getType(), s.getTrainerId(), s.getTrainerName(), s.getDate(),
                        s.getStartTime(), s.getEndTime(), s.getDurationMinutes(), s.getLocation(), s.getCapacity(),
                        s.getCapacity() != null ? Math.max(0, s.getCapacity() - (s.getBooked() != null ? s.getBooked() : 0)) : null,
                        s.getPrice(), s.getDescription()))
                .toList();
    }

    private static PublicTrainer toPublicTrainer(CenterTrainerDTO t, MobileMemberStaffService.PublicTrainerExtras x) {
        return new PublicTrainer(t.getId(), t.getName(), t.getRole(), t.getPhotoUrl(), t.getAverageRating(), t.getRatingCount(),
                x != null ? x.joinDate() : null,
                x != null ? x.certifications() : List.of(),
                x != null ? x.ratingDistribution() : List.of(0L, 0L, 0L, 0L, 0L),
                x != null ? x.topTags() : List.of());
    }

    private static String householdSuffix(MembershipApplication app) {
        int n = app.getFamilyMembers().size();
        return n == 0 ? "" : " (+" + n + " family member" + (n == 1 ? "" : "s") + ")";
    }

    private void notifyStaff(MembershipApplication app) {
        try {
            boolean desk = MembershipApplication.SOURCE_DESK.equals(app.getSource());
            String paid = app.isPaid() ? "paid online" : "will pay cash at the gym";
            String body = desk
                    ? app.getFullName() + " was registered at the desk for " + app.getPlanName()
                            + " — take cash payment and approve."
                    : app.getFullName() + householdSuffix(app) + " applied for " + app.getPlanName() + " and " + paid
                            + " — needs approval.";
            notificationService.notifyRoles(
                    List.of("ADMIN", "MANAGER", "RECEPTIONIST"),
                    "New membership application",
                    body,
                    app.isPaid() ? "INFO" : "WARNING", "HIGH", "MEMBERS",
                    app.getId(), "/approvals?tab=applications",
                    "MEMBERSHIP_APPLICATION_" + app.getId());
        } catch (Exception e) {
            // The application is saved either way; staff still see it in Approvals.
            log.warn("Couldn't notify staff about membership application {}: {}", app.getId(), e.getMessage());
        }
    }

    /** The display currency set for the branch (Settings → currency), else AED like the app default. */
    public String currencyCode(Long branchId) {
        return financialSettingRepository.findByCategoryAndBranchIdOrderBySettingKeyAsc("APP_PREFERENCES", branchId).stream()
                .filter(f -> "currency_code".equals(f.getSettingKey()) && StringUtils.hasText(f.getSettingValue()))
                .map(f -> f.getSettingValue().trim())
                .findFirst().orElse("AED");
    }

    private String newReference() {
        for (int i = 0; i < 5; i++) {
            String ref = "APP-" + randomString(REFERENCE_ALPHABET, 8);
            if (!applicationRepository.existsByReference(ref)) return ref;
        }
        throw new IllegalStateException("Couldn't create an application reference, please try again");
    }

    private String randomString(String alphabet, int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) sb.append(alphabet.charAt(random.nextInt(alphabet.length())));
        return sb.toString();
    }

    private static LocalDate parseDob(String value) {
        String v = trim(value);
        if (v == null) throw new IllegalArgumentException("Please enter your date of birth");
        LocalDate dob;
        try {
            dob = LocalDate.parse(v.length() > 10 ? v.substring(0, 10) : v);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Please enter a valid date of birth");
        }
        LocalDate today = LocalDate.now();
        if (dob.isAfter(today.minusYears(10)) || dob.isBefore(today.minusYears(110))) {
            throw new IllegalArgumentException("Please enter a valid date of birth");
        }
        return dob;
    }

    private static String trim(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static String limit(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }

    private static BigDecimal orZero(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    /** Last 9 digits, so "+971 50 123 4567" and "050 123 4567" match (see WalkInRegistrationService). */
    static String phoneKey(String phone) {
        String digits = Objects.toString(phone, "").replaceAll("[^0-9]", "");
        return digits.length() > 9 ? digits.substring(digits.length() - 9) : digits;
    }
}
