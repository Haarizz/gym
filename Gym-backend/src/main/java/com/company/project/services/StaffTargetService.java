package com.company.project.services;

import com.company.project.dto.StaffTargetRequestDTO;
import com.company.project.dto.StaffTargetResponseDTO;
import com.company.project.entities.CommissionRule;
import com.company.project.entities.Staff;
import com.company.project.entities.StaffTarget;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.CommissionRuleRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.StaffTargetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class StaffTargetService {

    private static final BigDecimal DEFAULT_COMMISSION_RATE = new BigDecimal("5");

    private final StaffTargetRepository targetRepository;
    private final StaffRepository staffRepository;
    private final StaffProgressCalculator progressCalculator;
    private final CommissionRuleRepository commissionRuleRepository;

    public StaffTargetService(StaffTargetRepository targetRepository, StaffRepository staffRepository,
                               StaffProgressCalculator progressCalculator, CommissionRuleRepository commissionRuleRepository) {
        this.targetRepository = targetRepository;
        this.staffRepository = staffRepository;
        this.progressCalculator = progressCalculator;
        this.commissionRuleRepository = commissionRuleRepository;
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
        if (t.getStaff() == null) {
            // Institution-wide targets have no single staff to attribute sales to; report stored figures as-is.
            return StaffTargetResponseDTO.fromEntity(t);
        }
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
        String username = staff.getAppUsername() != null ? staff.getAppUsername() : "";
        BigDecimal liveRevenue = progressCalculator.computeRevenue(staff, username, start, end);
        int liveConversions = progressCalculator.computeConversions(staff, username, start, end);
        BigDecimal liveCommission = computeLiveCommission(staff, username, start, end, liveRevenue);
        return StaffTargetResponseDTO.fromEntity(t, liveRevenue, liveConversions, liveCommission);
    }

    /**
     * Admission (new-member) revenue is commissioned at the role's admissionCommission rate;
     * everything else (renewals, add-ons, walk-ins) at baseCommission. Falls back to a flat
     * 5% when the staff's role has no configured CommissionRule.
     */
    private BigDecimal computeLiveCommission(Staff staff, String username, LocalDateTime start, LocalDateTime end, BigDecimal totalRevenue) {
        Optional<CommissionRule> rule = staff.getRole() != null
                ? commissionRuleRepository.findByRoleIgnoreCase(staff.getRole())
                : Optional.empty();
        BigDecimal baseRate = rule.map(CommissionRule::getBaseCommission).orElse(DEFAULT_COMMISSION_RATE);
        BigDecimal admissionRate = rule.map(CommissionRule::getAdmissionCommission).orElse(baseRate);

        BigDecimal admissionRevenue = progressCalculator.computeRevenue(staff, username, start, end, "New");
        BigDecimal otherRevenue = totalRevenue.subtract(admissionRevenue).max(BigDecimal.ZERO);

        BigDecimal hundred = BigDecimal.valueOf(100);
        BigDecimal admissionCommission = admissionRevenue.multiply(admissionRate).divide(hundred, 2, RoundingMode.HALF_UP);
        BigDecimal otherCommission = otherRevenue.multiply(baseRate).divide(hundred, 2, RoundingMode.HALF_UP);
        return admissionCommission.add(otherCommission);
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

    private void applyRequest(StaffTargetRequestDTO req, StaffTarget target) {
        target.setScope(req.getScope());
        target.setTimeframe(req.getTimeframe());
        target.setYear(req.getYear());
        target.setMonth(req.getMonth());
        target.setRevenueTarget(req.getRevenueTarget());
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
            target.setStaff(staff);
        }
    }
}
