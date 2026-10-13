package com.company.project.services;

import com.company.project.dto.BiosActivityLogRequestDTO;
import com.company.project.dto.BiosActivityLogResponseDTO;
import com.company.project.dto.BiosBranchComparisonDTO;
import com.company.project.dto.BiosOverviewDTO;
import com.company.project.dto.BiosSettingsDTO;
import com.company.project.entities.Branch;
import com.company.project.entities.BiosActivityLog;
import com.company.project.entities.BiosMonthlySnapshot;
import com.company.project.entities.BiosSettings;
import com.company.project.repositories.BiosActivityLogRepository;
import com.company.project.repositories.BiosMonthlySnapshotRepository;
import com.company.project.repositories.BiosSettingsRepository;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.JournalVoucherLineRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.security.BranchContextHolder;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.hibernate.Session;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
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
    private final JournalVoucherLineRepository journalVoucherLineRepository;
    private final BiosMonthlySnapshotRepository biosMonthlySnapshotRepository;
    private final FinancialAnalyticsService financialAnalyticsService;
    private final BranchSettingsResolver branchSettingsResolver;

    @PersistenceContext
    private EntityManager entityManager;

    public BiosService(BiosSettingsRepository biosSettingsRepository,
                        BiosActivityLogRepository biosActivityLogRepository,
                        BranchRepository branchRepository,
                        MemberRepository memberRepository,
                        JournalVoucherLineRepository journalVoucherLineRepository,
                        BiosMonthlySnapshotRepository biosMonthlySnapshotRepository,
                        FinancialAnalyticsService financialAnalyticsService,
                        BranchSettingsResolver branchSettingsResolver) {
        this.biosSettingsRepository = biosSettingsRepository;
        this.biosActivityLogRepository = biosActivityLogRepository;
        this.branchRepository = branchRepository;
        this.memberRepository = memberRepository;
        this.journalVoucherLineRepository = journalVoucherLineRepository;
        this.biosMonthlySnapshotRepository = biosMonthlySnapshotRepository;
        this.financialAnalyticsService = financialAnalyticsService;
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

    // ── Overview (member KPIs + member trend) ─────────────────────────────────

    /**
     * Member KPIs and a month-by-month member trend ending with the current
     * month, scoped by the request's branch filter. Past months come from the
     * month-end snapshots where every branch in scope has one, and are estimated
     * from membership periods and receipts otherwise.
     */
    @Transactional(readOnly = true)
    public BiosOverviewDTO getOverview(int months) {
        int monthCount = Math.max(1, Math.min(months, 24));
        LocalDate today = LocalDate.now();
        LocalDateTime startOfToday = today.atStartOfDay();
        YearMonth currentMonth = YearMonth.from(today);
        YearMonth firstMonth = currentMonth.minusMonths(monthCount - 1L);

        BiosOverviewDTO overview = new BiosOverviewDTO();
        overview.setAsOf(today);

        long total = 0, active = 0, expired = 0, suspended = 0, overdue = 0;
        List<BiosOverviewDTO.MembershipTypeRow> types = new ArrayList<>();
        for (Object[] row : memberRepository.biosStatusBreakdownByMembershipType(startOfToday)) {
            String type = row[0] != null && !row[0].toString().isBlank() ? row[0].toString() : "Unknown";
            types.add(new BiosOverviewDTO.MembershipTypeRow(type, toLong(row[1]), toLong(row[2]), toLong(row[3])));
            total += toLong(row[1]);
            active += toLong(row[2]);
            expired += toLong(row[3]);
            suspended += toLong(row[4]);
            overdue += toLong(row[5]);
        }
        types.sort((a, b) -> Long.compare(b.total(), a.total()));
        overview.setTotalMembers(total);
        overview.setActiveMembers(active);
        overview.setExpiredMembers(expired);
        overview.setSuspendedMembers(suspended);
        overview.setOverdueMembers(overdue);
        overview.setMembershipTypes(types);

        Map<YearMonth, Long> joinsByMonth = new HashMap<>();
        for (Object[] row : memberRepository.countJoinsByMonthSince(firstMonth.atDay(1).atStartOfDay())) {
            if (row[0] != null && row[1] != null) {
                joinsByMonth.put(YearMonth.of(((Number) row[0]).intValue(), ((Number) row[1]).intValue()), toLong(row[2]));
            }
        }
        overview.setRecentJoins(joinsByMonth.getOrDefault(currentMonth, 0L));

        // A past month counts as recorded only if every branch in scope has a snapshot for it.
        int branchesInScope = BranchContextHolder.getActiveBranchId() != null
                ? 1 : branchRepository.findByStatus("ACTIVE").size();
        Map<YearMonth, List<BiosMonthlySnapshot>> snapshotsByMonth = biosMonthlySnapshotRepository
                .findByMonthBetween(firstMonth.atDay(1), currentMonth.minusMonths(1).atDay(1)).stream()
                .collect(Collectors.groupingBy(s -> YearMonth.from(s.getMonth())));

        List<BiosOverviewDTO.MemberTrendPoint> trend = new ArrayList<>();
        long membersOnBooks = memberRepository.countJoinedBefore(firstMonth.atDay(1).atStartOfDay());
        for (YearMonth month = firstMonth; !month.isAfter(currentMonth); month = month.plusMonths(1)) {
            long joined = joinsByMonth.getOrDefault(month, 0L);
            membersOnBooks += joined;
            List<BiosMonthlySnapshot> snapshots = snapshotsByMonth.getOrDefault(month, List.of());

            long monthMembers;
            long monthActive;
            long monthNew;
            String source;
            if (month.equals(currentMonth)) {
                monthMembers = total;
                monthActive = active;
                monthNew = joined;
                source = "live";
            } else if (branchesInScope > 0 && snapshots.size() >= branchesInScope) {
                monthMembers = snapshots.stream().mapToLong(BiosMonthlySnapshot::getTotalMembers).sum();
                monthActive = snapshots.stream().mapToLong(BiosMonthlySnapshot::getActiveMembers).sum();
                monthNew = snapshots.stream().mapToLong(BiosMonthlySnapshot::getNewMembers).sum();
                source = "snapshot";
            } else {
                monthMembers = membersOnBooks;
                monthActive = Math.min(monthMembers,
                        memberRepository.countEstimatedActiveAt(month.plusMonths(1).atDay(1).atStartOfDay()));
                monthNew = joined;
                source = "estimated";
            }
            double retention = retentionPercent(monthActive, monthMembers);
            double churn = monthMembers > 0
                    ? BigDecimal.valueOf(100).subtract(BigDecimal.valueOf(retention)).setScale(1, RoundingMode.HALF_UP).doubleValue()
                    : 0.0;
            trend.add(new BiosOverviewDTO.MemberTrendPoint(month.toString(), monthMembers, monthActive, monthNew,
                    retention, churn, source));
        }
        overview.setMemberTrend(trend);
        return overview;
    }

    // ── Branch comparison ──────────────────────────────────────────────────────

    /**
     * Per-branch member/revenue snapshot for the current month. Only returns a
     * meaningful cross-branch view when called with no active-branch header set
     * (admin "All Branches" mode) — the Hibernate branch filter is disabled in
     * that case (see BranchContextFilter), so the grouped queries here see rows
     * from every branch rather than just one. Revenue is posted journal revenue,
     * the same figure the Finance dashboard and the BiOS revenue chart show.
     */
    @Transactional(readOnly = true)
    public List<BiosBranchComparisonDTO> getBranchComparison() {
        List<Branch> branches = branchRepository.findByStatus("ACTIVE");
        if (branches.isEmpty()) {
            return List.of();
        }

        Map<Long, long[]> membersByBranch = new HashMap<>();
        for (Object[] row : memberRepository.countTotalAndActiveByBranch(LocalDate.now().atStartOfDay())) {
            if (row[0] != null) {
                membersByBranch.put((Long) row[0], new long[] { toLong(row[1]), toLong(row[2]) });
            }
        }

        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        Map<Long, BigDecimal> revenueByBranch = postedRevenueByBranch(monthStart, monthStart.plusMonths(1));

        return branches.stream().map(branch -> {
            long[] counts = membersByBranch.getOrDefault(branch.getId(), new long[] { 0, 0 });
            return new BiosBranchComparisonDTO(
                    String.valueOf(branch.getId()),
                    branch.getBranchName(),
                    branch.getBranchCode(),
                    counts[0], counts[1], retentionPercent(counts[1], counts[0]),
                    revenueByBranch.getOrDefault(branch.getId(), BigDecimal.ZERO)
            );
        }).collect(Collectors.toList());
    }

    // ── Scheduled reports / alerts (see BiosScheduler) ─────────────────────────

    /** One branch's numbers for a BiOS email, already scoped to that branch. */
    public record BranchSnapshot(String branchName, long totalMembers, long activeMembers,
                                 double retentionPercent, BigDecimal revenue) {}

    /**
     * Every branch in the current tenant database with a BiOS report or alert
     * switched on. Called with no active branch, so the branch filter is off and
     * every branch's settings row is visible.
     */
    @Transactional(readOnly = true)
    public List<BiosSettings> findBranchesWithSchedulesOrAlerts() {
        return biosSettingsRepository.findAll().stream()
                .filter(s -> s.getBranchId() != null)
                .filter(s -> Boolean.TRUE.equals(s.getScheduleEnabled())
                        || Boolean.TRUE.equals(s.getAlertEnabled())
                        || Boolean.TRUE.equals(s.getRevenueAlertEnabled()))
                .collect(Collectors.toList());
    }

    /**
     * Members, retention and posted revenue for [revenueFrom, revenueTo), scoped
     * to one branch. Scheduled jobs have no request (and so no open-in-view
     * EntityManager), so the branch filter is enabled here, inside the
     * transaction, rather than relying on BranchFilterAspect's ordering.
     */
    @Transactional(readOnly = true)
    public BranchSnapshot branchSnapshot(Long branchId, LocalDate revenueFrom, LocalDate revenueTo) {
        enableBranchFilter(branchId);
        long total = memberRepository.count();
        long active = memberRepository.countEffectivelyActive(LocalDate.now().atStartOfDay());
        BigDecimal revenue = postedRevenueByBranch(revenueFrom, revenueTo).getOrDefault(branchId, BigDecimal.ZERO);
        String branchName = branchRepository.findById(branchId).map(Branch::getBranchName).orElse("Branch " + branchId);
        return new BranchSnapshot(branchName, total, active, retentionPercent(active, total), revenue);
    }

    /** The Finance dashboard's all-time totals, scoped to one branch (see branchSnapshot). */
    @Transactional(readOnly = true)
    public Map<String, Object> branchFinancialDashboard(Long branchId) {
        enableBranchFilter(branchId);
        return financialAnalyticsService.getDashboard();
    }

    /** Ids of every ACTIVE branch in the current tenant database (called with no active branch). */
    @Transactional(readOnly = true)
    public List<Long> findActiveBranchIds() {
        return branchRepository.findByStatus("ACTIVE").stream().map(Branch::getId).collect(Collectors.toList());
    }

    /**
     * Records one branch's month-end member counts for `month`, unless already
     * recorded. Counts are as of the first moment of the following month, the
     * same cut-off the overview's estimates use, so recorded and estimated
     * months line up. Returns true if a snapshot was written.
     */
    @Transactional
    public boolean captureMonthlySnapshot(Long branchId, YearMonth month) {
        enableBranchFilter(branchId);
        LocalDate monthStart = month.atDay(1);
        if (biosMonthlySnapshotRepository.existsByBranchIdAndMonth(branchId, monthStart)) {
            return false;
        }
        LocalDateTime monthEnd = month.plusMonths(1).atDay(1).atStartOfDay();
        long membersAtEnd = memberRepository.countJoinedBefore(monthEnd);
        long membersAtStart = memberRepository.countJoinedBefore(monthStart.atStartOfDay());

        BiosMonthlySnapshot snapshot = new BiosMonthlySnapshot();
        snapshot.setBranchId(branchId);
        snapshot.setMonth(monthStart);
        snapshot.setTotalMembers(Math.toIntExact(membersAtEnd));
        snapshot.setActiveMembers(Math.toIntExact(memberRepository.countEffectivelyActiveJoinedBefore(monthEnd)));
        snapshot.setNewMembers(Math.toIntExact(membersAtEnd - membersAtStart));
        biosMonthlySnapshotRepository.save(snapshot);
        return true;
    }

    private void enableBranchFilter(Long branchId) {
        entityManager.unwrap(Session.class).enableFilter("branchFilter").setParameter("branchId", branchId);
    }

    private Map<Long, BigDecimal> postedRevenueByBranch(LocalDate from, LocalDate to) {
        Map<Long, BigDecimal> revenueByBranch = new HashMap<>();
        for (Object[] row : journalVoucherLineRepository.sumPostedRevenueByBranch(from, to)) {
            if (row[0] != null && row[1] != null) {
                revenueByBranch.put((Long) row[0], (BigDecimal) row[1]);
            }
        }
        return revenueByBranch;
    }

    private static double retentionPercent(long active, long total) {
        return total > 0
                ? BigDecimal.valueOf(active).divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)).setScale(1, RoundingMode.HALF_UP).doubleValue()
                : 0.0;
    }

    private static long toLong(Object value) {
        return value != null ? ((Number) value).longValue() : 0L;
    }
}
