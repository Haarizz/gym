package com.company.project.services;

import com.company.project.dto.StaffTargetRequestDTO;
import com.company.project.dto.StaffTargetResponseDTO;
import com.company.project.entities.Staff;
import com.company.project.entities.StaffTarget;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.StaffTargetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class StaffTargetService {

    private final StaffTargetRepository targetRepository;
    private final StaffRepository staffRepository;
    private final StaffProgressCalculator progressCalculator;
    private final com.company.project.repositories.UserRepository userRepository;

    /** The gym owner's roles: they set targets for staff and never have one themselves. */
    private static final java.util.Set<String> OWNER_ROLES = java.util.Set.of("ADMIN", "SUPER_ADMIN");

    public StaffTargetService(StaffTargetRepository targetRepository, StaffRepository staffRepository,
                               StaffProgressCalculator progressCalculator,
                               com.company.project.repositories.UserRepository userRepository) {
        this.targetRepository = targetRepository;
        this.staffRepository = staffRepository;
        this.progressCalculator = progressCalculator;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<StaffTargetResponseDTO> getTargets(Integer year, Integer month, String scope, Long staffDbId) {
        List<StaffTarget> targets;
        if (staffDbId != null && year != null && month != null) {
            targets = targetRepository.findByStaffIdAndYearAndMonth(staffDbId, year, month);
        } else if (staffDbId != null && scope != null) {
            targets = targetRepository.findByStaff_IdAndScope(staffDbId, scope);
        } else if (staffDbId != null) {
            targets = targetRepository.findByStaff_Id(staffDbId);
        } else if (year != null && month != null) {
            targets = targetRepository.findByYearAndMonth(year, month);
        } else if (scope != null) {
            targets = targetRepository.findByScope(scope);
        } else {
            targets = targetRepository.findAll();
        }
        return targets.stream().map(this::toEnrichedDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StaffTargetResponseDTO getTargetById(Long id) {
        StaffTarget t = targetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Target not found: " + id));
        return toEnrichedDto(t);
    }

    /** Targets for the staff member linked to the given user account, defaulting to the current month. */
    @Transactional(readOnly = true)
    public List<StaffTargetResponseDTO> getMyTargets(Long userId, Integer year, Integer month) {
        Staff staff = staffRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("No staff record linked to this account"));
        LocalDate now = LocalDate.now();
        int y = year != null ? year : now.getYear();
        int m = month != null ? month : now.getMonthValue();
        List<StaffTarget> targets = targetRepository.findByStaffIdAndYearAndMonth(staff.getId(), y, m);
        return targets.stream().map(this::toEnrichedDto).collect(Collectors.toList());
    }

    /** Computes each target's live achieved figures from actual sales/lead data, floored at the stored value. */
    private StaffTargetResponseDTO toEnrichedDto(StaffTarget t) {
        LocalDateTime start;
        LocalDateTime end;
        if (t.getStartDate() != null && t.getEndDate() != null) {
            start = t.getStartDate().atStartOfDay();
            end = t.getEndDate().plusDays(1).atStartOfDay();
        } else if (t.getYear() != null && t.getMonth() != null) {
            LocalDate monthStart = LocalDate.of(t.getYear(), t.getMonth(), 1);
            start = monthStart.atStartOfDay();
            end = monthStart.plusMonths(1).atStartOfDay();
        } else {
            return StaffTargetResponseDTO.fromEntity(t);
        }
        Staff staff = t.getStaff();
        if (staff == null) {
            // Institution-wide target: the whole gym's takings and units for the period.
            StaffProgressCalculator.RevenueBreakdown gym = progressCalculator.computeGymRevenueBreakdown(start, end);
            return StaffTargetResponseDTO.fromEntity(t, gym.total(), null, null)
                    .withRevenueBreakdown(gym.memberships(), gym.pos(), gym.pt())
                    .withUnits(progressCalculator.computeGymUnits(start, end));
        }
        String username = staff.getAppUsername() != null ? staff.getAppUsername() : "";
        StaffProgressCalculator.RevenueBreakdown revenue = progressCalculator.computeRevenueBreakdown(staff, username, start, end);
        int liveConversions = progressCalculator.computeConversions(staff, username, start, end);
        BigDecimal liveCommission = progressCalculator.computeCommission(staff, username, start, end);
        return StaffTargetResponseDTO.fromEntity(t, revenue.total(), liveConversions, liveCommission)
                .withRevenueBreakdown(revenue.memberships(), revenue.pos(), revenue.pt())
                .withUnits(progressCalculator.computeUnits(staff, username, start, end));
    }

    public StaffTargetResponseDTO createTarget(StaffTargetRequestDTO req) {
        StaffTarget target = findExistingForPeriod(req).orElseGet(StaffTarget::new);
        applyRequest(req, target);
        return StaffTargetResponseDTO.fromEntity(targetRepository.save(target));
    }

    /**
     * Finds a pre-existing target for the same staff (or institution-wide)/year/month so
     * re-submitting the Set Targets form updates it instead of inserting a duplicate row —
     * duplicates broke downstream single-result lookups (e.g. mobile performance) and made
     * "achieved" progress ambiguous across rows for the same period.
     */
    private Optional<StaffTarget> findExistingForPeriod(StaffTargetRequestDTO req) {
        if (req.getYear() == null || req.getMonth() == null) {
            return Optional.empty();
        }
        if ("individual".equals(req.getScope()) && req.getStaffDbId() != null) {
            return targetRepository.findByStaffIdAndYearAndMonth(req.getStaffDbId(), req.getYear(), req.getMonth())
                    .stream().findFirst();
        }
        if ("institution".equals(req.getScope())) {
            return targetRepository.findByScopeAndYearAndMonthAndStaffIsNull("institution", req.getYear(), req.getMonth())
                    .stream().findFirst();
        }
        return Optional.empty();
    }

    public StaffTargetResponseDTO updateTarget(Long id, StaffTargetRequestDTO req) {
        StaffTarget target = targetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Target not found: " + id));
        applyRequest(req, target);
        return StaffTargetResponseDTO.fromEntity(targetRepository.save(target));
    }

    public StaffTargetResponseDTO updateAchievement(Long id, BigDecimal revenueAchieved,
                                                      Integer sessionsAchieved, Integer newClientsAchieved,
                                                      BigDecimal commissionEarned, String trend, Integer forecast) {
        StaffTarget target = targetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Target not found: " + id));
        if (revenueAchieved != null)   target.setRevenueAchieved(revenueAchieved);
        if (sessionsAchieved != null)  target.setSessionsAchieved(sessionsAchieved);
        if (newClientsAchieved != null) target.setNewClientsAchieved(newClientsAchieved);
        if (commissionEarned != null)  target.setCommissionEarned(commissionEarned);
        if (trend != null)             target.setTrend(trend);
        if (forecast != null)          target.setForecast(forecast);
        return StaffTargetResponseDTO.fromEntity(targetRepository.save(target));
    }

    public void deleteTarget(Long id) {
        targetRepository.deleteById(id);
    }

    /** A 0 or blank category target means "no target" — stored as null, not as a target of zero. */
    private static BigDecimal positiveOrNull(BigDecimal value) {
        return value != null && value.signum() > 0 ? value : null;
    }

    private void applyRequest(StaffTargetRequestDTO req, StaffTarget target) {
        target.setScope(req.getScope());
        target.setTimeframe(req.getTimeframe());
        target.setYear(req.getYear());
        target.setMonth(req.getMonth());
        target.setRevenueTarget(req.getRevenueTarget());
        target.setMembershipRevenueTarget(positiveOrNull(req.getMembershipRevenueTarget()));
        target.setPosRevenueTarget(positiveOrNull(req.getPosRevenueTarget()));
        target.setPtRevenueTarget(positiveOrNull(req.getPtRevenueTarget()));
        target.setSessionsTarget(req.getSessionsTarget());
        target.setNewClientsTarget(req.getNewClientsTarget());
        if (req.getUnitTargetsJson() != null) target.setUnitTargetsJson(req.getUnitTargetsJson());
        if (req.getStartDate() != null && !req.getStartDate().isBlank())
            target.setStartDate(LocalDate.parse(req.getStartDate()));
        if (req.getEndDate() != null && !req.getEndDate().isBlank())
            target.setEndDate(LocalDate.parse(req.getEndDate()));
        if (req.getStaffDbId() != null) {
            Staff staff = staffRepository.findById(req.getStaffDbId())
                    .orElseThrow(() -> new RuntimeException("Staff not found: " + req.getStaffDbId()));
            if (isLinkedToOwner(staff)) {
                throw new com.company.project.exceptions.BusinessRuleViolationException(
                        staff.getName() + " signs in as the gym owner (Admin). Owners set targets for staff and don't have targets themselves.");
            }
            target.setStaff(staff);
        }
    }

    /** Whether this staff record's login is an owner account (ADMIN / SUPER_ADMIN). */
    private boolean isLinkedToOwner(Staff staff) {
        if (staff.getUserId() == null) return false;
        return userRepository.findById(staff.getUserId())
                .map(u -> u.getUserRoles().stream()
                        .map(ur -> ur.getRole() != null ? ur.getRole().getRoleName() : null)
                        .filter(java.util.Objects::nonNull)
                        .map(r -> r.toUpperCase(java.util.Locale.ROOT).replace("ROLE_", ""))
                        .anyMatch(OWNER_ROLES::contains))
                .orElse(false);
    }
}
