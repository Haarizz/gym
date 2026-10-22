package com.company.project.services;

import com.company.project.dto.MembershipPlanResponseDTO;
import com.company.project.dto.WalkInSelfRegistrationDTOs.*;
import com.company.project.entities.Branch;
import com.company.project.entities.WalkInRegistration;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.FinancialSettingRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.WalkInRegistrationRepository;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.TenantContextHolder;
import com.company.project.security.UserDetailsImpl;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Walk-in self-registration. A visitor scans the branch's QR (or a staff member's
 * personal one, which adds ?s=CODE), fills in the public /w/{tenant}/{branch} page,
 * and lands in a pending list. Nothing here grants entry: staff collect payment
 * through the normal walk-in check-in (AttendanceService.walkInCheckIn), which
 * confirms the registration and credits the referring staff member.
 */
@Service
public class WalkInRegistrationService {

    static final String WALK_IN_PLAN_TYPE = "Walk-In";
    private static final String CODE_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 8;
    private static final Pattern STAFF_CODE = Pattern.compile("^[A-Za-z0-9]{1,16}$");
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final WalkInRegistrationRepository registrationRepository;
    private final StaffRepository staffRepository;
    private final BranchRepository branchRepository;
    private final MembershipPlanService planService;
    private final FinancialSettingRepository financialSettingRepository;
    private final SecureRandom random = new SecureRandom();

    public WalkInRegistrationService(WalkInRegistrationRepository registrationRepository,
                                     StaffRepository staffRepository,
                                     BranchRepository branchRepository,
                                     MembershipPlanService planService,
                                     FinancialSettingRepository financialSettingRepository) {
        this.registrationRepository = registrationRepository;
        this.staffRepository = staffRepository;
        this.branchRepository = branchRepository;
        this.planService = planService;
        this.financialSettingRepository = financialSettingRepository;
    }

    // ── Public page (tenant + branch context already set by the controller) ──────

    @Transactional(readOnly = true)
    public PublicPage describe(Long branchId, String gymName, String staffCode) {
        Branch branch = openBranch(branchId);
        Object[] referrer = findReferrer(staffCode, branchId);
        return new PublicPage(
                gymName,
                branch.getBranchName(),
                branch.getPhone(),
                currencyCode(branchId),
                referrer != null ? (String) referrer[1] : null,
                walkInPlans().stream()
                        .map(p -> new PublicPlan(p.getId(), p.getName(), p.getDuration(), p.getPrice()))
                        .toList());
    }

    @Transactional
    public void submit(Long branchId, PublicSubmission req) {
        openBranch(branchId);
        String name = req.fullName() == null ? "" : req.fullName().trim();
        String phone = req.phone() == null ? "" : req.phone().trim();
        String email = StringUtils.hasText(req.email()) ? req.email().trim() : null;
        if (name.isEmpty() || name.length() > 255) throw new IllegalArgumentException("Please enter your name");
        if (phoneKey(phone).length() < 7 || phone.length() > 50) throw new IllegalArgumentException("Please enter a valid phone number");
        if (email != null && (email.length() > 255 || !EMAIL.matcher(email).matches())) {
            throw new IllegalArgumentException("Please enter a valid email address");
        }

        MembershipPlanResponseDTO plan = null;
        if (req.planId() != null) {
            plan = walkInPlans().stream().filter(p -> req.planId().equals(p.getId())).findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("That pass is no longer available"));
        }
        Object[] referrer = findReferrer(req.staffCode(), branchId);

        // Re-scanning (or a double-tapped submit) updates today's pending row for the
        // same phone instead of queuing the visitor twice at the desk.
        String key = phoneKey(phone);
        WalkInRegistration registration = registrationRepository
                .findByStatusAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(WalkInRegistration.PENDING, startOfToday())
                .stream()
                .filter(r -> key.equals(phoneKey(r.getPhone())))
                .findFirst()
                .orElseGet(WalkInRegistration::new);
        registration.setName(name);
        registration.setPhone(phone);
        registration.setEmail(email);
        registration.setPlanId(plan != null ? plan.getId() : null);
        registration.setPlanName(plan != null ? plan.getName() : null);
        if (referrer != null) {
            registration.setReferredByStaffId(((Number) referrer[0]).longValue());
            registration.setReferredByStaffName((String) referrer[1]);
        }
        registrationRepository.save(registration);
    }

    // ── Desk / staff app ─────────────────────────────────────────────────────────

    /** Today's visitors still waiting for staff to take payment, newest first. */
    @Transactional(readOnly = true)
    public List<Pending> listPending() {
        return registrationRepository
                .findByStatusAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(WalkInRegistration.PENDING, startOfToday())
                .stream()
                .map(r -> new Pending(r.getId(), r.getName(), r.getPhone(), r.getEmail(), r.getPlanId(), r.getPlanName(),
                        r.getReferredByStaffId(), r.getReferredByStaffName(), r.getCreatedAt()))
                .toList();
    }

    @Transactional
    public void dismiss(Long id) {
        WalkInRegistration registration = registrationRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new EntityNotFoundException("Registration not found"));
        if (!WalkInRegistration.PENDING.equals(registration.getStatus())) {
            throw new IllegalArgumentException("This visitor has already been handled");
        }
        registration.setStatus(WalkInRegistration.DISMISSED);
    }

    /**
     * Called from the walk-in check-in, in its transaction: locks the pending row so
     * it can only be paid for once. The caller links the attendance via {@link #markConfirmed}.
     */
    public WalkInRegistration claimPending(Long id) {
        WalkInRegistration registration = registrationRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new IllegalArgumentException("Self-registration not found"));
        if (!WalkInRegistration.PENDING.equals(registration.getStatus())) {
            throw new IllegalArgumentException(registration.getName() + " has already been checked in or dismissed");
        }
        return registration;
    }

    public void markConfirmed(WalkInRegistration registration, Long attendanceId) {
        registration.setStatus(WalkInRegistration.CONFIRMED);
        registration.setAttendanceId(attendanceId);
        registration.setConfirmedAt(LocalDateTime.now());
        registrationRepository.save(registration);
    }

    /**
     * The caller's walk-in link for the active branch (or their own branch in All
     * Branches mode). Staff get a personal ?s= code so scans count toward their
     * target; an owner/admin without a staff record gets the plain branch link.
     */
    @Transactional
    public MyLink myLink() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserDetailsImpl user)) {
            throw new IllegalStateException("No authenticated user");
        }
        List<Object[]> rows = staffRepository.findWalkInIdentityByUserId(user.getId());
        Object[] staff = rows.isEmpty() ? null : rows.get(0);

        Long branchId = BranchContextHolder.getActiveBranchId();
        if (branchId == null) {
            branchId = branchRepository.findAll().stream()
                    .filter(Branch::isDefault).map(Branch::getId).findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Select a branch first"));
        }
        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new EntityNotFoundException("Branch not found"));

        String tenantSlug = TenantContextHolder.getCurrentTenant();
        if (tenantSlug == null) {
            // Tenant routing off (e.g. a platform account): the public page couldn't find this gym.
            throw new IllegalStateException("Walk-in QR links are only available inside a gym account");
        }
        String branchPath = "/w/" + tenantSlug + "/" + branchId;
        String path = branchPath;
        String staffName = null;
        if (staff != null) {
            Long staffId = ((Number) staff[0]).longValue();
            staffName = (String) staff[1];
            String code = (String) staff[2];
            if (code == null) code = assignCode(staffId);
            path += "?s=" + code;
        }
        return new MyLink(path, branchPath, staffName, branch.getBranchName(), branch.isWalkInSelfRegistration());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private Branch openBranch(Long branchId) {
        Branch branch = branchRepository.findById(branchId).orElse(null);
        if (branch == null || !"ACTIVE".equalsIgnoreCase(branch.getStatus()) || !branch.isWalkInSelfRegistration()) {
            throw new EntityNotFoundException("Self-registration isn't available here");
        }
        return branch;
    }

    private List<MembershipPlanResponseDTO> walkInPlans() {
        return planService.getPlans("Active").stream()
                .filter(p -> WALK_IN_PLAN_TYPE.equals(p.getPlanType()))
                .toList();
    }

    /** [id, name] of the staff member behind a ?s= code, or null when absent/unknown/another branch's. */
    private Object[] findReferrer(String staffCode, Long branchId) {
        if (staffCode == null || !STAFF_CODE.matcher(staffCode).matches()) return null;
        List<Object[]> rows = staffRepository.findWalkInReferrer(staffCode, branchId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private String assignCode(Long staffId) {
        for (int attempt = 0; attempt < 5; attempt++) {
            String code = randomCode();
            if (staffRepository.countByWalkInCode(code) > 0) continue;
            if (staffRepository.assignWalkInCode(staffId, code) == 1) return code;
            // Another request assigned one first — use theirs.
            List<String> existing = staffRepository.findWalkInCodeById(staffId);
            if (!existing.isEmpty() && existing.get(0) != null) return existing.get(0);
        }
        throw new IllegalStateException("Couldn't create a walk-in code, please try again");
    }

    private String randomCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) sb.append(CODE_ALPHABET.charAt(random.nextInt(CODE_ALPHABET.length())));
        return sb.toString();
    }

    /** The display currency set for the branch (Settings → currency), else AED like the app default. */
    private String currencyCode(Long branchId) {
        return financialSettingRepository.findByCategoryAndBranchIdOrderBySettingKeyAsc("APP_PREFERENCES", branchId).stream()
                .filter(f -> "currency_code".equals(f.getSettingKey()) && StringUtils.hasText(f.getSettingValue()))
                .map(f -> f.getSettingValue().trim())
                .findFirst().orElse("AED");
    }

    private static LocalDateTime startOfToday() {
        return LocalDate.now().atStartOfDay();
    }

    /**
     * Last 9 digits: enough to tell one day's visitors apart, and the same for
     * "+971 50 123 4567" and "050 123 4567" (10 digits would keep the trunk 0 / country code).
     */
    static String phoneKey(String phone) {
        String digits = Objects.toString(phone, "").replaceAll("[^0-9]", "");
        return digits.length() > 9 ? digits.substring(digits.length() - 9) : digits;
    }
}
