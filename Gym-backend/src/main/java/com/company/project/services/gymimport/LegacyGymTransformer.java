package com.company.project.services.gymimport;

import com.company.project.services.gymimport.LegacyDump.Row;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Turns an export of the previous (PHP/MariaDB) GymBios into the rows a fresh
 * GymBios tenant needs: plans, members, receipts (bills, instalments, add-ons, day
 * passes), refunds as credit notes, add-on purchases, freezes, attendance and member
 * notes — plus a reconciliation report against the old system.
 *
 * Rules worth knowing (each was found in real data):
 * - created_at columns are UTC (the export runs with time_zone +00:00) while
 *   check-in `datetime` columns are gym wall clock; GymBios stores UTC.
 * - A credit bill stores the full price; only "Credit-Received:X" was collected, and
 *   later "Partial payment" rows (final_amount often 0 — use amount) settle it.
 * - A refund is the original row flagged refunded plus a separate negative row →
 *   the bill becomes Cancelled and the refund a credit note.
 * - Split legs can exceed the bill by the change handed back; that comes off cash.
 * - The old system never auto-unfroze: freezes past their end are settled the way
 *   GymBios's auto-unfreeze would, adding the frozen days to the membership.
 * - "expired" is not a stored status in GymBios; it follows from the end date.
 *
 * Every row is stamped created_by = "legacy-import" (LegacyImportLedgerService keys
 * on it). Ids are explicit, so the target tables must be empty.
 */
public final class LegacyGymTransformer {

    public static final String MARK = "legacy-import";

    /** The old tables this reads; everything else in the export is ignored. */
    public static final Set<String> TABLES = Set.of("members", "membership_plans", "payments", "partial_payments",
            "member_addons", "member_freeze_log", "member_checkins", "daily_visitors", "users",
            "member_status_logs", "settings");

    public record Options(LocalDate today, int utcOffsetMinutes, long branchId, String photoPrefix,
                          Set<String> availablePhotos) {}

    /** Rows for one target table, in insert order. */
    public record TableRows(String table, List<String> columns, List<Object[]> rows) {}

    public record PhotoCopy(String sourceFile, String targetFile) {}

    public record Plan(List<TableRows> tables, Map<String, Integer> invoiceSequences,
                       Map<String, Integer> creditNoteSequences, List<PhotoCopy> photos,
                       Set<String> referencedPhotos, Map<String, Object> gym, Map<String, Object> report) {}

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);
    private static final Map<String, String> METHOD = Map.of("card", "Card", "cash", "Cash",
            "bank_transfer", "Bank Transfer", "online", "Online", "cheque", "Cheque", "multi_pay", "Mixed");
    private static final Pattern SPLIT = Pattern.compile("Split-Cash:([\\d.]+),Card:([\\d.]+)");
    private static final Pattern VIA = Pattern.compile("ReceivedVia:(\\w+)");
    private static final Pattern CREDIT = Pattern.compile("Credit-Received:([\\d.]+)");
    private static final Pattern FAMILY = Pattern.compile("(?:family|member) of (\\d)");

    private final LegacyDump d;
    private final Options o;
    private final LocalDate today;
    private final Map<String, List<String>> review = new LinkedHashMap<>();

    private LegacyGymTransformer(LegacyDump dump, Options options) {
        this.d = dump;
        this.o = options;
        this.today = options.today();
    }

    public static Plan transform(LegacyDump dump, Options options) {
        return new LegacyGymTransformer(dump, options).run();
    }

    // ── Working model ────────────────────────────────────────────────────────

    private static final class PlanDef {
        int id; String name; String planType; int size; int days; BigDecimal price; String description;
    }

    private static final class Mem {
        long id; Row old; String memberNo; String name; String phone; String gender; LocalDate dob;
        String nationality; String address; String emergency; String plan; LocalDate start; LocalDate end;
        String oldStatus; LocalDate freezeStart; LocalDate freezeEnd; String freezeReason; LocalDate joinDate;
        LocalDateTime createdAt; LocalDateTime updatedAt; String photoUrl;
        final List<String> notes = new ArrayList<>(); int visits;
        List<Rcpt> bills = new ArrayList<>();
        String status; LocalDate finalEnd; BigDecimal outstanding = ZERO; String paymentStatus;
        LocalDateTime nextPayment; BigDecimal fee; BigDecimal discount; LocalDateTime lastPayment; String lastMethod;
    }

    private static final class Leg {
        final String method; BigDecimal amount;
        Leg(String method, BigDecimal amount) { this.method = method; this.amount = amount; }
    }

    private static final class Rcpt {
        long id; Mem member; String walkInName; String walkInPhone; LocalDateTime txnAt; String type; String renewalKind;
        BigDecimal amount = ZERO; BigDecimal paid = ZERO; BigDecimal paidToDate; BigDecimal due = ZERO;
        BigDecimal discount = ZERO; String discountLabel; String method; List<Leg> breakdown; String status;
        String planName; LocalDateTime validFrom; LocalDateTime validTill; LocalDate from; LocalDate till;
        LocalDateTime dueDate; String processedBy; String remarks; boolean invoice; String membershipType;
        Rcpt linkedBill; Row oldPp; Long oldId; LocalDate prevCursor; String prevPlan;
        boolean refunded; BigDecimal writtenOff = ZERO; String receiptNo; String invoiceNo; BigDecimal balanceAfter = ZERO;
    }

    private static final class CreditNote {
        long id; Mem member; LocalDate date; LocalDateTime at; BigDecimal amount; String method; Rcpt bill;
        String reason; String voucherNo;
    }

    private static final class Addon {
        long id; Mem member; Row old; Rcpt receipt; BigDecimal amount; String method; List<Leg> breakdown;
        LocalDateTime at; String txnId;
    }

    private static final class Freeze {
        long id; Mem member; LocalDate start; LocalDate plannedEnd; LocalDate endedAt; String reason; String by;
        LocalDateTime createdAt; int requested; int used;
    }

    private static final class Visit {
        long id; String type; Mem member; LocalDateTime checkIn; LocalDateTime checkOut; Integer totalMinutes;
        String method; String walkInName; String walkInPhone; String activity; BigDecimal amount; String payMethod;
        String notes;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void warn(String section, String text) {
        review.computeIfAbsent(section, k -> new ArrayList<>()).add(text);
    }

    private static BigDecimal money(BigDecimal v) {
        return (v == null ? BigDecimal.ZERO : v).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal money(String v) {
        try {
            return money(v == null ? null : new BigDecimal(v));
        } catch (NumberFormatException e) {
            return ZERO;
        }
    }

    private static boolean positive(BigDecimal v) {
        return v != null && v.signum() > 0;
    }

    private static String plain(BigDecimal v) {
        return money(v).stripTrailingZeros().toPlainString();
    }

    private static LocalDateTime ts(String s) {
        if (s == null || s.isBlank() || s.startsWith("0000")) return null;
        try {
            return LocalDateTime.parse(s.trim().replace(' ', 'T'));
        } catch (Exception e) {
            LocalDate dd = date(s);
            return dd == null ? null : dd.atStartOfDay();
        }
    }

    private static LocalDate date(String s) {
        if (s == null || s.isBlank() || s.startsWith("0000")) return null;
        try {
            return LocalDate.parse(s.trim().substring(0, 10));
        } catch (Exception e) {
            return null;
        }
    }

    private LocalDate localDateOfUtc(LocalDateTime utc) {
        return utc == null ? null : utc.plusMinutes(o.utcOffsetMinutes()).toLocalDate();
    }

    private LocalDateTime localToUtc(String wallClock) {
        LocalDateTime t = ts(wallClock);
        return t == null ? null : t.minusMinutes(o.utcOffsetMinutes());
    }

    private static LocalDateTime midnight(LocalDate d) {
        return d == null ? null : d.atStartOfDay();
    }

    private static int daysBetween(LocalDate a, LocalDate b) {
        return (int) ChronoUnit.DAYS.between(a, b);
    }

    private static <T extends Comparable<T>> int cmp(T a, T b) {
        if (a == null) return b == null ? 0 : -1;
        if (b == null) return 1;
        return a.compareTo(b);
    }

    private record Phone(String value, boolean odd) {}

    private static Phone normalizePhone(String raw) {
        if (raw == null) return null;
        String p = raw.replaceAll("[\\s\\-()]", "");
        if (p.isEmpty()) return null;
        if (p.startsWith("00971")) p = "+971" + p.substring(5);
        if (p.startsWith("+9710")) p = "+971" + p.substring(5);
        if (p.startsWith("971") && p.length() == 12) p = "+" + p;
        if (p.matches("0\\d{9}")) p = "+971" + p.substring(1);
        if (!p.matches("\\+971\\d{9}")) return new Phone(raw.trim(), true);
        return new Phone(p, false);
    }

    private static String method(String oldMethod) {
        return oldMethod == null ? "Cash" : METHOD.getOrDefault(oldMethod.toLowerCase(Locale.ROOT), "Cash");
    }

    private record Money(String method, List<Leg> breakdown) {}

    private static Money parseMoney(Row p) {
        String desc = Objects.requireNonNullElse(p.str("description"), "");
        Matcher split = SPLIT.matcher(desc);
        if (split.find()) {
            List<Leg> legs = new ArrayList<>();
            legs.add(new Leg("Cash", money(split.group(1))));
            legs.add(new Leg("Card", money(split.group(2))));
            return new Money("Mixed", legs);
        }
        Matcher via = VIA.matcher(desc);
        if (via.find()) return new Money(method(via.group(1)), null);
        if (p.text("payment_method") != null) return new Money(method(p.text("payment_method")), null);
        if (desc.matches("(?s).*-Card\\b.*")) return new Money("Card", null);
        if (desc.toLowerCase(Locale.ROOT).contains("bank transfer")) return new Money("Bank Transfer", null);
        return new Money("Cash", null);   // same default ReceiptService.normalizePaymentMethod uses
    }

    /** Split legs as typed can exceed the charge (change handed back): take it off cash. */
    private List<Leg> balanceLegs(List<Leg> legs, BigDecimal total, String who) {
        if (legs == null) return null;
        BigDecimal diff = money(legs.stream().map(l -> l.amount).reduce(BigDecimal.ZERO, BigDecimal::add).subtract(total));
        if (diff.signum() == 0) return legs;
        Leg cash = legs.stream().filter(l -> "Cash".equals(l.method)).findFirst().orElse(legs.get(0));
        cash.amount = money(cash.amount.subtract(diff));
        warn("Split payments whose parts did not add up (difference taken off the cash part)",
                who + ": parts off by " + plain(diff) + ", cash part now " + plain(cash.amount));
        return legs.stream().filter(l -> l.amount.signum() > 0).collect(Collectors.toList());
    }

    private static String json(List<Leg> legs) {
        if (legs == null || legs.isEmpty()) return null;
        return legs.stream()
                .map(l -> "{\"method\":\"" + l.method + "\",\"amount\":" + l.amount.stripTrailingZeros().toPlainString() + "}")
                .collect(Collectors.joining(",", "[", "]"));
    }

    private static String basename(String file) {
        String f = file.replace('\\', '/');
        return f.substring(f.lastIndexOf('/') + 1);
    }

    // ── Transform ────────────────────────────────────────────────────────────

    private Plan run() {
        Map<Long, String> users = new HashMap<>();
        for (Row u : d.rows("users")) users.put(u.lng("id"), u.str("username"));
        java.util.function.Function<Long, String> staffName = id -> id == null ? null : users.get(id);

        // Plans: the active catalogue. Names are what members and payment descriptions use.
        Map<String, Integer> planDays = new HashMap<>();
        Map<String, BigDecimal> planPrice = new HashMap<>();
        List<String> planNamesLongestFirst = new ArrayList<>();
        List<PlanDef> plans = new ArrayList<>();
        for (Row p : d.rows("membership_plans")) {
            String name = Objects.requireNonNullElse(p.str("name"), "");
            BigDecimal dv = p.num("duration_value");
            int days = dv == null || dv.intValue() <= 0 ? 1 : dv.intValue();
            planDays.put(name.toLowerCase(Locale.ROOT), days);
            planPrice.put(name.toLowerCase(Locale.ROOT), money(p.num("price")));
            if (!planNamesLongestFirst.contains(name)) planNamesLongestFirst.add(name);
            if (!"active".equalsIgnoreCase(p.str("status"))) continue;
            PlanDef def = new PlanDef();
            def.id = plans.size() + 1;
            def.name = name;
            String n = name.toLowerCase(Locale.ROOT);
            Matcher fam = FAMILY.matcher(n);
            if (n.contains("couple")) { def.planType = "Couple"; def.size = 2; }
            else if (fam.find()) { def.planType = "Family"; def.size = Integer.parseInt(fam.group(1)); }
            else if (n.matches("1 day|daily")) { def.planType = "Walk-In"; def.size = 1; }
            else { def.planType = "Individual"; def.size = 1; }
            def.days = days;
            def.price = money(p.num("price"));
            def.description = p.text("description");
            plans.add(def);
        }
        planNamesLongestFirst.sort(Comparator.comparingInt(String::length).reversed());
        Set<String> activePlans = plans.stream().map(p -> p.name.toLowerCase(Locale.ROOT)).collect(Collectors.toSet());

        // ── Members
        List<Row> oldMembers = new ArrayList<>(d.rows("members"));
        oldMembers.sort(Comparator.comparing(r -> Objects.requireNonNullElse(r.lng("id"), 0L)));
        Map<Long, Mem> members = new LinkedHashMap<>();
        Set<String> referencedPhotos = new LinkedHashSet<>();
        List<PhotoCopy> photoCopies = new ArrayList<>();
        long nextId = 1;
        for (Row m : oldMembers) {
            Mem x = new Mem();
            x.id = nextId++;
            x.old = m;
            x.memberNo = Objects.requireNonNullElse(m.str("member_id"), "M" + x.id);
            x.name = (Objects.requireNonNullElse(m.str("first_name"), "") + " "
                    + Objects.requireNonNullElse(m.str("last_name"), "")).replaceAll("\\s+", " ").trim();
            if (x.name.isEmpty()) x.name = x.memberNo;
            Phone phone = normalizePhone(m.str("phone"));
            if (phone != null && phone.odd()) {
                warn("Phone numbers kept as typed (not a valid UAE mobile)", x.memberNo + " " + x.name + ": \"" + phone.value() + "\"");
            }
            x.phone = phone == null ? null : phone.value();
            LocalDate dob = date(m.str("date_of_birth"));
            x.dob = dob != null && dob.isBefore(LocalDate.of(2025, 1, 1)) ? dob : null;   // placeholder/typo dates
            String gender = m.str("gender");
            x.gender = "male".equals(gender) || "female".equals(gender) ? gender : null;
            x.nationality = m.text("nationality");
            String address = m.text("address");
            x.address = address != null && address.matches("(?is).*[a-z]{2,}.*") ? address : null;
            x.emergency = m.text("emergency_contact");
            x.plan = Objects.requireNonNullElse(m.str("membership_type"), "");
            x.start = date(m.str("membership_start"));
            x.end = date(m.str("membership_end"));
            x.oldStatus = Objects.requireNonNullElse(m.str("status"), "active");
            x.freezeStart = date(m.str("freeze_start"));
            x.freezeEnd = date(m.str("freeze_end"));
            x.freezeReason = m.text("freeze_reason");
            x.createdAt = ts(m.str("created_at"));
            x.updatedAt = ts(m.str("updated_at"));
            LocalDate joined = date(m.str("joining_date"));
            x.joinDate = joined != null ? joined : localDateOfUtc(x.createdAt);
            String photo = m.text("photo");
            if (photo != null) {
                String file = basename(photo);
                referencedPhotos.add(file);
                if (o.availablePhotos() != null) {
                    String ext = file.contains(".") ? file.substring(file.lastIndexOf('.')).toLowerCase(Locale.ROOT) : ".jpg";
                    if (!o.availablePhotos().contains(file)) {
                        warn("Photos missing from the uploaded folder", x.memberNo + " " + x.name + ": " + file);
                    } else if (ext.equals(".heic") || ext.equals(".heif")) {
                        // iPhone format: browsers (outside Safari) can't show it.
                        warn("Photos in a format browsers can't show (ask for a JPG)", x.memberNo + " " + x.name + ": " + file);
                    } else {
                        if (ext.equals(".jpeg") || ext.equals(".jfif") || ext.equals(".jpe")) ext = ".jpg";
                        String target = o.photoPrefix() + "-" + x.memberNo.replaceAll("[^A-Za-z0-9_-]", "") + ext;
                        photoCopies.add(new PhotoCopy(file, target));
                        x.photoUrl = "/uploads/photos/" + target;
                    }
                }
            }
            if (!activePlans.contains(x.plan.toLowerCase(Locale.ROOT))) {
                warn("Members on a plan that is no longer active", x.memberNo + " " + x.name + ": " + x.plan);
            }
            members.put(m.lng("id"), x);
        }

        // ── Payments → receipts, settlements, refunds
        Map<Long, Row> pp = new HashMap<>();
        for (Row r : d.rows("partial_payments")) pp.put(r.lng("payment_id"), r);
        Map<Long, List<Row>> byMember = new LinkedHashMap<>();
        for (Row p : d.rows("payments")) byMember.computeIfAbsent(p.lng("member_id"), k -> new ArrayList<>()).add(p);
        Map<Long, List<Row>> freezeLogByMember = new HashMap<>();
        for (Row f : d.rows("member_freeze_log")) freezeLogByMember.computeIfAbsent(f.lng("member_id"), k -> new ArrayList<>()).add(f);
        Comparator<Row> byCreated = Comparator.comparing((Row r) -> Objects.requireNonNullElse(r.str("created_at"), ""));

        List<Rcpt> receipts = new ArrayList<>();
        List<CreditNote> creditNotes = new ArrayList<>();
        List<Addon> addons = new ArrayList<>();
        List<Freeze> freezes = new ArrayList<>();
        List<Visit> attendance = new ArrayList<>();
        Map<Long, Row> addonByPayment = new HashMap<>();
        List<Row> oldAddons = d.rows("member_addons");

        // Old add-on rows ↔ their payment row (same member, same second).
        for (Row a : oldAddons) {
            Row pay = byMember.getOrDefault(a.lng("member_id"), List.of()).stream()
                    .filter(p -> Objects.equals(p.str("created_at"), a.str("created_at")))
                    .filter(p -> { String desc = Objects.requireNonNullElse(p.str("description"), "");
                        return desc.startsWith("Addon:") || desc.startsWith("Free Extension"); })
                    .findFirst().orElse(null);
            if (pay == null) warn("Add-ons without a matching payment", "old add-on #" + a.str("id") + " (member " + a.str("member_id") + ")");
            else addonByPayment.put(pay.lng("id"), a);
        }

        for (Map.Entry<Long, List<Row>> entry : byMember.entrySet()) {
            Mem m = members.get(entry.getKey());
            List<Row> pays = new ArrayList<>(entry.getValue());
            if (m == null) {
                warn("Payments for unknown members", "member " + entry.getKey() + ": " + pays.size() + " payments");
                continue;
            }
            pays.sort(byCreated.thenComparing(r -> Objects.requireNonNullElse(r.lng("id"), 0L)));

            LocalDate[] cursorEnd = { null };   // end of the membership as of the payment being replayed
            String prevPlan = null;
            int billCount = 0;
            List<Rcpt> memberBills = new ArrayList<>();
            List<Row> logs = new ArrayList<>(freezeLogByMember.getOrDefault(entry.getKey(), List.of()));
            logs.sort(byCreated);
            int[] logIdx = { 0 };
            java.util.function.Consumer<String> applyLogsUpTo = upTo -> {
                while (logIdx[0] < logs.size()
                        && Objects.requireNonNullElse(logs.get(logIdx[0]).str("created_at"), "").compareTo(upTo) <= 0) {
                    Row f = logs.get(logIdx[0]++);
                    LocalDate newEnd = date(f.str("new_membership_end"));
                    if (newEnd != null && "unfreeze".equals(f.str("action"))) cursorEnd[0] = newEnd;
                }
            };

            for (Row p : pays) {
                String desc = Objects.requireNonNullElse(p.str("description"), "");
                String atText = Objects.requireNonNullElse(p.str("created_at"), "");
                LocalDateTime at = ts(atText);
                LocalDate day = localDateOfUtc(at);
                String processedBy = staffName.apply(p.lng("created_by"));
                String notes = p.text("notes");
                String remarks = "Imported from previous system (payment #" + p.str("id") + "): " + desc
                        + (notes == null ? "" : " | " + notes);
                applyLogsUpTo.accept(atText);

                if (money(p.num("final_amount")).signum() < 0) {                       // refund
                    Rcpt bill = null;
                    for (int k = memberBills.size() - 1; k >= 0; k--) {
                        if (cmp(memberBills.get(k).txnAt, at) <= 0) { bill = memberBills.get(k); break; }
                    }
                    if (bill != null && !bill.refunded) {
                        bill.refunded = true;
                        // Cancelling the plan takes back the days it added.
                        if (Objects.equals(cursorEnd[0], bill.till)) { cursorEnd[0] = bill.prevCursor; prevPlan = bill.prevPlan; }
                    }
                    CreditNote cn = new CreditNote();
                    cn.member = m; cn.date = day; cn.at = at; cn.amount = money(p.num("final_amount")).negate();
                    cn.method = method(p.text("payment_method")); cn.bill = bill;
                    cn.reason = "Refund for cancelled membership" + (notes == null ? "" : " — " + notes)
                            + " (old payment #" + p.str("id") + ")";
                    creditNotes.add(cn);
                    continue;
                }

                if (addonByPayment.containsKey(p.lng("id"))) {
                    Row a = addonByPayment.get(p.lng("id"));
                    if (desc.startsWith("Free Extension")) {
                        m.notes.add(day + ": " + desc);
                        continue;
                    }
                    Money mon = parseMoney(p);
                    BigDecimal amount = money(p.num("final_amount"));
                    if (amount.compareTo(money(a.num("price"))) != 0) {
                        warn("Add-on price differs from its payment", m.memberNo + ": add-on " + plain(a.num("price"))
                                + " vs paid " + plain(amount) + " — used the payment");
                    }
                    Rcpt r = new Rcpt();
                    r.member = m; r.txnAt = at; r.type = "Add-on"; r.amount = amount; r.paid = amount;
                    r.discount = money(p.num("discount_amount")); r.method = mon.method(); r.breakdown = mon.breakdown();
                    r.status = "Paid"; r.planName = a.str("addon_name");
                    r.validFrom = midnight(date(a.str("start_date"))); r.validTill = midnight(date(a.str("end_date")));
                    r.processedBy = processedBy; r.remarks = remarks; r.invoice = true; r.membershipType = "Individual";
                    receipts.add(r);
                    Addon ad = new Addon();
                    ad.member = m; ad.old = a; ad.receipt = r; ad.amount = amount; ad.method = mon.method();
                    ad.breakdown = mon.breakdown(); ad.at = at;
                    addons.add(ad);
                    continue;
                }

                if (desc.startsWith("Partial payment")) {                              // settlement of a credit bill
                    BigDecimal cash = money(p.num("amount"));
                    Rcpt bill = memberBills.stream().filter(b -> b.due.signum() > 0 && !b.refunded).findFirst().orElse(null);
                    if (bill == null) {
                        warn("Instalments with no open bill to settle", m.memberNo + " " + m.name + ": " + plain(cash)
                                + " on " + day + " (old payment #" + p.str("id") + ")");
                    } else {
                        bill.due = money(bill.due.subtract(cash));
                    }
                    Rcpt r = new Rcpt();
                    r.member = m; r.txnAt = at; r.type = "Payment"; r.amount = cash; r.paid = cash;
                    r.method = parseMoney(p).method(); r.status = "Paid";
                    r.planName = bill != null ? bill.planName : m.plan; r.linkedBill = bill;
                    r.validFrom = bill != null ? bill.validFrom : null; r.validTill = bill != null ? bill.validTill : null;
                    r.processedBy = processedBy; r.remarks = remarks; r.invoice = false; r.membershipType = "Individual";
                    receipts.add(r);
                    if (bill != null) bill.paidToDate = money(bill.paidToDate.add(cash));
                    continue;
                }

                // A membership bill: New / Renewal / Upgrade.
                String body = desc.replaceFirst("^(Membership |Renewal-|Upgrade-)", "").toLowerCase(Locale.ROOT);
                String planName = planNamesLongestFirst.stream()
                        .filter(n -> body.startsWith(n.toLowerCase(Locale.ROOT))).findFirst().orElse(m.plan);
                if (!planDays.containsKey(planName.toLowerCase(Locale.ROOT))) {
                    warn("Payments whose plan could not be read", m.memberNo + ": \"" + desc + "\" → " + planName);
                }
                int days = planDays.getOrDefault(planName.toLowerCase(Locale.ROOT), 30);
                boolean upgrade = desc.startsWith("Upgrade-");
                LocalDate from = upgrade || cursorEnd[0] == null || cursorEnd[0].isBefore(day) ? day : cursorEnd[0];
                LocalDate till = from.plusDays(days);
                BigDecimal amount = money(p.num("final_amount"));
                Matcher credit = CREDIT.matcher(desc);
                boolean isCredit = credit.find();
                BigDecimal paid = isCredit ? money(credit.group(1)) : amount;
                Money mon = parseMoney(p);
                List<Leg> legs = balanceLegs(mon.breakdown(), paid, m.memberNo + " " + m.name + " (old payment #" + p.str("id") + ")");
                billCount++;
                String type = billCount == 1 && desc.startsWith("Membership ") ? "New" : "Renewal";
                String kind = null;
                if ("Renewal".equals(type)) {
                    BigDecimal prev = prevPlan == null ? null : planPrice.get(prevPlan.toLowerCase(Locale.ROOT));
                    BigDecimal cur = planPrice.get(planName.toLowerCase(Locale.ROOT));
                    boolean up = upgrade || (prev != null && cur != null && cur.compareTo(prev) > 0);
                    boolean down = prev != null && cur != null && cur.compareTo(prev) < 0;
                    kind = up ? "Upgrade" : down ? "Downgrade" : "Renewal";
                }
                BigDecimal disc = money(p.num("discount_amount"));
                Rcpt b = new Rcpt();
                b.member = m; b.txnAt = at; b.type = type; b.renewalKind = kind; b.amount = amount; b.paid = paid;
                b.paidToDate = paid; b.due = money(amount.subtract(paid)); b.discount = disc;
                b.discountLabel = disc.signum() > 0
                        ? ("percentage".equals(p.str("discount_type")) ? "Discount " + plain(p.num("discount_value")) + "%" : "Discount")
                        : null;
                b.method = isCredit && paid.signum() == 0 ? "Credit" : mon.method();
                b.breakdown = legs; b.planName = planName; b.from = from; b.till = till;
                b.validFrom = midnight(from); b.validTill = midnight(till);
                b.processedBy = processedBy; b.remarks = remarks; b.invoice = true; b.membershipType = "Individual";
                b.oldPp = pp.get(p.lng("id")); b.oldId = p.lng("id"); b.prevCursor = cursorEnd[0]; b.prevPlan = prevPlan;
                if ("refunded".equals(p.str("status"))) b.refunded = true;
                memberBills.add(b);
                receipts.add(b);
                if (!b.refunded) { cursorEnd[0] = till; prevPlan = planName; }
            }
            applyLogsUpTo.accept("9999");

            // Cancelled bills: whatever was still owed is written off with the cancellation.
            for (Rcpt b : memberBills) {
                if (b.refunded) { b.status = "Cancelled"; b.writtenOff = b.due; b.due = ZERO; }
            }
            // The member's own end date is the truth (it includes every freeze and free
            // extension); stretch the latest live bill to it.
            Rcpt last = null;
            for (Rcpt b : memberBills) if (!b.refunded && b.planName != null) last = b;
            if (last != null && m.end != null) {
                last.validTill = midnight(m.end);
                if (last.from.isAfter(m.end)) last.validFrom = midnight(m.end.minusDays(daysBetween(last.from, last.till)));
            }
            m.bills = memberBills;
        }

        // Bill status + outstanding, and a cross-check against the old dues table.
        for (Rcpt r : receipts) {
            if ("Payment".equals(r.type) || "Add-on".equals(r.type) || "Cancelled".equals(r.status)) continue;
            r.status = r.due.signum() <= 0 ? "Paid" : r.paidToDate.signum() > 0 ? "Partial" : "Pending";
            if (r.oldPp != null && money(r.oldPp.num("amount_due")).compareTo(r.due) != 0) {
                warn("Dues that differ from the old dues table", r.member.memberNo + " " + r.member.name + ": old shows "
                        + plain(r.oldPp.num("amount_due")) + " still due on payment #" + r.oldId
                        + ", replaying the payments gives " + plain(r.due));
            }
            if (r.due.signum() > 0) {
                LocalDate oldDue = r.oldPp == null ? null : date(r.oldPp.str("due_date"));
                r.dueDate = oldDue != null ? midnight(oldDue) : r.validTill;
            }
        }
        Set<Rcpt> cancelledWithRefund = new LinkedHashSet<>();
        for (CreditNote c : creditNotes) if (c.bill != null) cancelledWithRefund.add(c.bill);
        for (Rcpt b : cancelledWithRefund) {
            if (b.writtenOff.signum() > 0) {
                warn("Cancelled bills with an unpaid balance (written off)", b.member.memberNo + " " + b.member.name + ": "
                        + plain(b.writtenOff) + " on " + b.planName + " (old payment #" + b.oldId + ")");
            }
        }
        Map<Mem, BigDecimal> refundedByMember = new LinkedHashMap<>();
        for (CreditNote c : creditNotes) refundedByMember.merge(c.member, c.amount, BigDecimal::add);
        for (Map.Entry<Mem, BigDecimal> e : refundedByMember.entrySet()) {
            BigDecimal paidOnCancelled = receipts.stream()
                    .filter(r -> r.member == e.getKey() && "Cancelled".equals(r.status))
                    .map(r -> r.paid).reduce(BigDecimal.ZERO, BigDecimal::add);
            if (paidOnCancelled.compareTo(e.getValue()) < 0) {
                warn("Refunds larger than what was paid on the cancelled bills (check with the gym)",
                        e.getKey().memberNo + " " + e.getKey().name + ": refunded " + plain(e.getValue()) + ", "
                                + plain(paidOnCancelled) + " had been paid on the cancelled bill(s)");
            }
        }

        // ── Day passes
        for (Row v : d.rows("daily_visitors")) {
            Phone phone = normalizePhone(v.str("mobile_number"));
            LocalDateTime checkIn = localToUtc(v.str("checkin_time"));
            String payMethod = method(v.text("payment_method"));
            BigDecimal paid = money(v.num("payment_amount"));
            BigDecimal price = money(v.num("plan_price"));
            Visit a = new Visit();
            a.type = "walk_in"; a.checkIn = checkIn; a.checkOut = localToUtc(v.str("checkout_time")); a.method = "manual";
            a.walkInName = v.str("visitor_name"); a.walkInPhone = phone == null ? null : phone.value();
            a.activity = v.str("daily_plan"); a.amount = paid; a.payMethod = payMethod;
            a.notes = "Imported from previous system (day pass #" + v.str("id") + ")";
            attendance.add(a);
            Rcpt r = new Rcpt();
            r.walkInName = a.walkInName; r.walkInPhone = a.walkInPhone; r.txnAt = checkIn; r.type = "Daily Entry";
            r.amount = paid; r.paid = paid; r.discount = price.compareTo(paid) > 0 ? money(price.subtract(paid)) : ZERO;
            r.discountLabel = price.compareTo(paid) > 0 ? "Discount" : null; r.method = payMethod; r.status = "Paid";
            r.planName = a.activity; r.validFrom = checkIn; r.processedBy = staffName.apply(v.lng("staff_id"));
            r.invoice = true; r.remarks = a.notes; r.membershipType = "Walk-In";
            receipts.add(r);
        }

        // ── Member check-ins
        for (Row c : d.rows("member_checkins")) {
            Mem m = members.get(c.lng("member_id"));
            if (m == null) continue;
            m.visits++;
            Visit a = new Visit();
            a.type = "member"; a.member = m; a.checkIn = localToUtc(c.str("checkin_time"));
            a.checkOut = localToUtc(c.str("checkout_time"));
            a.method = Objects.requireNonNullElse(c.text("checkin_type"), "manual");
            a.totalMinutes = a.checkIn != null && a.checkOut != null
                    ? (int) Math.max(0, Duration.between(a.checkIn, a.checkOut).toMinutes()) : null;
            a.notes = "Imported from previous system — " + Objects.requireNonNullElse(c.text("notes"), "check-in");
            attendance.add(a);
        }

        // ── Freezes and each member's current state
        for (Mem m : members.values()) {
            List<Row> logs = new ArrayList<>(freezeLogByMember.getOrDefault(m.old.lng("id"), List.of()));
            logs.sort(byCreated);
            List<Freeze> recs = new ArrayList<>();
            for (Row f : logs) {
                LocalDate start = date(f.str("freeze_start"));
                LocalDate end = date(f.str("freeze_end"));
                if (start == null) continue;
                if ("freeze".equals(f.str("action"))) {
                    recs.add(freeze(m, start, end, f.text("reason"), staffName.apply(f.lng("created_by")), ts(f.str("created_at"))));
                } else {
                    Freeze open = null;
                    for (int k = recs.size() - 1; k >= 0; k--) {
                        if (recs.get(k).start.equals(start) && recs.get(k).endedAt == null) { open = recs.get(k); break; }
                    }
                    Long applied = f.lng("days_applied");
                    LocalDate ended = applied != null && applied > 0 ? start.plusDays(applied) : localDateOfUtc(ts(f.str("created_at")));
                    if (open == null) {
                        open = freeze(m, start, end, f.text("reason"), staffName.apply(f.lng("created_by")), ts(f.str("created_at")));
                        recs.add(open);
                    }
                    open.endedAt = ended;
                }
            }
            String status = "inactive".equals(m.oldStatus) ? "inactive" : "active";
            LocalDate end = m.end;
            if ("frozen".equals(m.oldStatus) && m.freezeStart != null) {
                Freeze cur = null;
                for (int k = recs.size() - 1; k >= 0; k--) {
                    if (recs.get(k).start.equals(m.freezeStart) && recs.get(k).endedAt == null) { cur = recs.get(k); break; }
                }
                if (cur == null) {
                    cur = freeze(m, m.freezeStart, m.freezeEnd, m.freezeReason, null, midnight(m.freezeStart));
                    recs.add(cur);
                }
                if (m.freezeEnd != null && m.freezeEnd.isAfter(today)) {
                    status = "frozen";   // still frozen; GymBios auto-unfreezes it on its planned end
                } else {
                    // Settled the way GymBios's auto-unfreeze would have: unfrozen on the
                    // planned end, with the days spent frozen added to the membership.
                    LocalDate until = m.freezeEnd != null ? m.freezeEnd : today;
                    int frozenDays = Math.max(0, daysBetween(m.freezeStart, until));
                    cur.endedAt = until;
                    end = end == null ? null : end.plusDays(frozenDays);
                    Rcpt lastBill = null;
                    for (Rcpt b : m.bills) if (!b.refunded && !"Payment".equals(b.type)) lastBill = b;
                    if (lastBill != null) lastBill.validTill = midnight(end);
                    warn("Lapsed freezes settled on import (end date extended)", m.memberNo + " " + m.name + ": frozen "
                            + m.freezeStart + " → " + until + ", +" + frozenDays + " days, membership now ends " + end);
                }
            }
            for (Freeze r : recs) {
                if (r.endedAt == null && !("frozen".equals(status) && r.start.equals(m.freezeStart))) {
                    // Freeze logged but its unfreeze wasn't.
                    r.endedAt = r.plannedEnd != null && !r.plannedEnd.isAfter(today) ? r.plannedEnd : today;
                }
                r.requested = r.plannedEnd == null ? 0 : Math.max(0, daysBetween(r.start, r.plannedEnd));
                r.used = r.endedAt == null ? r.requested : Math.max(0, daysBetween(r.start, r.endedAt));
                freezes.add(r);
            }
            m.status = status;
            m.finalEnd = end;
        }

        // Status changes and cancellations from the old system become member notes.
        for (Row s : d.rows("member_status_logs")) {
            Mem m = members.get(s.lng("member_id"));
            if (m == null) continue;
            String text = s.text("notes") != null ? s.text("notes") : s.str("new_status");
            m.notes.add(localDateOfUtc(ts(s.str("created_at"))) + ": " + text
                    + (s.text("reason") == null ? "" : " (reason: " + s.text("reason") + ")"));
        }
        for (Mem m : members.values()) {
            LocalDate cancelled = date(m.old.str("cancellation_date"));
            if (cancelled != null) {
                m.notes.add("Cancellation recorded " + cancelled + " (reason: "
                        + Objects.requireNonNullElse(m.old.text("cancellation_reason"), "n/a") + ")");
            }
        }

        // ── Ids, numbering, balances
        receipts.sort((a, b) -> cmp(a.txnAt, b.txnAt));
        Map<String, Integer> invoiceSeq = new TreeMap<>();
        long rid = 1;
        for (Rcpt r : receipts) {
            r.id = rid++;
            r.receiptNo = String.format("RCPT-%010d", r.id);
            if (r.invoice) {
                String y = String.valueOf((r.txnAt != null ? r.txnAt.toLocalDate() : today).getYear());
                int n = invoiceSeq.merge(y, 1, Integer::sum);
                r.invoiceNo = String.format("INV-%s-%05d", y, n);
            }
        }
        // Running balance per member, as each receipt posted (Receipt.balance_after).
        Map<Rcpt, BigDecimal> openDue = new LinkedHashMap<>();
        for (Rcpt r : receipts) {
            if (r.member == null) continue;
            if ("Payment".equals(r.type) && r.linkedBill != null) {
                openDue.put(r.linkedBill, money(openDue.getOrDefault(r.linkedBill, ZERO).subtract(r.paid)));
            }
            if ("New".equals(r.type) || "Renewal".equals(r.type)) openDue.put(r, money(r.amount.subtract(r.paid)));
            for (CreditNote c : creditNotes) {
                if (c.member == r.member && c.bill != null && cmp(c.at, r.txnAt) <= 0) openDue.put(c.bill, ZERO);
            }
            BigDecimal bal = BigDecimal.ZERO;
            for (Map.Entry<Rcpt, BigDecimal> e : openDue.entrySet()) {
                if (e.getKey().member == r.member && e.getValue().signum() > 0) bal = bal.add(e.getValue());
            }
            r.balanceAfter = money(bal);
        }
        creditNotes.sort((a, b) -> cmp(a.at, b.at));
        Map<String, Integer> cnSeq = new TreeMap<>();
        long cid = 1;
        for (CreditNote c : creditNotes) {
            c.id = cid++;
            String y = String.valueOf((c.date != null ? c.date : today).getYear());
            int n = cnSeq.merge(y, 1, Integer::sum);
            c.voucherNo = String.format("CN-%s-%05d", y, n);
        }
        long aid = 1;
        for (Addon a : addons) { a.id = aid++; a.txnId = String.format("TXN-%010d", a.id); }
        freezes.sort((a, b) -> cmp(a.start, b.start));
        long fid = 1;
        for (Freeze f : freezes) f.id = fid++;
        attendance.sort((a, b) -> cmp(a.checkIn, b.checkIn));
        long vid = 1;
        for (Visit v : attendance) v.id = vid++;

        for (Mem m : members.values()) {
            List<Rcpt> bills = m.bills.stream().filter(b -> "New".equals(b.type) || "Renewal".equals(b.type)).toList();
            List<Rcpt> open = bills.stream().filter(b -> b.due.signum() > 0).toList();
            m.outstanding = money(open.stream().map(b -> b.due).reduce(BigDecimal.ZERO, BigDecimal::add));
            m.paymentStatus = m.outstanding.signum() <= 0 ? "paid"
                    : open.stream().anyMatch(b -> b.paidToDate.signum() > 0) ? "partial" : "pending";
            m.nextPayment = open.stream().map(b -> b.dueDate).filter(Objects::nonNull).min(Comparator.naturalOrder()).orElse(null);
            Rcpt lastBill = null;
            for (Rcpt b : bills) if (!b.refunded) lastBill = b;
            if (lastBill == null && !bills.isEmpty()) lastBill = bills.get(bills.size() - 1);
            m.fee = lastBill == null ? null : lastBill.amount;
            m.discount = lastBill == null ? null : lastBill.discount;
            for (Rcpt r : receipts) {
                if (r.member == m && r.paid.signum() > 0) { m.lastPayment = r.txnAt; m.lastMethod = r.method; }
            }
        }

        List<TableRows> tables = buildTables(plans, members.values(), receipts, creditNotes, addons, freezes, attendance);
        Map<String, Object> gym = suggestedGym();
        Map<String, Object> report = buildReport(plans, members.values(), receipts, creditNotes, addons, freezes,
                attendance, referencedPhotos, photoCopies);
        return new Plan(tables, invoiceSeq, cnSeq, photoCopies, referencedPhotos, gym, report);
    }

    private static Freeze freeze(Mem m, LocalDate start, LocalDate plannedEnd, String reason, String by, LocalDateTime createdAt) {
        Freeze f = new Freeze();
        f.member = m; f.start = start; f.plannedEnd = plannedEnd; f.reason = reason; f.by = by; f.createdAt = createdAt;
        return f;
    }

    // ── Target rows ──────────────────────────────────────────────────────────

    private List<TableRows> buildTables(List<PlanDef> plans, java.util.Collection<Mem> members, List<Rcpt> receipts,
                                        List<CreditNote> creditNotes, List<Addon> addons, List<Freeze> freezes,
                                        List<Visit> attendance) {
        LocalDateTime now = LocalDateTime.now().withNano(0);
        long branch = o.branchId();
        List<TableRows> out = new ArrayList<>();

        List<Object[]> planRows = new ArrayList<>();
        for (PlanDef p : plans) {
            planRows.add(new Object[] { p.name, "Membership", p.planType,
                    com.company.project.entities.MembershipPlan.isGroupPlanType(p.planType) ? "family_head" : "individual", p.size > 1 ? p.size : null, "Daily",
                    String.valueOf(p.days), p.days + " daily", p.price, ZERO, "Active", p.description, "[]", "Unlimited", 0,
                    "Unlimited", 3, "Payment", 30, 2, ZERO, 10, true, true, true, "[]", "[]", "[]", "[]", branch, now, MARK });
        }
        out.add(new TableRows("membership_plans", List.of("name", "type", "plan_type", "family_billing_mode",
                "max_family_members", "duration_type", "duration_value", "duration", "price", "discount", "status",
                "description", "assignable_trainers", "membership_capacity", "max_capacity", "attendance_limit",
                "attendance_value", "attendance_period", "max_freeze_days", "max_freeze_occurrences",
                "charge_per_extra_day", "free_days_allowed", "auto_unfreeze", "auto_calculate_total",
                "allow_additional_members", "training_streams", "selected_facilities", "selected_promotions",
                "selected_campaigns", "branch_id", "created_at", "created_by"), planRows));

        if (!addons.isEmpty()) {
            List<BigDecimal> prices = addons.stream().map(a -> a.amount).sorted().toList();
            out.add(new TableRows("addon_plans", List.of("name", "description", "price", "validity", "category",
                    "is_active", "branch_id", "created_at", "created_by"),
                    List.<Object[]>of(new Object[] { "Personal Training", "Monthly personal training (imported from the previous system)",
                            prices.get(prices.size() / 2), 30, "Personal Training", true, branch, now, MARK })));
        }

        List<Object[]> memberRows = new ArrayList<>();
        List<Object[]> noteRows = new ArrayList<>();
        for (Mem m : members) {
            boolean frozen = "frozen".equals(m.status);
            memberRows.add(new Object[] { m.id, m.memberNo, m.name, m.phone, m.gender, m.dob, m.nationality, m.address,
                    m.emergency, "Individual", m.plan, m.status, midnight(m.joinDate), midnight(m.start),
                    midnight(m.finalEnd), midnight(m.finalEnd), m.fee, m.discount, m.outstanding, m.paymentStatus,
                    m.nextPayment, m.lastPayment, m.lastMethod, frozen ? midnight(m.freezeStart) : null,
                    frozen ? midnight(m.freezeEnd) : null, frozen ? m.freezeReason : null, m.photoUrl, m.visits,
                    false, false, false, ZERO, branch, m.createdAt != null ? m.createdAt : now, m.updatedAt, MARK });
            List<String> lines = new ArrayList<>();
            lines.add("Imported from the previous system — member no. " + m.memberNo + ", joined " + m.joinDate + ".");
            lines.addAll(m.notes);
            noteRows.add(new Object[] { m.id, String.join("\n", lines), m.createdAt != null ? m.createdAt : now, MARK });
        }
        out.add(new TableRows("members", List.of("id", "member_id", "name", "phone", "gender", "date_of_birth",
                "nationality", "address", "emergency_contact", "membership_type", "membership_plan", "membership_status",
                "join_date", "membership_start_date", "membership_end_date", "expiry_date", "membership_fee",
                "discount_applied", "outstanding_balance", "payment_status", "next_payment_date", "last_payment_date",
                "payment_method_used", "freeze_start_date", "freeze_end_date", "freeze_reason", "photo_url",
                "total_visits", "is_family_head", "is_minor", "billed_to_head", "wallet_balance", "branch_id",
                "created_at", "updated_at", "created_by"), memberRows));
        out.add(new TableRows("member_notes", List.of("member_id", "content", "created_at", "created_by"), noteRows));

        List<Object[]> receiptRows = new ArrayList<>();
        for (Rcpt r : receipts) {
            boolean hasDiscount = r.discount != null && r.discount.signum() > 0;
            receiptRows.add(new Object[] { r.id, r.receiptNo, r.invoiceNo, r.txnAt,
                    r.member != null ? r.member.id : null, r.member != null ? r.member.memberNo : null,
                    r.member != null ? r.member.name : r.walkInName, r.member != null ? r.member.phone : r.walkInPhone,
                    r.type, r.renewalKind, r.amount, r.paid,
                    "Payment".equals(r.type) ? null : (r.paidToDate != null ? r.paidToDate : r.paid),
                    r.balanceAfter, r.method, json(r.breakdown), r.status, r.planName, r.validFrom, r.validTill,
                    r.dueDate != null ? r.dueDate : r.validTill, hasDiscount ? r.discount : null,
                    hasDiscount ? r.discountLabel : null, r.membershipType, r.linkedBill != null ? r.linkedBill.id : null,
                    r.processedBy, r.remarks, branch, r.txnAt != null ? r.txnAt : now, MARK });
        }
        out.add(new TableRows("receipts", List.of("id", "receipt_no", "invoice_no", "transaction_date", "member_db_id",
                "member_id", "member_name", "member_phone", "transaction_type", "renewal_kind", "amount", "paid_amount",
                "total_paid_to_date", "balance_after", "payment_method", "payment_breakdown", "status", "plan_name",
                "valid_from", "valid_till", "due_date", "discount_amount", "discount_label", "membership_type",
                "linked_bill_id", "processed_by", "remarks", "branch_id", "created_at", "created_by"), receiptRows));

        List<Object[]> cnRows = new ArrayList<>();
        for (CreditNote c : creditNotes) {
            cnRows.add(new Object[] { c.id, c.voucherNo, c.date != null ? c.date : today, c.member.id, c.member.name,
                    c.bill != null ? c.bill.id : null, c.reason, c.amount, ZERO, c.amount, c.method, "DRAFT", branch,
                    c.at != null ? c.at : now, MARK });
        }
        out.add(new TableRows("credit_notes", List.of("id", "voucher_no", "date", "member_db_id", "member_name",
                "linked_receipt_id", "reason", "subtotal", "tax_amount", "total_amount", "refund_method", "status",
                "branch_id", "created_at", "created_by"), cnRows));

        List<Object[]> addonRows = new ArrayList<>();
        for (Addon a : addons) {
            LocalDate end = date(a.old.str("end_date"));
            addonRows.add(new Object[] { a.id, a.txnId, a.member.id, a.member.memberNo, a.member.name,
                    a.old.str("addon_name"), "Personal Training", a.amount, a.method, json(a.breakdown),
                    midnight(date(a.old.str("start_date"))), midnight(end), a.at,
                    end != null && !end.isBefore(today) ? "Active" : "Expired", "Imported from previous system",
                    a.receipt.id, a.at != null ? a.at : now, MARK });
        }
        out.add(new TableRows("member_addons", List.of("id", "transaction_id", "member_db_id", "member_id", "member_name",
                "addon_name", "category", "amount", "payment_mode", "payment_breakdown", "start_date", "expiry_date",
                "purchase_date", "status", "notes", "receipt_id", "created_at", "created_by"), addonRows));

        List<Object[]> freezeRows = new ArrayList<>();
        for (Freeze f : freezes) {
            freezeRows.add(new Object[] { f.id, f.member.id, f.member.plan, midnight(f.start), midnight(f.plannedEnd),
                    midnight(f.endedAt), f.requested, f.endedAt != null ? f.used : 0, 0, null, ZERO, null,
                    f.reason != null ? f.reason + " (imported)" : "Imported from previous system", "STAFF", false, false,
                    f.by, f.createdAt != null ? f.createdAt : midnight(f.start) });
        }
        out.add(new TableRows("membership_freezes", List.of("id", "member_db_id", "plan_name", "freeze_start",
                "planned_end", "ended_at", "requested_days", "free_days_applied", "charged_days", "charge_per_day",
                "charge_amount", "charge_receipt_id", "reason", "source", "limits_overridden", "charge_waived",
                "recorded_by", "created_at"), freezeRows));

        List<Object[]> visitRows = new ArrayList<>();
        for (Visit a : attendance) {
            boolean walkIn = "walk_in".equals(a.type);
            visitRows.add(new Object[] { a.id, a.type, a.member != null ? a.member.id : null, a.checkIn, a.checkOut,
                    a.totalMinutes, "completed", a.method, "LEGACY", walkIn ? "walk_in_form" : "legacy_import",
                    a.walkInName, a.walkInPhone, a.activity, walkIn ? "paid" : null, walkIn ? a.amount : null,
                    walkIn ? a.payMethod : null, a.notes, branch, a.checkIn != null ? a.checkIn : now, MARK });
        }
        out.add(new TableRows("attendance", List.of("id", "type", "member_id", "check_in_time", "check_out_time",
                "total_minutes", "status", "check_in_method", "device_id", "resolved_by", "walk_in_name", "walk_in_phone",
                "activity_type", "walk_in_payment_status", "walk_in_amount", "walk_in_payment_method", "notes",
                "branch_id", "created_at", "created_by"), visitRows));
        return out;
    }

    /** Gym details from the old settings table, to prefill the onboarding form. */
    private Map<String, Object> suggestedGym() {
        Map<String, String> s = new HashMap<>();
        for (Row r : d.rows("settings")) {
            if (r.str("key_name") != null) s.put(r.str("key_name"), r.str("key_value"));
        }
        Map<String, Object> gym = new LinkedHashMap<>();
        gym.put("name", s.get("company_name"));
        gym.put("address", s.get("company_address") == null ? null : s.get("company_address").replaceAll("\\s+", " ").trim());
        gym.put("phone", s.get("company_phone"));
        gym.put("email", s.get("company_email"));
        gym.put("website", s.get("website_url"));
        return gym;
    }

    // ── Report ───────────────────────────────────────────────────────────────

    private Map<String, Object> buildReport(List<PlanDef> plans, java.util.Collection<Mem> members, List<Rcpt> receipts,
                                            List<CreditNote> creditNotes, List<Addon> addons, List<Freeze> freezes,
                                            List<Visit> attendance, Set<String> referencedPhotos, List<PhotoCopy> photos) {
        // Cash the old system actually took in: credit bills only count the received
        // part, instalments their own amount, refunds are negative.
        BigDecimal oldCash = BigDecimal.ZERO;
        for (Row p : d.rows("payments")) {
            String desc = Objects.requireNonNullElse(p.str("description"), "");
            Matcher c = CREDIT.matcher(desc);
            if (desc.startsWith("Partial payment")) oldCash = oldCash.add(money(p.num("amount")));
            else if (c.find()) oldCash = oldCash.add(money(c.group(1)));
            else oldCash = oldCash.add(money(p.num("final_amount")));
        }
        BigDecimal oldDayPasses = d.rows("daily_visitors").stream().map(v -> money(v.num("payment_amount")))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal received = receipts.stream().map(r -> r.paid).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal refunded = creditNotes.stream().map(c -> c.amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal oldOpenDues = d.rows("partial_payments").stream().filter(r -> !"paid".equals(r.str("status")))
                .map(r -> money(r.num("amount_due"))).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal dues = members.stream().map(m -> m.outstanding).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal oldTotal = money(oldCash.add(oldDayPasses));
        BigDecimal importedTotal = money(received.subtract(refunded));

        int oldAddons = d.rows("member_addons").size();
        List<Map<String, Object>> counts = new ArrayList<>();
        counts.add(count("Plans", d.rows("membership_plans").size(), plans.size(), "membership plans (inactive duplicates skipped)"));
        counts.add(count("Members", d.rows("members").size(), members.size(),
                "members, " + members.stream().filter(m -> m.photoUrl != null).count() + " with photos"));
        counts.add(count("Payments", d.rows("payments").size(), receipts.stream().filter(r -> r.member != null).count(),
                "receipts, " + creditNotes.size() + " refunds as credit notes"));
        counts.add(count("Add-ons", oldAddons, addons.size(),
                "add-on purchases (" + (oldAddons - addons.size()) + " free extensions kept as member notes)"));
        counts.add(count("Freeze log", d.rows("member_freeze_log").size(), freezes.size(),
                "freeze records (" + freezes.stream().filter(f -> f.endedAt == null).count() + " still open)"));
        counts.add(count("Day passes", d.rows("daily_visitors").size(), d.rows("daily_visitors").size(),
                "walk-in visits + Daily Entry receipts"));
        counts.add(count("Check-ins", d.rows("member_checkins").size(),
                attendance.stream().filter(a -> "member".equals(a.type)).count(), "attendance records"));

        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (Mem m : members) {
            String k = "active".equals(m.status)
                    ? (m.finalEnd != null && !m.finalEnd.isBefore(today) ? "Active" : "Expired")
                    : "frozen".equals(m.status) ? "Frozen" : "Inactive";
            byStatus.merge(k, 1L, Long::sum);
        }
        Map<String, Map<String, Object>> byType = new LinkedHashMap<>();
        for (Rcpt r : receipts) {
            Map<String, Object> t = byType.computeIfAbsent(r.type, k -> {
                Map<String, Object> v = new LinkedHashMap<>();
                v.put("type", k); v.put("count", 0L); v.put("billed", BigDecimal.ZERO); v.put("received", BigDecimal.ZERO);
                return v;
            });
            t.put("count", (Long) t.get("count") + 1);
            t.put("billed", money(((BigDecimal) t.get("billed")).add(r.amount)));
            t.put("received", money(((BigDecimal) t.get("received")).add(r.paid)));
        }
        Map<String, BigDecimal> byMethod = new LinkedHashMap<>();
        for (Rcpt r : receipts) {
            if (r.breakdown != null) for (Leg l : r.breakdown) byMethod.merge(l.method, l.amount, BigDecimal::add);
            else byMethod.merge(r.method == null ? "Cash" : r.method, r.paid, BigDecimal::add);
        }

        Map<String, Object> money = new LinkedHashMap<>();
        money.put("old_cash", money(oldCash));
        money.put("old_day_passes", money(oldDayPasses));
        money.put("old_total", oldTotal);
        money.put("received", money(received));
        money.put("refunded", money(refunded));
        money.put("imported_total", importedTotal);
        money.put("matches", oldTotal.compareTo(importedTotal) == 0);
        money.put("old_open_dues", money(oldOpenDues));
        money.put("imported_dues", money(dues));

        List<Map<String, Object>> reviewOut = new ArrayList<>();
        review.forEach((section, items) -> {
            Map<String, Object> s = new LinkedHashMap<>();
            s.put("section", section);
            s.put("items", items);
            reviewOut.add(s);
        });

        Map<String, Object> photoStats = new LinkedHashMap<>();
        photoStats.put("referenced", referencedPhotos.size());
        photoStats.put("matched", o.availablePhotos() == null ? null : photos.size());

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("counts", counts);
        report.put("members_by_status", byStatus);
        report.put("money", money);
        report.put("receipt_types", new ArrayList<>(byType.values()));
        report.put("methods", byMethod.entrySet().stream().map(e -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("method", e.getKey());
            m.put("amount", money(e.getValue()));
            return m;
        }).toList());
        report.put("photos", photoStats);
        report.put("review", reviewOut);
        return report;
    }

    private static Map<String, Object> count(String label, long old, long imported, String importedAs) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("label", label);
        m.put("old", old);
        m.put("imported", imported);
        m.put("imported_as", imported + " " + importedAs);
        return m;
    }

    /** Whether a dump looks like the previous GymBios (has its members and payments tables). */
    public static List<String> missingTables(LegacyDump dump) {
        List<String> missing = new ArrayList<>();
        for (String t : List.of("members", "membership_plans", "payments")) if (!dump.has(t)) missing.add(t);
        return missing;
    }
}
