package com.company.project.packages;

import com.company.project.entities.Staff;
import com.company.project.entities.TrainingPackage;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.PackageEnrolmentRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.TrainingPackageRepository;
import com.company.project.services.BranchService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

/** The PT package catalogue (Trainings & Classes → Packages). */
@Service
@Transactional
public class TrainingPackageService {

    private static final Set<String> TYPES = Set.of(TrainingPackage.TYPE_SESSIONS, TrainingPackage.TYPE_DAYS);
    private static final Set<String> TIMINGS = Set.of(TrainingPackage.TIMING_ENROLMENT, TrainingPackage.TIMING_COMPLETION);
    private static final Set<String> UNUSED = Set.of(TrainingPackage.UNUSED_FORFEIT, TrainingPackage.UNUSED_PAY_AT_EXPIRY);
    private static final Set<String> NO_SHOW = Set.of(TrainingPackage.NO_SHOW_COUNTS, TrainingPackage.NO_SHOW_NOT_COUNTED);
    static final int MAX_VALIDITY_DAYS = 3650;

    public record PackageRequest(String name, String description, String planType, Integer sessionCount,
                                 Integer sessionCap, Integer validityDays, BigDecimal price, Long defaultTrainerId,
                                 String commissionTiming, String unusedAtExpiry, String noShowPolicy,
                                 Boolean isActive, Long branchId) {}

    public record PackageView(Long id, String name, String description, String kind, String planType,
                              Integer sessionCount, Integer sessionCap, Integer validityDays, BigDecimal price,
                              Long defaultTrainerId, String defaultTrainerName, String commissionTiming,
                              String unusedAtExpiry, String noShowPolicy, Boolean isActive, Long branchId,
                              boolean sold) {}

    private final TrainingPackageRepository repository;
    private final PackageEnrolmentRepository enrolments;
    private final StaffRepository staff;
    private final BranchService branches;

    public TrainingPackageService(TrainingPackageRepository repository, PackageEnrolmentRepository enrolments,
                                  StaffRepository staff, BranchService branches) {
        this.repository = repository;
        this.enrolments = enrolments;
        this.staff = staff;
        this.branches = branches;
    }

    @Transactional(readOnly = true)
    public List<PackageView> list(boolean activeOnly) {
        List<TrainingPackage> all = activeOnly ? repository.findByIsActiveTrueOrderByNameAsc() : repository.findAllByOrderByNameAsc();
        return all.stream().map(this::view).toList();
    }

    @Transactional(readOnly = true)
    public PackageView get(Long id) {
        return view(find(id));
    }

    public PackageView create(PackageRequest r) {
        TrainingPackage p = new TrainingPackage();
        apply(p, r);
        p.setBranchId(branches.resolveBranchForCreate(r.branchId()));
        return view(repository.save(p));
    }

    /** Packages already sold keep their own copy of the rules, so editing never changes them. */
    public PackageView update(Long id, PackageRequest r) {
        TrainingPackage p = find(id);
        apply(p, r);
        return view(repository.save(p));
    }

    public PackageView toggleActive(Long id) {
        TrainingPackage p = find(id);
        p.setIsActive(!Boolean.TRUE.equals(p.getIsActive()));
        return view(repository.save(p));
    }

    public void delete(Long id) {
        TrainingPackage p = find(id);
        if (enrolments.existsByPackageId(id)) {
            throw new BusinessRuleViolationException("This package has been sold — deactivate it instead of deleting it");
        }
        repository.delete(p);
    }

    TrainingPackage find(Long id) {
        return repository.findById(id).orElseThrow(() -> new EntityNotFoundException("Package not found"));
    }

    private void apply(TrainingPackage p, PackageRequest r) {
        if (!StringUtils.hasText(r.name())) throw new BusinessRuleViolationException("Enter a package name");
        String type = lower(r.planType());
        if (!TYPES.contains(type)) throw new BusinessRuleViolationException("Choose session-based or day-based");
        Integer validity = r.validityDays();
        if (validity == null || validity < 1 || validity > MAX_VALIDITY_DAYS) {
            throw new BusinessRuleViolationException("Validity must be between 1 and " + MAX_VALIDITY_DAYS + " days");
        }
        Integer count = null;
        Integer cap = null;
        if (TrainingPackage.TYPE_SESSIONS.equals(type)) {
            count = r.sessionCount();
            if (count == null || count < 1) throw new BusinessRuleViolationException("Enter how many sessions the package includes");
        } else {
            cap = r.sessionCap();
            if (cap != null && cap < 1) throw new BusinessRuleViolationException("The session cap must be at least 1, or left empty for unlimited");
        }
        if (r.price() == null || r.price().signum() < 0) throw new BusinessRuleViolationException("Enter a price");
        String timing = r.commissionTiming() != null ? lower(r.commissionTiming()) : TrainingPackage.TIMING_ENROLMENT;
        if (!TIMINGS.contains(timing)) throw new BusinessRuleViolationException("Unknown commission timing " + r.commissionTiming());
        String unused = r.unusedAtExpiry() != null ? lower(r.unusedAtExpiry()) : TrainingPackage.UNUSED_FORFEIT;
        if (!UNUSED.contains(unused)) throw new BusinessRuleViolationException("Unknown unused-session rule " + r.unusedAtExpiry());
        String noShow = r.noShowPolicy() != null ? lower(r.noShowPolicy()) : TrainingPackage.NO_SHOW_COUNTS;
        if (!NO_SHOW.contains(noShow)) throw new BusinessRuleViolationException("Unknown no-show rule " + r.noShowPolicy());
        if (r.defaultTrainerId() != null && !staff.existsById(r.defaultTrainerId())) {
            throw new BusinessRuleViolationException("Trainer not found");
        }

        p.setName(r.name().trim());
        p.setDescription(r.description());
        p.setPlanType(type);
        p.setSessionCount(count);
        p.setSessionCap(cap);
        p.setValidityDays(validity);
        p.setPrice(r.price());
        p.setDefaultTrainerId(r.defaultTrainerId());
        p.setCommissionTiming(timing);
        p.setUnusedAtExpiry(unused);
        p.setNoShowPolicy(noShow);
        if (r.isActive() != null) p.setIsActive(r.isActive());
    }

    PackageView view(TrainingPackage p) {
        String trainer = p.getDefaultTrainerId() == null ? null
                : staff.findById(p.getDefaultTrainerId()).map(Staff::getName).orElse(null);
        return new PackageView(p.getId(), p.getName(), p.getDescription(), p.getKind(), p.getPlanType(),
                p.getSessionCount(), p.getSessionCap(), p.getValidityDays(), p.getPrice(), p.getDefaultTrainerId(),
                trainer, p.getCommissionTiming(), p.getUnusedAtExpiry(), p.getNoShowPolicy(), p.getIsActive(),
                p.getBranchId(), p.getId() != null && enrolments.existsByPackageId(p.getId()));
    }

    private static String lower(String s) {
        return s == null ? "" : s.trim().toLowerCase();
    }
}
