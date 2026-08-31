package com.company.project.services;

import com.company.project.dto.StaffTargetRequestDTO;
import com.company.project.dto.StaffTargetResponseDTO;
import com.company.project.entities.Staff;
import com.company.project.entities.StaffTarget;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.StaffTargetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class StaffTargetService {

    private final StaffTargetRepository targetRepository;
    private final StaffRepository staffRepository;

    public StaffTargetService(StaffTargetRepository targetRepository, StaffRepository staffRepository) {
        this.targetRepository = targetRepository;
        this.staffRepository = staffRepository;
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
        return targets.stream().map(StaffTargetResponseDTO::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StaffTargetResponseDTO getTargetById(Long id) {
        StaffTarget t = targetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Target not found: " + id));
        return StaffTargetResponseDTO.fromEntity(t);
    }

    public StaffTargetResponseDTO createTarget(StaffTargetRequestDTO req) {
        StaffTarget target = new StaffTarget();
        applyRequest(req, target);
        return StaffTargetResponseDTO.fromEntity(targetRepository.save(target));
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
