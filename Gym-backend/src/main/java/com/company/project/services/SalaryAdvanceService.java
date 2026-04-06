package com.company.project.services;

import com.company.project.dto.SalaryAdvanceApprovalRequestDTO;
import com.company.project.dto.SalaryAdvanceRequestDTO;
import com.company.project.dto.SalaryAdvanceResponseDTO;
import com.company.project.entities.SalaryAdvance;
import com.company.project.repositories.SalaryAdvanceRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@Transactional
public class SalaryAdvanceService {

    private final SalaryAdvanceRepository advanceRepository;
    private final NotificationService notificationService;

    public SalaryAdvanceService(SalaryAdvanceRepository advanceRepository,
                                 NotificationService notificationService) {
        this.advanceRepository = advanceRepository;
        this.notificationService = notificationService;
    }

    public List<SalaryAdvanceResponseDTO> getAdvances(String search, String status, String department) {
        List<SalaryAdvance> advances = advanceRepository.findAll(Sort.by(Sort.Direction.DESC, "requestDate"));
        return advances.stream()
                .filter(a -> {
                    if (search == null || search.isBlank()) return true;
                    String s = search.toLowerCase(Locale.ROOT);
                    return (a.getEmployeeName() != null && a.getEmployeeName().toLowerCase(Locale.ROOT).contains(s))
                            || (a.getEmployeeId() != null && a.getEmployeeId().toLowerCase(Locale.ROOT).contains(s));
                })
                .filter(a -> status == null || status.isBlank() || status.equalsIgnoreCase("all")
                        || (a.getStatus() != null && a.getStatus().toLowerCase(Locale.ROOT).contains(status.toLowerCase(Locale.ROOT))))
                .filter(a -> department == null || department.isBlank() || department.equalsIgnoreCase("all")
                        || (a.getDepartment() != null && a.getDepartment().equalsIgnoreCase(department)))
                .map(SalaryAdvanceResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public SalaryAdvanceResponseDTO createAdvance(SalaryAdvanceRequestDTO req) {
        SalaryAdvance advance = new SalaryAdvance();
        advance.setEmployeeId(req.getEmployeeId());
        advance.setEmployeeName(req.getEmployeeName());
        advance.setDepartment(req.getDepartment());
        advance.setRequestDate(req.getRequestDate() != null ? req.getRequestDate() : LocalDate.now());
        advance.setAdvanceType(req.getAdvanceType() != null ? req.getAdvanceType() : "Salary Advance");
        advance.setRequestedAmount(req.getRequestedAmount() != null ? req.getRequestedAmount() : BigDecimal.ZERO);
        advance.setApprovedAmount(BigDecimal.ZERO);
        advance.setApprovalStatus("Pending");
        advance.setRemarks(req.getRemarks());
        advance.setTotalDeducted(BigDecimal.ZERO);
        advance.setBalance(BigDecimal.ZERO);
        advance.setInstallmentCount(0);
        advance.setInstallmentAmount(BigDecimal.ZERO);
        advance.setStartMonth(null);
        advance.setDeductionMode("Monthly");
        advance.setAutoDeduct(true);
        advance.setStatus("Pending Approval");
        advance.setNextDeductionDate(null);
        advance.setApprovedBy(null);
        advance.setApprovedDate(null);
        advance.setAttachment(req.getAttachment());
        SalaryAdvance saved = advanceRepository.save(advance);
        notificationService.notifyRoles(
                List.of("ADMIN", "HR"),
                "Salary Advance Requested",
                (saved.getEmployeeName() != null ? saved.getEmployeeName() : "An employee") +
                " requested a salary advance" +
                (saved.getRequestedAmount() != null ? " of AED " + saved.getRequestedAmount() : "") + ".",
                "WARNING", "HIGH", "PAYROLL",
                saved.getId(), "/salary-advances",
                "SALARY_ADV_CREATED_" + saved.getId()
        );
        return SalaryAdvanceResponseDTO.fromEntity(saved);
    }

    public SalaryAdvanceResponseDTO updateAdvance(Long id, SalaryAdvanceRequestDTO req) {
        SalaryAdvance advance = advanceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Advance not found with id: " + id));
        if (req.getEmployeeId() != null) advance.setEmployeeId(req.getEmployeeId());
        if (req.getEmployeeName() != null) advance.setEmployeeName(req.getEmployeeName());
        if (req.getDepartment() != null) advance.setDepartment(req.getDepartment());
        if (req.getRequestDate() != null) advance.setRequestDate(req.getRequestDate());
        if (req.getAdvanceType() != null) advance.setAdvanceType(req.getAdvanceType());
        if (req.getRequestedAmount() != null) advance.setRequestedAmount(req.getRequestedAmount());
        if (req.getRemarks() != null) advance.setRemarks(req.getRemarks());
        if (req.getAttachment() != null) advance.setAttachment(req.getAttachment());
        return SalaryAdvanceResponseDTO.fromEntity(advanceRepository.save(advance));
    }

    public SalaryAdvanceResponseDTO approveAdvance(Long id, SalaryAdvanceApprovalRequestDTO req) {
        SalaryAdvance advance = advanceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Advance not found with id: " + id));

        String decision = req.getApprovalStatus() != null ? req.getApprovalStatus() : "Approved";
        BigDecimal approvedAmount = req.getApprovedAmount() != null ? req.getApprovedAmount() : BigDecimal.ZERO;
        Integer installmentCount = req.getInstallmentCount() != null ? req.getInstallmentCount() : 1;
        BigDecimal installmentAmount = installmentCount > 0
                ? approvedAmount.divide(BigDecimal.valueOf(installmentCount), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        advance.setApprovedAmount(approvedAmount);
        advance.setApprovalStatus(decision);
        advance.setInstallmentCount(installmentCount);
        advance.setInstallmentAmount(installmentAmount);
        advance.setDeductionMode(req.getDeductionMode() != null ? req.getDeductionMode() : "Monthly");
        advance.setStartMonth(req.getStartMonth());
        advance.setAutoDeduct(req.getAutoDeduct() != null ? req.getAutoDeduct() : true);
        advance.setApprovedBy(req.getApprovedBy() != null ? req.getApprovedBy() : "HR Manager");
        advance.setApprovedDate(LocalDate.now());

        if ("Approved".equalsIgnoreCase(decision)) {
            advance.setStatus("Active");
            advance.setBalance(approvedAmount);
            advance.setNextDeductionDate(req.getStartMonth());
        } else if ("Rejected".equalsIgnoreCase(decision)) {
            advance.setStatus("Rejected");
            advance.setBalance(BigDecimal.ZERO);
            advance.setNextDeductionDate(null);
        }

        if (req.getApprovalRemarks() != null && !req.getApprovalRemarks().isBlank()) {
            String existing = advance.getRemarks() != null ? advance.getRemarks() + "\n" : "";
            advance.setRemarks(existing + "Approval Note: " + req.getApprovalRemarks());
        }

        return SalaryAdvanceResponseDTO.fromEntity(advanceRepository.save(advance));
    }

    public void deleteAdvance(Long id) {
        SalaryAdvance advance = advanceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Advance not found with id: " + id));
        advanceRepository.delete(advance);
    }
}
