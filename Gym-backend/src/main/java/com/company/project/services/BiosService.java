package com.company.project.services;

import com.company.project.dto.BiosActivityLogRequestDTO;
import com.company.project.dto.BiosActivityLogResponseDTO;
import com.company.project.dto.BiosBranchComparisonDTO;
import com.company.project.dto.BiosSettingsDTO;
import com.company.project.entities.Branch;
import com.company.project.entities.BiosActivityLog;
import com.company.project.entities.BiosSettings;
import com.company.project.entities.Member;
import com.company.project.entities.Receipt;
import com.company.project.repositories.BiosActivityLogRepository;
import com.company.project.repositories.BiosSettingsRepository;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReceiptRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class BiosService {

    private static final Set<String> VALID_FREQUENCIES = Set.of("WEEKLY", "MONTHLY");
    private static final Set<String> VALID_ACTIVITY_TYPES = Set.of("REPORT", "EXPORT");

    private final BiosSettingsRepository biosSettingsRepository;
    private final BiosActivityLogRepository biosActivityLogRepository;
    private final BranchRepository branchRepository;
    private final MemberRepository memberRepository;
    private final ReceiptRepository receiptRepository;
    private final BranchSettingsResolver branchSettingsResolver;

    public BiosService(BiosSettingsRepository biosSettingsRepository,
                        BiosActivityLogRepository biosActivityLogRepository,
                        BranchRepository branchRepository,
                        MemberRepository memberRepository,
                        ReceiptRepository receiptRepository,
                        BranchSettingsResolver branchSettingsResolver) {
        this.biosSettingsRepository = biosSettingsRepository;
        this.biosActivityLogRepository = biosActivityLogRepository;
        this.branchRepository = branchRepository;
        this.memberRepository = memberRepository;
        this.receiptRepository = receiptRepository;
        this.branchSettingsResolver = branchSettingsResolver;
    }

    @Transactional(readOnly = true)
    public BiosSettingsDTO getSettings() {
        Long branchId = branchSettingsResolver.resolveForRead();
        BiosSettings settings = branchId != null
                ? biosSettingsRepository.findByBranchId(branchId).orElseGet(BiosSettings::new)
                : new BiosSettings();
        return toDto(settings);
    }

    @Transactional
    public BiosSettingsDTO updateSettings(BiosSettingsDTO request) {
        Long branchId = branchSettingsResolver.resolveForWrite();
        BiosSettings settings = biosSettingsRepository.findByBranchId(branchId).orElseGet(BiosSettings::new);

        if (request.getMonthlyRevenueTarget() != null) {
            if (request.getMonthlyRevenueTarget().signum() < 0) {
                throw new IllegalArgumentException("Monthly revenue target cannot be negative.");
            }
            settings.setMonthlyRevenueTarget(request.getMonthlyRevenueTarget());
        }

        if (request.getDailyCheckInTargetPercent() != null) {
            if (request.getDailyCheckInTargetPercent() <= 0 || request.getDailyCheckInTargetPercent() > 100) {
                throw new IllegalArgumentException("Daily check-in target must be between 0 and 100.");
            }
            settings.setDailyCheckInTargetPercent(request.getDailyCheckInTargetPercent());
        }

        if (request.getAlertEmail() != null) settings.setAlertEmail(request.getAlertEmail());
        if (request.getAlertRetentionThreshold() != null) {
            if (request.getAlertRetentionThreshold() <= 0 || request.getAlertRetentionThreshold() > 100) {
                throw new IllegalArgumentException("Alert retention threshold must be between 0 and 100.");
            }
            settings.setAlertRetentionThreshold(request.getAlertRetentionThreshold());
        }
        if (request.getAlertEnabled() != null) settings.setAlertEnabled(request.getAlertEnabled());
        if (Boolean.TRUE.equals(settings.getAlertEnabled()) && !StringUtils.hasText(settings.getAlertEmail())) {
            throw new IllegalArgumentException("An alert email is required to enable retention alerts.");
        }

        if (request.getScheduleEmail() != null) settings.setScheduleEmail(request.getScheduleEmail());
        if (request.getScheduleFrequency() != null) {
            String frequency = request.getScheduleFrequency().toUpperCase();
            if (!VALID_FREQUENCIES.contains(frequency)) {
                throw new IllegalArgumentException("Schedule frequency must be WEEKLY or MONTHLY.");
            }
            settings.setScheduleFrequency(frequency);
        }
        if (request.getScheduleEnabled() != null) settings.setScheduleEnabled(request.getScheduleEnabled());
        if (Boolean.TRUE.equals(settings.getScheduleEnabled()) && !StringUtils.hasText(settings.getScheduleEmail())) {
            throw new IllegalArgumentException("A recipient email is required to enable scheduled reports.");
        }

        if (request.getRevenueAlertThresholdPercent() != null) {
            if (request.getRevenueAlertThresholdPercent() <= 0 || request.getRevenueAlertThresholdPercent() > 100) {
                throw new IllegalArgumentException("Revenue alert threshold must be between 0 and 100.");
            }
            settings.setRevenueAlertThresholdPercent(request.getRevenueAlertThresholdPercent());
        }
        if (request.getRevenueAlertEnabled() != null) settings.setRevenueAlertEnabled(request.getRevenueAlertEnabled());
        if (Boolean.TRUE.equals(settings.getRevenueAlertEnabled()) && !StringUtils.hasText(settings.getAlertEmail())) {
            throw new IllegalArgumentException("An alert email is required to enable revenue shortfall alerts.");
        }
        if (Boolean.TRUE.equals(settings.getRevenueAlertEnabled()) && settings.getMonthlyRevenueTarget() == null) {
            throw new IllegalArgumentException("Set a monthly revenue target before enabling revenue shortfall alerts.");
        }

        if (request.getBenchmarkRevenuePerMember() != null) settings.setBenchmarkRevenuePerMember(request.getBenchmarkRevenuePerMember());
        if (request.getBenchmarkRetentionPercent() != null) settings.setBenchmarkRetentionPercent(request.getBenchmarkRetentionPercent());
        if (request.getBenchmarkClassUtilizationPercent() != null) settings.setBenchmarkClassUtilizationPercent(request.getBenchmarkClassUtilizationPercent());
        if (request.getBenchmarkStaffEfficiencyPercent() != null) settings.setBenchmarkStaffEfficiencyPercent(request.getBenchmarkStaffEfficiencyPercent());
        if (request.getBenchmarkOperatingMarginPercent() != null) settings.setBenchmarkOperatingMarginPercent(request.getBenchmarkOperatingMarginPercent());

        biosSettingsRepository.save(settings);
        return toDto(settings);
    }

    private BiosSettingsDTO toDto(BiosSettings settings) {
        BiosSettingsDTO dto = new BiosSettingsDTO();
        dto.setMonthlyRevenueTarget(settings.getMonthlyRevenueTarget());
        dto.setDailyCheckInTargetPercent(settings.getDailyCheckInTargetPercent());
        dto.setAlertEnabled(Boolean.TRUE.equals(settings.getAlertEnabled()));
        dto.setAlertEmail(settings.getAlertEmail());
        dto.setAlertRetentionThreshold(settings.getAlertRetentionThreshold());
        dto.setScheduleEnabled(Boolean.TRUE.equals(settings.getScheduleEnabled()));
        dto.setScheduleEmail(settings.getScheduleEmail());
        dto.setScheduleFrequency(settings.getScheduleFrequency());
        dto.setRevenueAlertEnabled(Boolean.TRUE.equals(settings.getRevenueAlertEnabled()));
        dto.setRevenueAlertThresholdPercent(settings.getRevenueAlertThresholdPercent());
        dto.setBenchmarkRevenuePerMember(settings.getBenchmarkRevenuePerMember());
        dto.setBenchmarkRetentionPercent(settings.getBenchmarkRetentionPercent());
        dto.setBenchmarkClassUtilizationPercent(settings.getBenchmarkClassUtilizationPercent());
        dto.setBenchmarkStaffEfficiencyPercent(settings.getBenchmarkStaffEfficiencyPercent());
        dto.setBenchmarkOperatingMarginPercent(settings.getBenchmarkOperatingMarginPercent());
        return dto;
    }

    // ── Activity log (Recent Reports / Recent Exports) ────────────────────────

    @Transactional
    public BiosActivityLogResponseDTO logActivity(BiosActivityLogRequestDTO request) {
        String type = request.getType() != null ? request.getType().toUpperCase() : null;
        if (!VALID_ACTIVITY_TYPES.contains(type)) {
            throw new IllegalArgumentException("Activity type must be REPORT or EXPORT.");
        }
        BiosActivityLog log = new BiosActivityLog();
        log.setType(type);
        log.setTitle(StringUtils.hasText(request.getTitle()) ? request.getTitle() : "Untitled");
        log.setFormat(StringUtils.hasText(request.getFormat()) ? request.getFormat() : "CSV");
        log.setRowCount(request.getRowCount());
        return BiosActivityLogResponseDTO.fromEntity(biosActivityLogRepository.save(log));
    }

    @Transactional(readOnly = true)
    public List<BiosActivityLogResponseDTO> getRecentActivity(String type, int limit) {
        String normalizedType = type != null ? type.toUpperCase() : null;
        if (!VALID_ACTIVITY_TYPES.contains(normalizedType)) {
            throw new IllegalArgumentException("Activity type must be REPORT or EXPORT.");
        }
        return biosActivityLogRepository.findByTypeOrderByCreatedAtDesc(normalizedType, PageRequest.of(0, Math.max(1, Math.min(limit, 100))))
                .stream().map(BiosActivityLogResponseDTO::fromEntity).collect(Collectors.toList());
    }

    // ── Branch comparison ──────────────────────────────────────────────────────

    /**
     * Per-branch member/revenue snapshot for the current month. Only returns a
     * meaningful cross-branch view when called with no active-branch header set
     * (admin "All Branches" mode) — the Hibernate branch filter is disabled in
     * that case (see BranchContextFilter), so memberRepository/receiptRepository
     * here see rows from every branch rather than just one.
     */
    @Transactional(readOnly = true)
    public List<BiosBranchComparisonDTO> getBranchComparison() {
        List<Branch> branches = branchRepository.findByStatus("ACTIVE");
        if (branches.isEmpty()) {
            return List.of();
        }

        List<Member> allMembers = memberRepository.findAll();
        Map<Long, List<Member>> membersByBranch = allMembers.stream()
                .filter(m -> m.getBranchId() != null)
                .collect(Collectors.groupingBy(Member::getBranchId));

        LocalDate today = LocalDate.now();
        LocalDateTime monthStart = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime monthEnd = monthStart.plusMonths(1);

        List<Receipt> paidThisMonth = receiptRepository.findAll().stream()
                .filter(r -> "Paid".equals(r.getStatus()))
                .filter(r -> {
                    LocalDateTime when = r.getTransactionDate() != null ? r.getTransactionDate() : r.getCreatedAt();
                    return when != null && !when.isBefore(monthStart) && when.isBefore(monthEnd);
                })
                .collect(Collectors.toList());
        Map<Long, BigDecimal> revenueByBranch = paidThisMonth.stream()
                .filter(r -> r.getBranchId() != null)
                .collect(Collectors.groupingBy(
                        Receipt::getBranchId,
                        Collectors.reducing(BigDecimal.ZERO,
                                r -> r.getPaidAmount() != null ? r.getPaidAmount() : (r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO),
                                BigDecimal::add)
                ));

        return branches.stream().map(branch -> {
            List<Member> branchMembers = membersByBranch.getOrDefault(branch.getId(), List.of());
            long total = branchMembers.size();
            long active = branchMembers.stream().filter(m -> "active".equalsIgnoreCase(m.getMembershipStatus())).count();
            double retention = total > 0
                    ? BigDecimal.valueOf(active).divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)).setScale(1, RoundingMode.HALF_UP).doubleValue()
                    : 0.0;
            BigDecimal revenue = revenueByBranch.getOrDefault(branch.getId(), BigDecimal.ZERO);

            return new BiosBranchComparisonDTO(
                    String.valueOf(branch.getId()),
                    branch.getBranchName(),
                    branch.getBranchCode(),
                    total, active, retention, revenue
            );
        }).collect(Collectors.toList());
    }
}
