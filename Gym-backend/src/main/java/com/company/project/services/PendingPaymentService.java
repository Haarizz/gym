package com.company.project.services;

import com.company.project.dto.PaginationDTO;
import com.company.project.dto.PendingPaymentDTOs.*;
import com.company.project.dto.WriteOffRequestDTO;
import com.company.project.entities.Member;
import com.company.project.entities.MemberDueWriteOff;
import com.company.project.entities.Receipt;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.performance.PerformanceClock;
import com.company.project.repositories.MemberDueWriteOffRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.UserDetailsImpl;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Billing › Pending Payments: every open member bill (a receipt still owing money) and
 * writing one off as uncollectable.
 *
 * <p>A write-off is not a payment. It marks the bill "Written Off", records what was still
 * owed in {@link Receipt#getWrittenOffAmount()} and in the {@link MemberDueWriteOff} history,
 * and takes that amount off the member's outstanding balance. It creates no receipt, no
 * receipt voucher and no journal entry, and never touches the bill's paid amounts. Member bills
 * are booked cash-basis (only money received is journaled), so no receivable is left behind.
 */
@Service
@Transactional
public class PendingPaymentService {

    // A held membership cancellation finishes once its dues are written off (MembershipCancellationService).
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    public static final String STATUS_WRITTEN_OFF = "Written Off";
    private static final Set<String> OPEN_STATUSES = Set.of("Pending", "Overdue", "Partial");
    private static final Map<String, String> REASON_LABELS = Map.of(
            "UNCOLLECTABLE", "Uncollectable payment",
            "DISCONTINUED", "Member discontinued membership",
            "MANAGEMENT_DECISION", "Special management decision",
            "OLD_BALANCE", "Old outstanding balance",
            "OTHER", "Other");

    private final ReceiptRepository receiptRepository;
    private final MemberRepository memberRepository;
    private final MemberDueWriteOffRepository writeOffRepository;
    private final StaffRepository staffRepository;
    private final PerformanceClock clock;

    public PendingPaymentService(ReceiptRepository receiptRepository, MemberRepository memberRepository,
                                 MemberDueWriteOffRepository writeOffRepository, StaffRepository staffRepository,
                                 PerformanceClock clock) {
        this.receiptRepository = receiptRepository;
        this.memberRepository = memberRepository;
        this.writeOffRepository = writeOffRepository;
        this.staffRepository = staffRepository;
        this.clock = clock;
    }

    public static String reasonLabel(String reason) {
        return REASON_LABELS.getOrDefault(reason, reason);
    }

    // ── Open dues ───────────────────────────────────────────────────────────

    /** filter: all | overdue | upcoming. sort: due_date | amount. page is 1-based. */
    @Transactional(readOnly = true)
    public DuePage list(String search, String filter, String sort, String dir, int page, int size) {
        List<Due> dues = openDues(search);
        long overdue = dues.stream().filter(Due::overdue).count();

        List<Due> shown = dues.stream()
                .filter(d -> switch (filter == null ? "all" : filter) {
                    case "overdue" -> d.overdue();
                    case "upcoming" -> !d.overdue();
                    default -> true;
                })
                .sorted(comparator(sort, dir))
                .collect(Collectors.toList());

        int limit = Math.max(1, Math.min(size, 200));
        int pageNo = Math.max(1, page);
        int fromIdx = Math.min((pageNo - 1) * limit, shown.size());
        int toIdx = Math.min(fromIdx + limit, shown.size());
        PaginationDTO pagination = new PaginationDTO(pageNo, limit, shown.size(),
                (int) Math.ceil(shown.size() / (double) limit));
        return new DuePage(shown.subList(fromIdx, toIdx), pagination, dues.size(), overdue, dues.size() - overdue);
    }

    @Transactional(readOnly = true)
    public Stats stats(LocalDate from, LocalDate to) {
        List<Due> dues = openDues(null);
        BigDecimal total = sum(dues, Due::amountDue);
        BigDecimal overdue = sum(dues.stream().filter(Due::overdue).toList(), Due::amountDue);
        long overdueCount = dues.stream().filter(Due::overdue).count();
        List<MemberDueWriteOff> writeOffs = writeOffsIn(from, to);
        return new Stats(total, dues.size(), overdue, overdueCount,
                total.subtract(overdue), dues.size() - overdueCount,
                sum(writeOffs, MemberDueWriteOff::getWrittenOffAmount), writeOffs.size());
    }

    private List<Due> openDues(String search) {
        // "Overdue" turns over at the gym's midnight, not UTC's.
        LocalDate today = LocalDate.now(clock.zone(null));
        List<Due> dues = new ArrayList<>();
        for (Receipt r : receiptRepository.findOpenBills(likePattern(search))) {
            BigDecimal due = owed(r);
            if (due.signum() <= 0) continue;
            LocalDateTime dueAt = r.getDueDate() != null ? r.getDueDate() : r.getTransactionDate();
            LocalDate dueDate = dueAt != null ? dueAt.toLocalDate() : null;
            long daysOverdue = dueDate != null ? Math.max(0, ChronoUnit.DAYS.between(dueDate, today)) : 0;
            dues.add(new Due(r.getId(), r.getReceiptNo(), r.getInvoiceNo(),
                    r.getMemberDbId(), r.getMemberId(), r.getMemberName(), r.getMemberPhone(),
                    describe(r), r.getRemarks(), r.getTransactionDate(), dueDate,
                    money(r.getAmount()), paidToDate(r), due, daysOverdue > 0, daysOverdue));
        }
        return dues;
    }

    private static Comparator<Due> comparator(String sort, String dir) {
        Comparator<Due> c = "amount".equals(sort)
                ? Comparator.comparing(Due::amountDue)
                : Comparator.comparing(Due::dueDate, Comparator.nullsLast(Comparator.naturalOrder()));
        if ("desc".equalsIgnoreCase(dir)) c = c.reversed();
        return c.thenComparing(Due::receiptId);
    }

    // ── Write-off ───────────────────────────────────────────────────────────

    public WriteOff writeOff(Long receiptId, WriteOffRequestDTO request) {
        if (BranchContextHolder.getActiveBranchId() == null) {
            throw new BusinessRuleViolationException("Select a branch first: a due can't be written off in All Branches mode.");
        }
        String reason = request == null || request.getReason() == null ? "" : request.getReason().trim().toUpperCase(Locale.ROOT);
        if (!MemberDueWriteOff.REASONS.contains(reason)) {
            throw new BusinessRuleViolationException("Choose a reason for the write-off.");
        }
        String notes = request.getNotes() == null ? null : request.getNotes().trim();
        if ("OTHER".equals(reason) && !StringUtils.hasText(notes)) {
            throw new BusinessRuleViolationException("Add a note explaining the write-off when the reason is Other.");
        }
        if (notes != null && notes.length() > 1000) notes = notes.substring(0, 1000);

        // Locked until commit: a second write-off of the same bill waits here, then sees it done.
        Receipt bill = receiptRepository.findByIdForUpdate(receiptId)
                .orElseThrow(() -> new EntityNotFoundException("Bill not found: " + receiptId));
        if ("Payment".equalsIgnoreCase(bill.getTransactionType())) {
            throw new BusinessRuleViolationException("This is a payment receipt, not a bill with a due.");
        }
        if (STATUS_WRITTEN_OFF.equals(bill.getStatus()) || writeOffRepository.existsByReceiptId(receiptId)) {
            throw new BusinessRuleViolationException("This due has already been written off.");
        }
        BigDecimal due = owed(bill);
        if (!OPEN_STATUSES.contains(bill.getStatus()) || due.signum() <= 0) {
            throw new BusinessRuleViolationException("This bill has nothing left to collect, so there is nothing to write off.");
        }

        LocalDateTime now = LocalDateTime.now();
        BigDecimal paid = paidToDate(bill);

        bill.setWrittenOffAmount(due);
        bill.setStatus(STATUS_WRITTEN_OFF);
        receiptRepository.save(bill);

        if (bill.getMemberDbId() != null) {
            memberRepository.findById(bill.getMemberDbId()).ifPresent(m -> clearFromBalance(m, due));
        }

        MemberDueWriteOff w = new MemberDueWriteOff();
        w.setBranchId(bill.getBranchId());
        w.setReceiptId(bill.getId());
        w.setReceiptNo(bill.getReceiptNo());
        w.setInvoiceNo(bill.getInvoiceNo());
        w.setMemberDbId(bill.getMemberDbId());
        w.setMemberCode(bill.getMemberId());
        w.setMemberName(bill.getMemberName());
        w.setMemberPhone(bill.getMemberPhone());
        w.setBillDescription(truncate(describe(bill), 500));
        w.setBillDate(bill.getTransactionDate());
        w.setDueDate(bill.getDueDate() != null ? bill.getDueDate() : bill.getTransactionDate());
        w.setOriginalAmount(money(bill.getAmount()));
        w.setPaidAmount(paid);
        w.setWrittenOffAmount(due);
        w.setReason(reason);
        w.setNotes(notes);
        w.setWrittenOffBy(currentStaffName());
        w.setWrittenOffAt(now);
        try {
            w = writeOffRepository.saveAndFlush(w);
        } catch (DataIntegrityViolationException e) {
            throw new BusinessRuleViolationException("This due has already been written off.");
        }
        if (eventPublisher != null && bill.getMemberDbId() != null) {
            eventPublisher.publishEvent(new MembershipCancellationService.DuesClearedEvent(bill.getMemberDbId()));
        }
        return WriteOff.of(w);
    }

    private void clearFromBalance(Member m, BigDecimal amount) {
        BigDecimal remaining = money(m.getOutstandingBalance()).subtract(amount).max(BigDecimal.ZERO);
        m.setOutstandingBalance(remaining);
        if (remaining.signum() == 0) m.setPaymentStatus("paid");
        memberRepository.save(m);
    }

    // ── History & report ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public WriteOffPage history(String search, LocalDate from, LocalDate to, String reason, String writtenBy,
                                String sort, String dir, int page, int size) {
        List<MemberDueWriteOff> all = writeOffsIn(from, to);
        List<String> staff = all.stream().map(MemberDueWriteOff::getWrittenOffBy)
                .filter(Objects::nonNull).distinct().sorted(String.CASE_INSENSITIVE_ORDER).toList();

        String needle = StringUtils.hasText(search) ? search.trim().toLowerCase(Locale.ROOT) : null;
        Comparator<MemberDueWriteOff> c = "amount".equals(sort)
                ? Comparator.comparing(MemberDueWriteOff::getWrittenOffAmount)
                : Comparator.comparing(MemberDueWriteOff::getWrittenOffAt);
        if (!"asc".equalsIgnoreCase(dir)) c = c.reversed();

        List<MemberDueWriteOff> shown = all.stream()
                .filter(w -> !StringUtils.hasText(reason) || reason.equalsIgnoreCase(w.getReason()))
                .filter(w -> !StringUtils.hasText(writtenBy) || writtenBy.equals(w.getWrittenOffBy()))
                .filter(w -> needle == null || matches(needle, w.getMemberName(), w.getMemberCode(), w.getMemberPhone(),
                        w.getReceiptNo(), w.getInvoiceNo(), w.getBillDescription()))
                .sorted(c.thenComparing(MemberDueWriteOff::getId, Comparator.reverseOrder()))
                .toList();

        int limit = Math.max(1, Math.min(size, 500));
        int pageNo = Math.max(1, page);
        int fromIdx = Math.min((pageNo - 1) * limit, shown.size());
        int toIdx = Math.min(fromIdx + limit, shown.size());
        PaginationDTO pagination = new PaginationDTO(pageNo, limit, shown.size(),
                (int) Math.ceil(shown.size() / (double) limit));
        return new WriteOffPage(shown.subList(fromIdx, toIdx).stream().map(WriteOff::of).toList(),
                pagination, sum(shown, MemberDueWriteOff::getWrittenOffAmount), staff);
    }

    @Transactional(readOnly = true)
    public Report report(LocalDate from, LocalDate to) {
        List<MemberDueWriteOff> all = writeOffsIn(from, to);
        DateTimeFormatter monthFmt = DateTimeFormatter.ofPattern("MMM yyyy");
        ZoneId zone = clock.zone(null);
        List<Group> byMonth = group(all, w -> YearMonth.from(toLocal(w.getWrittenOffAt(), zone)).toString(),
                k -> YearMonth.parse(k).format(monthFmt));
        byMonth.sort(Comparator.comparing(Group::key));
        return new Report(from, to, sum(all, MemberDueWriteOff::getWrittenOffAmount), all.size(),
                byAmount(group(all, MemberDueWriteOff::getReason, PendingPaymentService::reasonLabel)),
                byAmount(group(all, w -> Objects.toString(w.getWrittenOffBy(), "—"), k -> k)),
                byMonth,
                byAmount(group(all, w -> Objects.toString(w.getMemberCode(), "") + "|" + Objects.toString(w.getMemberName(), ""),
                        k -> {
                            String[] p = k.split("\\|", 2);
                            String name = p.length > 1 ? p[1] : "";
                            return p[0].isEmpty() ? name : name + " (" + p[0] + ")";
                        })));
    }

    private static List<Group> group(List<MemberDueWriteOff> rows, Function<MemberDueWriteOff, String> key,
                                     Function<String, String> label) {
        Map<String, List<MemberDueWriteOff>> grouped = rows.stream()
                .collect(Collectors.groupingBy(w -> Objects.toString(key.apply(w), ""), LinkedHashMap::new, Collectors.toList()));
        List<Group> out = new ArrayList<>();
        grouped.forEach((k, list) -> out.add(new Group(k, label.apply(k), list.size(),
                sum(list, MemberDueWriteOff::getWrittenOffAmount))));
        return out;
    }

    private static List<Group> byAmount(List<Group> groups) {
        groups.sort(Comparator.comparing(Group::amount).reversed());
        return groups;
    }

    /**
     * Write-offs in [from, to], both local days in the gym's zone. written_off_at is stored as
     * UTC (the JVM runs in UTC), so the local days become a UTC window — otherwise a write-off
     * made between local midnight and the UTC offset lands on the previous day.
     */
    private List<MemberDueWriteOff> writeOffsIn(LocalDate from, LocalDate to) {
        LocalDateTime start = from != null ? clock.toUtc(from.atStartOfDay(), null) : LocalDateTime.of(1900, 1, 1, 0, 0);
        LocalDateTime end = to != null ? clock.toUtc(to.plusDays(1).atStartOfDay(), null) : LocalDateTime.of(3000, 1, 1, 0, 0);
        return writeOffRepository.findInPeriod(start, end);
    }

    /** A stored UTC timestamp as the gym's local wall-clock time. */
    private static LocalDateTime toLocal(LocalDateTime utc, ZoneId zone) {
        return utc.atOffset(ZoneOffset.UTC).atZoneSameInstant(zone).toLocalDateTime();
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    static BigDecimal paidToDate(Receipt r) {
        if (r.getTotalPaidToDate() != null) return r.getTotalPaidToDate();
        return money(r.getPaidAmount());
    }

    /** Still owed on a bill: billed amount less everything paid toward it. */
    static BigDecimal owed(Receipt r) {
        return money(r.getAmount()).subtract(paidToDate(r)).max(BigDecimal.ZERO);
    }

    private static String describe(Receipt r) {
        String type = r.getTransactionType();
        String label = type == null ? "Bill"
                : switch (type) {
                    case "New" -> "Membership";
                    default -> type;
                };
        return StringUtils.hasText(r.getPlanName()) ? label + " · " + r.getPlanName() : label;
    }

    private String currentStaffName() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return "System";
        if (auth.getPrincipal() instanceof UserDetailsImpl user && user.getId() != null) {
            Optional<String> name = staffRepository.findNameByUserId(user.getId()).stream()
                    .filter(StringUtils::hasText).findFirst();
            if (name.isPresent()) return name.get();
        }
        return auth.getName();
    }

    private static String likePattern(String search) {
        if (!StringUtils.hasText(search)) return "%";
        String escaped = search.trim().toLowerCase(Locale.ROOT).replace("\\", "").replace("%", "").replace("_", "");
        return "%" + escaped + "%";
    }

    private static boolean matches(String needle, String... values) {
        for (String v : values) if (v != null && v.toLowerCase(Locale.ROOT).contains(needle)) return true;
        return false;
    }

    private static <T> BigDecimal sum(List<T> rows, Function<T, BigDecimal> f) {
        return rows.stream().map(f).map(PendingPaymentService::money).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal money(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private static String truncate(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }
}
