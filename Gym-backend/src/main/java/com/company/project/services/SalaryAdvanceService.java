package com.company.project.services;

import com.company.project.dto.SalaryAdvanceApprovalRequestDTO;
import com.company.project.dto.SalaryAdvanceRequestDTO;
import com.company.project.dto.SalaryAdvanceResponseDTO;
import com.company.project.entities.MobilePushToken;
import com.company.project.entities.SalaryAdvance;
import com.company.project.entities.Staff;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.exceptions.UnprocessableRequestException;
import com.company.project.repositories.FinancialSettingRepository;
import com.company.project.repositories.SalaryAdvanceRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.mobile.push.MobilePushTokenRepository;
import com.company.project.services.mobile.push.ExpoPushClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class SalaryAdvanceService {

    private static final Logger log = LoggerFactory.getLogger(SalaryAdvanceService.class);

    public static final String STATUS_PENDING = "Pending Approval";
    public static final String STATUS_CANCELLED = "Cancelled";
    /** Push data type the mobile app routes to the ledger's Advances tab. */
    public static final String PUSH_TYPE_DECIDED = "salary_advance_decided";
    private static final String APPROVER_LINK = "/salary-advances";
    private static final String APPROVER_REQUESTS_LINK = "/salary-advances?tab=requests";
    private static final String EMPLOYEE_LINK = "/ledger?tab=advances";

    private final SalaryAdvanceRepository advanceRepository;
    private final NotificationService notificationService;
    private final FinancialEventService financialEventService;
    private final StaffRepository staffRepository;
    private final FinancialSettingRepository financialSettingRepository;
    private final MobilePushTokenRepository pushTokenRepository;
    private final ExpoPushClient expoPushClient;
    private final TransactionTemplate isolatedTx;

    public SalaryAdvanceService(SalaryAdvanceRepository advanceRepository,
                                 NotificationService notificationService,
                                 FinancialEventService financialEventService,
                                 StaffRepository staffRepository,
                                 FinancialSettingRepository financialSettingRepository,
                                 MobilePushTokenRepository pushTokenRepository,
                                 ExpoPushClient expoPushClient,
                                 PlatformTransactionManager transactionManager) {
        this.advanceRepository     = advanceRepository;
        this.notificationService   = notificationService;
        this.financialEventService = financialEventService;
        this.staffRepository       = staffRepository;
        this.financialSettingRepository = financialSettingRepository;
        this.pushTokenRepository   = pushTokenRepository;
        this.expoPushClient        = expoPushClient;
        this.isolatedTx = new TransactionTemplate(transactionManager);
        this.isolatedTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
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
        int proposedInstallments = req.getInstallmentCount() != null && req.getInstallmentCount() > 0 ? req.getInstallmentCount() : 0;
        advance.setInstallmentCount(proposedInstallments);
        advance.setInstallmentAmount(proposedInstallments > 0 && advance.getRequestedAmount().signum() > 0
                ? advance.getRequestedAmount().divide(BigDecimal.valueOf(proposedInstallments), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO);
        advance.setStartMonth(req.getStartMonth() != null ? req.getStartMonth().withDayOfMonth(1) : null);
        advance.setDeductionMode("Monthly");
        advance.setAutoDeduct(req.getAutoDeduct() != null ? req.getAutoDeduct() : true);
        advance.setStatus(STATUS_PENDING);
        advance.setRequestedVia("web");
        advance.setNextDeductionDate(null);
        advance.setApprovedBy(null);
        advance.setApprovedDate(null);
        advance.setAttachment(req.getAttachment());
        SalaryAdvance saved = advanceRepository.save(advance);
        notifyApprovers(saved, APPROVER_LINK);
        return SalaryAdvanceResponseDTO.fromEntity(saved);
    }

    /** Tells admin and HR a new advance is waiting for approval. */
    public void notifyApprovers(SalaryAdvance saved, String actionUrl) {
        notificationService.notifyRoles(
                List.of("GYMBIOS_ADMIN", "HR"),
                "Salary Advance Requested",
                (saved.getEmployeeName() != null ? saved.getEmployeeName() : "An employee") +
                " requested a salary advance" +
                (saved.getRequestedAmount() != null ? " of " + money(saved.getRequestedAmount(), saved.getBranchId()) : "") + ".",
                "WARNING", "HIGH", "PAYROLL",
                saved.getId(), actionUrl,
                "SALARY_ADV_CREATED_" + saved.getId()
        );
    }

    /** Deep link the approver notification uses for an app request. */
    public static String approverRequestsLink() {
        return APPROVER_REQUESTS_LINK;
    }

    public SalaryAdvanceResponseDTO updateAdvance(Long id, SalaryAdvanceRequestDTO req) {
        SalaryAdvance advance = advanceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Advance not found with id: " + id));
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
                .orElseThrow(() -> new EntityNotFoundException("Advance not found with id: " + id));

        // Only a pending request can be decided: approving an Active advance again would post a
        // second disbursement and reset its balance; a cancelled one was withdrawn by the employee.
        if (!STATUS_PENDING.equalsIgnoreCase(advance.getStatus())) {
            throw new UnprocessableRequestException(STATUS_CANCELLED.equalsIgnoreCase(advance.getStatus())
                    ? "This request was withdrawn by the employee."
                    : "This advance has already been processed (" + advance.getStatus() + ").");
        }

        // Deciding again would reset the balance to the full amount, wiping the installments
        // already recovered (and the employee would be charged for them twice).
        if (advance.getStatus() != null && !"Pending Approval".equalsIgnoreCase(advance.getStatus())) {
            throw new BusinessRuleViolationException("This advance has already been decided (status: " + advance.getStatus()
                    + ") — it can't be approved or rejected again");
        }
        String decision = req.getApprovalStatus() != null ? req.getApprovalStatus() : "Approved";
        if (!"Approved".equalsIgnoreCase(decision) && !"Rejected".equalsIgnoreCase(decision)) {
            throw new IllegalArgumentException("approval_status must be Approved or Rejected");
        }
        boolean approved = "Approved".equalsIgnoreCase(decision);
        if (approved && (req.getApprovedAmount() == null || req.getApprovedAmount().signum() <= 0)) {
            throw new IllegalArgumentException("Approved amount must be greater than zero.");
        }
        BigDecimal approvedAmount = req.getApprovedAmount() != null ? req.getApprovedAmount() : BigDecimal.ZERO;
        if ("Approved".equalsIgnoreCase(decision) && approvedAmount.signum() <= 0) {
            throw new BusinessRuleViolationException("Enter the approved amount (above zero)");
        }
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
        advance.setApprovedBy(req.getApprovedBy() != null ? req.getApprovedBy() : StaffAttendanceReviewService.currentUser());
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

        String note = req.getApprovalRemarks() != null ? req.getApprovalRemarks().trim() : "";
        if (!approved) {
            // Kept on its own so the app can show the reason on its own line.
            advance.setRejectionNote(note.isEmpty() ? null : note);
        } else if (!note.isEmpty()) {
            String existing = advance.getRemarks() != null ? advance.getRemarks() + "\n" : "";
            advance.setRemarks(existing + "Approval Note: " + note);
        }

        SalaryAdvance saved = advanceRepository.save(advance);

        // Generate journal entry when advance is approved and disbursed:
        // DR Salary Advance Receivable, CR Cash at Bank
        if (approved) {
            financialEventService.onSalaryAdvanceDisbursed(saved);
        }

        notifyEmployeeOfDecision(saved, approved);

        return SalaryAdvanceResponseDTO.fromEntity(saved);
    }

    /**
     * In-app notification + push to the employee, after the decision commits. App requests
     * name their requester; web-entered advances fall back to the user linked to the staff ID.
     */
    private void notifyEmployeeOfDecision(SalaryAdvance advance, boolean approved) {
        Staff staff = advance.getEmployeeId() != null
                ? staffRepository.findByStaffId(advance.getEmployeeId()).orElse(null)
                : null;
        Long userId = advance.getRequestedByUserId() != null
                ? advance.getRequestedByUserId()
                : staff != null ? staff.getUserId() : null;
        List<String> tokens = staff != null
                ? pushTokenRepository.findByStaffIdIn(List.of(staff.getId())).stream()
                        .map(MobilePushToken::getExpoPushToken)
                        .toList()
                : List.of();
        if (userId == null && tokens.isEmpty()) return;

        String title = approved ? "Salary advance approved" : "Salary advance rejected";
        String message;
        if (approved) {
            StringBuilder sb = new StringBuilder("Your salary advance of ")
                    .append(money(advance.getApprovedAmount(), advance.getBranchId()))
                    .append(" was approved");
            if (advance.getInstallmentCount() != null && advance.getInstallmentCount() > 0) {
                sb.append(", repaid in ").append(advance.getInstallmentCount())
                        .append(advance.getInstallmentCount() == 1 ? " installment" : " installments");
                if (advance.getInstallmentAmount() != null) {
                    sb.append(" of ").append(money(advance.getInstallmentAmount(), advance.getBranchId()));
                }
            }
            if (advance.getStartMonth() != null) {
                sb.append(" from ").append(advance.getStartMonth().format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH)));
            }
            message = sb.append('.').toString();
        } else {
            message = "Your salary advance request of " + money(advance.getRequestedAmount(), advance.getBranchId())
                    + " was rejected."
                    + (StringUtils.hasText(advance.getRejectionNote()) ? " Reason: " + advance.getRejectionNote() : "");
        }

        Long advanceId = advance.getId();
        String eventKey = "SALARY_ADV_DECIDED_" + advanceId;
        runAfterCommit(() -> {
            if (userId != null) {
                notificationService.notifyUser(userId, title, message,
                        approved ? "SUCCESS" : "WARNING", "HIGH", "PAYROLL",
                        advanceId, EMPLOYEE_LINK, eventKey);
            }
            if (tokens.isEmpty()) return;
            ExpoPushClient.SendResult result = expoPushClient.send(tokens, title, message,
                    Map.of("type", PUSH_TYPE_DECIDED, "advanceId", advanceId));
            if (!result.unregisteredTokens().isEmpty()) {
                isolatedTx.executeWithoutResult(st -> pushTokenRepository.deleteByExpoPushTokenIn(result.unregisteredTokens()));
            }
        });
    }

    /** Amount with the branch's display currency (Settings → currency), else AED like the app default. */
    public String money(BigDecimal amount, Long branchId) {
        BigDecimal value = amount != null ? amount : BigDecimal.ZERO;
        return currencyCode(branchId) + " " + value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private String currencyCode(Long branchId) {
        return financialSettingRepository.findByCategoryAndBranchIdOrderBySettingKeyAsc("APP_PREFERENCES", branchId).stream()
                .filter(f -> "currency_code".equals(f.getSettingKey()) && StringUtils.hasText(f.getSettingValue()))
                .map(f -> f.getSettingValue().trim())
                .findFirst().orElse("AED");
    }

    private static void runAfterCommit(Runnable action) {
        Runnable safe = () -> {
            try {
                action.run();
            } catch (Exception e) {
                // Never surface a notification failure on a decision that already committed.
                log.error("Salary advance decision notification failed: {}", e.getMessage(), e);
            }
        };
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            safe.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                safe.run();
            }
        });
    }

    public void deleteAdvance(Long id) {
        SalaryAdvance advance = advanceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Advance not found with id: " + id));
        // An approved advance was paid out (and journalled); deleting it would lose track of money
        // the employee still owes and of the installments already recovered.
        if (advance.getStatus() != null && !"Pending Approval".equalsIgnoreCase(advance.getStatus())
                && !"Rejected".equalsIgnoreCase(advance.getStatus())) {
            throw new BusinessRuleViolationException("An approved advance can't be deleted — it has been paid out. "
                    + "Recover or skip its installments instead.");
        }
        advanceRepository.delete(advance);
    }
}
