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

        List<PublicTrainer> trainers = memberStaffService.getCenterTrainers(branchId).stream()
                .filter(t -> TRAINER_ROLE.matcher(Objects.toString(t.getRole(), "") + " "
                        + Objects.toString(t.getDepartment(), "")).matches())
                .map(ServicePortfolioService::toPublicTrainer)
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
                trainers);
    }

    /**
     * A visitor's application. ONLINE charges the simulated card first (a declined card
     * saves nothing); CASH is saved with payment PENDING until reception takes the money.
     * Either way approval stays PENDING — only staff approval creates the member.
     */
    @Transactional
    public ApplicationReceipt apply(Long branchId, String token, PublicApplication req) {
        Branch branch = openBranch(branchId, token);

        String name = trim(req.fullName());
        String phone = trim(req.phone());
        String email = trim(req.email());
        if (name == null || name.length() > 255) throw new IllegalArgumentException("Please enter your full name");
        if (phone == null || phoneKey(phone).length() < 7 || phone.length() > 50) {
            throw new IllegalArgumentException("Please enter a valid phone number");
        }
        if (email == null || email.length() > 255 || !EMAIL.matcher(email).matches()) {
            throw new IllegalArgumentException("Please enter a valid email address");
        }
        String gender = trim(req.gender());
        if (gender == null) throw new IllegalArgumentException("Please select your gender");
        String refusal = BranchAccessPolicy.refusalReason(branch, gender, true);
        if (refusal != null) {
            throw new BusinessRuleViolationException(
                    (branch.getBranchName() != null ? branch.getBranchName() : "This branch") + " isn't open to your gender.");
        }
        LocalDate dob = parseDob(req.dateOfBirth());
        if (!Boolean.TRUE.equals(req.acceptTerms())) {
            throw new IllegalArgumentException("Please accept the terms to continue");
        }
        String method = req.paymentMethod() == null ? "" : req.paymentMethod().trim().toUpperCase(Locale.ROOT);
        if (!MembershipApplication.METHOD_CASH.equals(method) && !MembershipApplication.METHOD_ONLINE.equals(method)) {
            throw new IllegalArgumentException("Please choose how you'd like to pay");
        }

        MembershipPlanResponseDTO plan = publicPlans().stream()
                .filter(p -> p.getId().equals(req.planId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("That plan is no longer available — please pick another"));
        if (!isJoinable(plan)) {
            throw new IllegalArgumentException("Family and couple plans are set up at reception — please contact the gym");
        }
        BigDecimal listPrice = orZero(plan.getPrice());
        BigDecimal amount = plan.getEffectivePrice() != null ? plan.getEffectivePrice() : listPrice;

        // One open application per phone number, so a double-tap or a second visit
        // doesn't charge twice or queue the visitor twice.
        String key = phoneKey(phone);
        applicationRepository.findByBranchIdAndApprovalStatus(branchId, MembershipApplication.APPROVAL_PENDING).stream()
                .filter(a -> key.equals(phoneKey(a.getPhone())))
                .findFirst()
                .ifPresent(existing -> {
                    throw new BusinessRuleViolationException("You already have an application under review (reference "
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
        app.setPaymentMethod(method);

        if (MembershipApplication.METHOD_ONLINE.equals(method)) {
            SimulatedCardCheckout.Charge charge = cardCheckout.charge(req.card(), amount);
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
        return new ApplicationReceipt(saved.getReference(), saved.getPlanName(), saved.getAmount(), currencyCode(branchId),
                saved.getPaymentMethod(), saved.getPaymentStatus(), saved.getApprovalStatus(),
                saved.getPaymentReference(), saved.getCardBrand(), saved.getCardLast4(), saved.getPaidAt(), message);
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

    private static boolean isJoinable(MembershipPlanResponseDTO plan) {
        String type = Objects.toString(plan.getPlanType(), "").trim().toLowerCase(Locale.ROOT);
        String mType = Objects.toString(plan.getType(), "").trim().toLowerCase(Locale.ROOT);
        return !HOUSEHOLD_PLAN_TYPES.contains(type) && !HOUSEHOLD_PLAN_TYPES.contains(mType);
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
        return new PublicPlan(plan.getId(), plan.getName(), plan.getPlanType(), plan.getDuration(), plan.getDescription(),
                orZero(plan.getPrice()), effective, hasOffer ? plan.getOfferLabel() : null, features, isJoinable(plan));
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
                .map(s -> new PublicSession(s.getId(), s.getName(), s.getType(), s.getTrainerName(), s.getDate(),
                        s.getStartTime(), s.getEndTime(), s.getDurationMinutes(), s.getLocation(), s.getCapacity(),
                        s.getCapacity() != null ? Math.max(0, s.getCapacity() - (s.getBooked() != null ? s.getBooked() : 0)) : null,
                        s.getPrice(), s.getDescription()))
                .toList();
    }

    private static PublicTrainer toPublicTrainer(CenterTrainerDTO t) {
        return new PublicTrainer(t.getId(), t.getName(), t.getRole(), t.getPhotoUrl(), t.getAverageRating(), t.getRatingCount());
    }

    private void notifyStaff(MembershipApplication app) {
        try {
            String paid = app.isPaid() ? "paid online" : "will pay cash at the gym";
            notificationService.notifyRoles(
                    List.of("ADMIN", "MANAGER", "RECEPTIONIST"),
                    "New membership application",
                    app.getFullName() + " applied for " + app.getPlanName() + " and " + paid + " — needs approval.",
                    app.isPaid() ? "INFO" : "WARNING", "HIGH", "MEMBERS",
                    app.getId(), "/approvals?tab=applications",
                    "MEMBERSHIP_APPLICATION_" + app.getId());
        } catch (Exception e) {
            // The application is saved either way; staff still see it in Approvals.
            log.warn("Couldn't notify staff about membership application {}: {}", app.getId(), e.getMessage());
        }
    }

    /** The display currency set for the branch (Settings → currency), else AED like the app default. */
    private String currencyCode(Long branchId) {
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
