package com.company.project.services;

import com.company.project.controlplane.entities.LeadCaptureForm;
import com.company.project.controlplane.repositories.LeadCaptureFormRepository;
import com.company.project.dto.MarketingCampaignDTOs.*;
import com.company.project.entities.Branch;
import com.company.project.entities.Lead;
import com.company.project.entities.MarketingCampaign;
import com.company.project.entities.MarketingCampaignLeadForm;
import com.company.project.entities.MarketingCampaignSpend;
import com.company.project.entities.Receipt;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.LeadRepository;
import com.company.project.repositories.MarketingCampaignLeadFormRepository;
import com.company.project.repositories.MarketingCampaignRepository;
import com.company.project.repositories.MarketingCampaignSpendRepository;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.TenantContextHolder;
import com.company.project.services.pos.PosBusinessDayService;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Marketing campaigns (Promotions &amp; Campaigns › Campaigns): the bridge between a
 * social-media campaign, the lead forms its ads point to, and the leads those forms bring in.
 * Leads are stamped with their campaign at submission ({@link #resolveCampaignForSubmission});
 * this service reports each campaign's spend and team hours against its leads, conversions
 * and the revenue its converted members have paid since.
 */
@Service
@Transactional
public class MarketingCampaignService {

    public static final Set<String> STATUSES = Set.of("draft", "active", "paused", "completed", "cancelled");
    public static final Set<String> PLATFORMS = Set.of(
            "instagram", "facebook", "meta", "google", "youtube", "whatsapp", "offline", "other");
    public static final Set<String> OBJECTIVES = Set.of("leads", "trials", "awareness", "renewals", "event");
    public static final Set<String> SPEND_CATEGORIES = Set.of(
            "ad_spend", "creative", "boosting", "influencer", "printing", "team_time", "other");

    private static final List<String> REVENUE_RECEIPT_STATUSES = StaffProgressCalculator.REVENUE_RECEIPT_STATUSES;
    private static final int MAX_SHORT = 255;
    private static final int MAX_TEXT = 4000;

    private final MarketingCampaignRepository campaignRepository;
    private final MarketingCampaignSpendRepository spendRepository;
    private final MarketingCampaignLeadFormRepository linkRepository;
    private final LeadRepository leadRepository;
    private final ReceiptRepository receiptRepository;
    private final BranchRepository branchRepository;
    private final BranchService branchService;
    private final LeadCaptureFormRepository formRepository;
    private final PosBusinessDayService businessDayService;

    public MarketingCampaignService(MarketingCampaignRepository campaignRepository,
                                    MarketingCampaignSpendRepository spendRepository,
                                    MarketingCampaignLeadFormRepository linkRepository,
                                    LeadRepository leadRepository,
                                    ReceiptRepository receiptRepository,
                                    BranchRepository branchRepository,
                                    BranchService branchService,
                                    LeadCaptureFormRepository formRepository,
                                    PosBusinessDayService businessDayService) {
        this.campaignRepository = campaignRepository;
        this.spendRepository = spendRepository;
        this.linkRepository = linkRepository;
        this.leadRepository = leadRepository;
        this.receiptRepository = receiptRepository;
        this.branchRepository = branchRepository;
        this.branchService = branchService;
        this.formRepository = formRepository;
        this.businessDayService = businessDayService;
    }

    // ── Reads ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Campaign> list() {
        List<MarketingCampaign> campaigns = campaignRepository.findAllByOrderByStartDateDescIdDesc();
        if (campaigns.isEmpty()) return List.of();
        Context ctx = loadContext(campaigns);
        return campaigns.stream().map(c -> toCampaign(c, ctx)).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CampaignOption> options() {
        LocalDate today = today();
        return campaignRepository.findAllByOrderByStartDateDescIdDesc().stream()
                .filter(c -> !"cancelled".equals(c.getStatus()))
                .map(c -> new CampaignOption(c.getId(), c.getName(), c.getPlatform(), c.getStatus(),
                        phase(c, today), c.getStartDate(), c.getEndDate()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CampaignReport report(Long id) {
        MarketingCampaign c = find(id);
        Context ctx = loadContext(List.of(c));
        Campaign campaign = toCampaign(c, ctx);
        List<LeadRow> leads = ctx.leadsByCampaign.getOrDefault(c.getId(), List.of());
        List<MarketingCampaignSpend> spends = ctx.spendsByCampaign.getOrDefault(c.getId(), List.of());
        ZoneId zone = zone();

        // Day by day over the planned window, stretched to cover leads that trickled in after it.
        LocalDate last = c.getEndDate();
        for (LeadRow l : leads) {
            LocalDate d = localDate(l.createdAt, zone);
            if (d != null && d.isAfter(last)) last = d;
        }
        Map<LocalDate, long[]> counts = new TreeMap<>();
        Map<LocalDate, BigDecimal[]> money = new TreeMap<>();
        for (LocalDate d = c.getStartDate(); !d.isAfter(last) && counts.size() < 400; d = d.plusDays(1)) {
            counts.put(d, new long[2]);
            money.put(d, new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
        }
        for (LeadRow l : leads) {
            long[] day = counts.get(localDate(l.createdAt, zone));
            if (day != null) day[0]++;
            if (l.converted()) {
                long[] convDay = counts.get(localDate(l.lastContactDate != null ? l.lastContactDate : l.createdAt, zone));
                if (convDay != null) convDay[1]++;
            }
        }
        for (MarketingCampaignSpend s : spends) {
            BigDecimal[] day = money.computeIfAbsent(s.getSpendDate(), k -> {
                counts.putIfAbsent(k, new long[2]);
                return new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO};
            });
            day[0] = day[0].add(nz(s.getAmount()));
            day[1] = day[1].add(nz(s.getHours()));
        }
        List<DailyPoint> daily = new ArrayList<>();
        new TreeMap<>(counts).forEach((date, v) -> {
            BigDecimal[] m = money.getOrDefault(date, new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            daily.add(new DailyPoint(date, v[0], v[1], m[0], m[1]));
        });

        Map<Long, String> formNames = campaign.leadForms().stream()
                .collect(Collectors.toMap(LinkedForm::id, LinkedForm::name, (a, b) -> a));
        // Forms no longer linked can still have credited leads.
        Set<Long> unknownForms = leads.stream().map(l -> l.leadFormId)
                .filter(fid -> fid != null && !formNames.containsKey(fid)).collect(Collectors.toSet());
        if (!unknownForms.isEmpty()) {
            tenantForms(unknownForms).forEach(f -> formNames.put(f.getId(), f.getName()));
        }

        List<Breakdown> bySource = breakdown(leads, l -> l.source, s -> s == null ? "Not set" : sourceLabel(s));
        List<Breakdown> byStaff = breakdown(leads, l -> l.assignedStaff, s -> s == null ? "Unassigned" : s);
        List<Breakdown> byForm = breakdown(leads, l -> l.leadFormId == null ? null : String.valueOf(l.leadFormId),
                k -> k == null ? "Added manually" : formNames.getOrDefault(Long.valueOf(k), "Deleted form"));

        List<CampaignLead> recent = leadRepository.findTop50ByMarketingCampaignIdOrderByCreatedAtDesc(c.getId()).stream()
                .map(l -> toCampaignLead(l, formNames))
                .collect(Collectors.toList());

        List<Spend> spendRows = spends.stream()
                .sorted(Comparator.comparing(MarketingCampaignSpend::getSpendDate).reversed()
                        .thenComparing(MarketingCampaignSpend::getId, Comparator.reverseOrder()))
                .map(this::toSpend)
                .collect(Collectors.toList());

        return new CampaignReport(campaign, daily, bySource, byStaff, byForm, spendRows, recent);
    }

    /** Lead forms of this gym (active branch, unless All Branches) and the campaigns each feeds. */
    @Transactional(readOnly = true)
    public List<LeadFormOption> leadFormOptions() {
        String tenant = requireTenant();
        Long activeBranchId = BranchContextHolder.getActiveBranchId();
        List<LeadCaptureForm> forms = activeBranchId == null
                ? formRepository.findByTenantSlugOrderByCreatedAtDesc(tenant)
                : formRepository.findByTenantSlugAndBranchIdOrderByCreatedAtDesc(tenant, activeBranchId);
        if (forms.isEmpty()) return List.of();

        List<MarketingCampaignLeadForm> links = linkRepository.findByLeadFormIdIn(
                forms.stream().map(LeadCaptureForm::getId).collect(Collectors.toList()));
        Map<Long, String> campaignNames = campaignRepository.findAllById(
                        links.stream().map(MarketingCampaignLeadForm::getCampaignId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(MarketingCampaign::getId, MarketingCampaign::getName));
        Map<Long, List<String>> byForm = new HashMap<>();
        for (MarketingCampaignLeadForm link : links) {
            String name = campaignNames.get(link.getCampaignId());
            if (name != null) byForm.computeIfAbsent(link.getLeadFormId(), k -> new ArrayList<>()).add(name);
        }
        return forms.stream()
                .map(f -> new LeadFormOption(f.getId(), f.getName(), f.getFormKey(), f.getSource(), f.isActive(),
                        f.getBranchId(), f.getSubmissionCount(), byForm.getOrDefault(f.getId(), List.of())))
                .collect(Collectors.toList());
    }

    // ── Writes ───────────────────────────────────────────────────────────────

    public Campaign create(CampaignRequest req) {
        MarketingCampaign c = new MarketingCampaign();
        c.setBranchId(branchService.resolveBranchForCreate(req.branchId()));
        apply(req, c, true);
        MarketingCampaign saved = campaignRepository.save(c);
        saved.setCampaignCode("MKT-" + String.format("%010d", saved.getId()));
        saved = campaignRepository.save(saved);
        if (req.leadFormIds() != null && !req.leadFormIds().isEmpty()) {
            replaceLinks(saved, req.leadFormIds(), !Boolean.FALSE.equals(req.creditExistingLeads()));
        }
        return toCampaign(saved, loadContext(List.of(saved)));
    }

    public Campaign update(Long id, CampaignRequest req) {
        MarketingCampaign c = find(id);
        apply(req, c, false);
        MarketingCampaign saved = campaignRepository.save(c);
        return toCampaign(saved, loadContext(List.of(saved)));
    }

    public Campaign updateStatus(Long id, String status) {
        MarketingCampaign c = find(id);
        c.setStatus(requireIn(status, STATUSES, "status"));
        MarketingCampaign saved = campaignRepository.save(c);
        return toCampaign(saved, loadContext(List.of(saved)));
    }

    /** Deletes the campaign, its spend log and form links; its leads stay, uncredited. */
    public void delete(Long id) {
        MarketingCampaign c = find(id);
        leadRepository.clearMarketingCampaign(c.getId());
        spendRepository.deleteByCampaignId(c.getId());
        linkRepository.deleteByCampaignId(c.getId());
        campaignRepository.delete(c);
    }

    public Campaign linkLeadForms(Long id, LeadFormLinkRequest req) {
        MarketingCampaign c = find(id);
        replaceLinks(c, req.leadFormIds() == null ? List.of() : req.leadFormIds(),
                !Boolean.FALSE.equals(req.creditExistingLeads()));
        return toCampaign(c, loadContext(List.of(c)));
    }

    public Spend addSpend(Long campaignId, SpendRequest req) {
        MarketingCampaign c = find(campaignId);
        MarketingCampaignSpend s = new MarketingCampaignSpend();
        s.setCampaignId(c.getId());
        applySpend(req, s);
        return toSpend(spendRepository.save(s));
    }

    public Spend updateSpend(Long campaignId, Long spendId, SpendRequest req) {
        MarketingCampaign c = find(campaignId);
        MarketingCampaignSpend s = findSpend(c, spendId);
        applySpend(req, s);
        return toSpend(spendRepository.save(s));
    }

    public void deleteSpend(Long campaignId, Long spendId) {
        MarketingCampaign c = find(campaignId);
        spendRepository.delete(findSpend(c, spendId));
    }

    // ── Attribution (public lead-form submissions) ───────────────────────────

    /**
     * The campaign a new lead from this form should be credited to: a campaign in the form's
     * branch whose tracking code matches the ad link's utm_campaign, else the form's linked
     * campaign running today, else the one that started most recently. Null when none applies.
     * Runs inside the form's tenant + branch context; native queries, so no branch filter.
     * Joins the submission's transaction; noRollbackFor so a failure here (which the caller
     * swallows) can't mark that transaction rollback-only and lose the lead.
     */
    @Transactional(noRollbackFor = RuntimeException.class)
    public Long resolveCampaignForSubmission(Long leadFormId, Long branchId, String utmCampaign) {
        if (utmCampaign != null && !utmCampaign.isBlank()) {
            List<Long> byCode = campaignRepository.findIdsByTrackingCode(branchId, utmCampaign.trim());
            if (!byCode.isEmpty()) return byCode.get(0);
        }
        if (leadFormId == null) return null;
        List<Long> linked = campaignRepository.findAttributableIdsForForm(leadFormId, branchId, today());
        return linked.isEmpty() ? null : linked.get(0);
    }

    // ── Helpers: links & validation ──────────────────────────────────────────

    private void replaceLinks(MarketingCampaign c, List<Long> requestedIds, boolean creditExistingLeads) {
        Set<Long> wanted = requestedIds.stream().filter(Objects::nonNull).collect(Collectors.toCollection(LinkedHashSet::new));
        Map<Long, LeadCaptureForm> forms = tenantForms(wanted).stream()
                .collect(Collectors.toMap(LeadCaptureForm::getId, Function.identity()));
        for (Long formId : wanted) {
            LeadCaptureForm f = forms.get(formId);
            if (f == null) throw new IllegalArgumentException("Lead form not found: " + formId);
            if (!Objects.equals(f.getBranchId(), c.getBranchId())) {
                throw new IllegalArgumentException("\"" + f.getName() + "\" belongs to another branch — "
                        + "a campaign can only use lead forms of its own branch.");
            }
        }

        List<MarketingCampaignLeadForm> existing = linkRepository.findByCampaignId(c.getId());
        Set<Long> existingIds = existing.stream().map(MarketingCampaignLeadForm::getLeadFormId).collect(Collectors.toSet());
        existing.stream().filter(l -> !wanted.contains(l.getLeadFormId())).forEach(linkRepository::delete);
        List<Long> added = wanted.stream().filter(id -> !existingIds.contains(id)).collect(Collectors.toList());
        added.forEach(formId -> linkRepository.save(new MarketingCampaignLeadForm(c.getId(), formId)));

        // Leads the new forms already brought in since the campaign started count for it too.
        if (creditExistingLeads && !added.isEmpty() && !"cancelled".equals(c.getStatus())) {
            LocalDateTime since = c.getStartDate().atStartOfDay(zone())
                    .withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
            leadRepository.attributeFormLeads(c.getId(), c.getBranchId(), added, since);
            for (Long formId : added) {
                String tag = "%\"form:" + forms.get(formId).getName().replace("\\", "\\\\")
                        .replace("%", "\\%").replace("_", "\\_") + "\"%";
                leadRepository.attributeLegacyFormLeads(c.getId(), formId, c.getBranchId(), tag, since);
            }
        }
    }

    private void apply(CampaignRequest req, MarketingCampaign c, boolean creating) {
        if (creating || req.name() != null) {
            String name = trim(req.name(), 150);
            if (name == null) throw new IllegalArgumentException("Campaign name is required");
            c.setName(name);
        }
        if (req.description() != null) c.setDescription(trim(req.description(), MAX_TEXT));
        if (req.platform() != null || creating) {
            c.setPlatform(req.platform() == null ? "instagram" : requireIn(req.platform(), PLATFORMS, "platform"));
        }
        if (req.objective() != null || creating) {
            c.setObjective(req.objective() == null ? "leads" : requireIn(req.objective(), OBJECTIVES, "objective"));
        }
        if (req.status() != null || creating) {
            c.setStatus(req.status() == null ? "active" : requireIn(req.status(), STATUSES, "status"));
        }
        if (req.startDate() != null) c.setStartDate(req.startDate());
        if (req.endDate() != null) c.setEndDate(req.endDate());
        if (c.getStartDate() == null) throw new IllegalArgumentException("Start date is required");
        if (c.getEndDate() == null) throw new IllegalArgumentException("End date is required");
        if (c.getEndDate().isBefore(c.getStartDate())) {
            throw new IllegalArgumentException("End date can't be before the start date");
        }
        if (req.budget() != null) c.setBudget(nonNegativeOrNull(req.budget(), "Budget"));
        if (req.targetLeads() != null) c.setTargetLeads(req.targetLeads() > 0 ? req.targetLeads() : null);
        if (req.targetConversions() != null) c.setTargetConversions(req.targetConversions() > 0 ? req.targetConversions() : null);
        if (req.trackingCode() != null) {
            String code = trim(req.trackingCode(), 100);
            if (code != null && !code.matches("[A-Za-z0-9_.-]+")) {
                throw new IllegalArgumentException("Tracking code can only use letters, numbers, - _ and . (no spaces)");
            }
            c.setTrackingCode(code);
        }
        if (req.ownerName() != null) c.setOwnerName(trim(req.ownerName(), MAX_SHORT));
        if (req.notes() != null) c.setNotes(trim(req.notes(), MAX_TEXT));
    }

    private void applySpend(SpendRequest req, MarketingCampaignSpend s) {
        LocalDate date = req.spendDate() != null ? req.spendDate() : (s.getSpendDate() != null ? s.getSpendDate() : today());
        s.setSpendDate(date);
        if (req.category() != null || s.getCategory() == null) {
            s.setCategory(req.category() == null ? "ad_spend" : requireIn(req.category(), SPEND_CATEGORIES, "category"));
        }
        if (req.amount() != null) s.setAmount(nonNegative(req.amount(), "Amount").setScale(2, RoundingMode.HALF_UP));
        if (req.hours() != null) s.setHours(nonNegative(req.hours(), "Hours").setScale(2, RoundingMode.HALF_UP));
        if (req.notes() != null) s.setNotes(trim(req.notes(), MAX_TEXT));
        if (nz(s.getAmount()).signum() == 0 && nz(s.getHours()).signum() == 0) {
            throw new IllegalArgumentException("Enter an amount spent or the hours put in");
        }
    }

    private MarketingCampaign find(Long id) {
        // findById runs through the branch filter + BranchSecurityListener's read check.
        return campaignRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Campaign not found: " + id));
    }

    private MarketingCampaignSpend findSpend(MarketingCampaign c, Long spendId) {
        MarketingCampaignSpend s = spendRepository.findById(spendId)
                .orElseThrow(() -> new EntityNotFoundException("Spend entry not found: " + spendId));
        if (!Objects.equals(s.getCampaignId(), c.getId())) {
            throw new EntityNotFoundException("Spend entry not found: " + spendId);
        }
        return s;
    }

    private List<LeadCaptureForm> tenantForms(Collection<Long> ids) {
        if (ids.isEmpty()) return List.of();
        return formRepository.findByTenantSlugAndIdIn(requireTenant(), ids);
    }

    private static String requireTenant() {
        String tenant = TenantContextHolder.getCurrentTenant();
        if (tenant == null || tenant.isBlank()) {
            throw new IllegalStateException("Campaigns are only available inside a gym account");
        }
        return tenant;
    }

    private static String requireIn(String value, Set<String> allowed, String field) {
        String v = value == null ? null : value.trim().toLowerCase(Locale.ROOT);
        if (v == null || !allowed.contains(v)) throw new IllegalArgumentException("Unsupported " + field + ": " + value);
        return v;
    }

    private static BigDecimal nonNegative(BigDecimal v, String label) {
        if (v.signum() < 0) throw new IllegalArgumentException(label + " can't be negative");
        return v;
    }

    private static BigDecimal nonNegativeOrNull(BigDecimal v, String label) {
        return nonNegative(v, label).signum() == 0 ? null : v.setScale(2, RoundingMode.HALF_UP);
    }

    private static String trim(String v, int max) {
        if (v == null) return null;
        String t = v.trim();
        if (t.isEmpty()) return null;
        return t.length() > max ? t.substring(0, max) : t;
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    // ── Helpers: metrics ─────────────────────────────────────────────────────

    /** One credited lead, as read by LeadRepository.findCampaignLeadRows. */
    private record LeadRow(Long id, Long campaignId, String status, Long memberId, LocalDateTime createdAt,
                           Long leadFormId, String source, String assignedStaff, LocalDateTime lastContactDate) {
        boolean converted() {
            return memberId != null || "converted".equals(status);
        }
    }

    /** Everything the metrics need for a set of campaigns, loaded in a handful of queries. */
    private static final class Context {
        Map<Long, List<LeadRow>> leadsByCampaign = new HashMap<>();
        Map<Long, List<MarketingCampaignSpend>> spendsByCampaign = new HashMap<>();
        Map<Long, List<Long>> formIdsByCampaign = new HashMap<>();
        Map<Long, LeadCaptureForm> forms = new HashMap<>();
        Map<Long, BigDecimal> revenueByCampaign = new HashMap<>();
        Map<Long, String> branchNames = new HashMap<>();
        LocalDate today;
    }

    private Context loadContext(List<MarketingCampaign> campaigns) {
        Context ctx = new Context();
        ctx.today = today();
        List<Long> ids = campaigns.stream().map(MarketingCampaign::getId).collect(Collectors.toList());

        for (Object[] r : leadRepository.findCampaignLeadRows(ids)) {
            LeadRow row = new LeadRow((Long) r[0], (Long) r[1], (String) r[2], (Long) r[3], (LocalDateTime) r[4],
                    (Long) r[5], (String) r[6], (String) r[7], (LocalDateTime) r[8]);
            ctx.leadsByCampaign.computeIfAbsent(row.campaignId(), k -> new ArrayList<>()).add(row);
        }
        for (MarketingCampaignSpend s : spendRepository.findByCampaignIdIn(ids)) {
            ctx.spendsByCampaign.computeIfAbsent(s.getCampaignId(), k -> new ArrayList<>()).add(s);
        }
        for (MarketingCampaignLeadForm l : linkRepository.findByCampaignIdIn(ids)) {
            ctx.formIdsByCampaign.computeIfAbsent(l.getCampaignId(), k -> new ArrayList<>()).add(l.getLeadFormId());
        }
        Set<Long> formIds = ctx.formIdsByCampaign.values().stream().flatMap(List::stream).collect(Collectors.toSet());
        tenantForms(formIds).forEach(f -> ctx.forms.put(f.getId(), f));

        // Revenue: what each converted member has paid since they first came in as this campaign's lead.
        Map<Long, Map<Long, LocalDateTime>> memberSince = new HashMap<>();
        ctx.leadsByCampaign.forEach((cid, rows) -> rows.stream()
                .filter(r -> r.memberId() != null)
                .forEach(r -> memberSince.computeIfAbsent(cid, k -> new HashMap<>())
                        .merge(r.memberId(), r.createdAt() != null ? r.createdAt() : LocalDateTime.MIN,
                                (a, b) -> a.isBefore(b) ? a : b)));
        Set<Long> memberIds = memberSince.values().stream().flatMap(m -> m.keySet().stream()).collect(Collectors.toSet());
        if (!memberIds.isEmpty()) {
            Specification<Receipt> spec = (root, query, cb) -> cb.and(
                    root.get("memberDbId").in(memberIds),
                    root.get("status").in(REVENUE_RECEIPT_STATUSES));
            List<Receipt> receipts = receiptRepository.findAll(spec);
            memberSince.forEach((cid, since) -> {
                BigDecimal total = BigDecimal.ZERO;
                for (Receipt r : receipts) {
                    LocalDateTime from = since.get(r.getMemberDbId());
                    if (from == null) continue;
                    LocalDateTime at = r.getTransactionDate() != null ? r.getTransactionDate() : r.getCreatedAt();
                    // A lead registered from the Leads page pays the same day; allow for clock/zone skew.
                    if (at == null || !at.isBefore(from.minusDays(1))) {
                        total = total.add(StaffProgressCalculator.receivedAmount(r));
                    }
                }
                ctx.revenueByCampaign.put(cid, total);
            });
        }

        Set<Long> branchIds = campaigns.stream().map(MarketingCampaign::getBranchId).filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (!branchIds.isEmpty()) {
            branchRepository.findByIdIn(new ArrayList<>(branchIds))
                    .forEach(b -> ctx.branchNames.put(b.getId(), b.getBranchName()));
        }
        return ctx;
    }

    private Campaign toCampaign(MarketingCampaign c, Context ctx) {
        List<LeadRow> leads = ctx.leadsByCampaign.getOrDefault(c.getId(), List.of());
        List<MarketingCampaignSpend> spends = ctx.spendsByCampaign.getOrDefault(c.getId(), List.of());

        long newLeads = 0, contacted = 0, followUp = 0, converted = 0, lost = 0;
        double daysToConvert = 0;
        long timedConversions = 0;
        for (LeadRow l : leads) {
            if (l.converted()) {
                converted++;
                if (l.createdAt() != null && l.lastContactDate() != null && !l.lastContactDate().isBefore(l.createdAt())) {
                    daysToConvert += ChronoUnit.MINUTES.between(l.createdAt(), l.lastContactDate()) / 1440.0;
                    timedConversions++;
                }
                continue;
            }
            String s = l.status() == null ? "new" : l.status();
            switch (s) {
                case "contacted" -> contacted++;
                case "follow-up", "follow_up" -> followUp++;
                case "lost" -> lost++;
                default -> newLeads++;
            }
        }
        long total = leads.size();
        BigDecimal spend = spends.stream().map(s -> nz(s.getAmount())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal hours = spends.stream().map(s -> nz(s.getHours())).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal revenue = ctx.revenueByCampaign.getOrDefault(c.getId(), BigDecimal.ZERO);

        Metrics metrics = new Metrics(
                total, newLeads, contacted, followUp, converted, lost,
                total > 0 ? round1(converted * 100.0 / total) : 0.0,
                spend, hours,
                total > 0 && spend.signum() > 0 ? spend.divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP) : null,
                converted > 0 && spend.signum() > 0 ? spend.divide(BigDecimal.valueOf(converted), 2, RoundingMode.HALF_UP) : null,
                revenue,
                spend.signum() > 0 ? round1(revenue.subtract(spend).doubleValue() * 100.0 / spend.doubleValue()) : null,
                c.getBudget() != null && c.getBudget().signum() > 0 ? round1(spend.doubleValue() * 100.0 / c.getBudget().doubleValue()) : null,
                hours.signum() > 0 ? round1(total / hours.doubleValue()) : null,
                timedConversions > 0 ? round1(daysToConvert / timedConversions) : null,
                c.getTargetLeads() != null && c.getTargetLeads() > 0 ? round1(total * 100.0 / c.getTargetLeads()) : null,
                c.getTargetConversions() != null && c.getTargetConversions() > 0
                        ? round1(converted * 100.0 / c.getTargetConversions()) : null);

        Map<Long, long[]> perForm = new HashMap<>();
        for (LeadRow l : leads) {
            if (l.leadFormId() == null) continue;
            long[] v = perForm.computeIfAbsent(l.leadFormId(), k -> new long[2]);
            v[0]++;
            if (l.converted()) v[1]++;
        }
        List<LinkedForm> linked = ctx.formIdsByCampaign.getOrDefault(c.getId(), List.of()).stream()
                .map(fid -> {
                    LeadCaptureForm f = ctx.forms.get(fid);
                    long[] v = perForm.getOrDefault(fid, new long[2]);
                    return f == null
                            ? new LinkedForm(fid, "Deleted form", null, null, false, true, v[0], v[1])
                            : new LinkedForm(fid, f.getName(), f.getFormKey(), f.getSource(), f.isActive(), false, v[0], v[1]);
                })
                .collect(Collectors.toList());

        LocalDate today = ctx.today;
        long duration = ChronoUnit.DAYS.between(c.getStartDate(), c.getEndDate()) + 1;
        long elapsed = today.isBefore(c.getStartDate()) ? 0
                : Math.min(duration, ChronoUnit.DAYS.between(c.getStartDate(), today) + 1);
        long remaining = today.isAfter(c.getEndDate()) ? 0
                : ChronoUnit.DAYS.between(today.isBefore(c.getStartDate()) ? c.getStartDate() : today, c.getEndDate()) + 1;

        return new Campaign(c.getId(), c.getCampaignCode(), c.getName(), c.getDescription(), c.getPlatform(),
                c.getObjective(), c.getStatus(), phase(c, today), c.getStartDate(), c.getEndDate(),
                duration, elapsed, remaining, c.getBudget(), c.getTargetLeads(), c.getTargetConversions(),
                c.getTrackingCode(), c.getOwnerName(), c.getNotes(), c.getBranchId(),
                ctx.branchNames.get(c.getBranchId()), linked, metrics, c.getCreatedAt(), c.getCreatedBy());
    }

    /** What the campaign is doing right now: the stored status, refined by its dates when active. */
    static String phase(MarketingCampaign c, LocalDate today) {
        String status = c.getStatus() == null ? "draft" : c.getStatus();
        if (!"active".equals(status)) return status;
        if (today.isBefore(c.getStartDate())) return "scheduled";
        if (today.isAfter(c.getEndDate())) return "ended";
        return "live";
    }

    private static List<Breakdown> breakdown(List<LeadRow> leads, Function<LeadRow, String> key,
                                             Function<String, String> label) {
        Map<String, long[]> m = new LinkedHashMap<>();
        for (LeadRow l : leads) {
            String k = key.apply(l);
            if (k != null && k.isBlank()) k = null;
            long[] v = m.computeIfAbsent(k == null ? "" : k, x -> new long[2]);
            v[0]++;
            if (l.converted()) v[1]++;
        }
        return m.entrySet().stream()
                .map(e -> {
                    String k = e.getKey().isEmpty() ? null : e.getKey();
                    long[] v = e.getValue();
                    return new Breakdown(k, label.apply(k), v[0], v[1], v[0] > 0 ? round1(v[1] * 100.0 / v[0]) : 0.0);
                })
                .sorted(Comparator.comparingLong(Breakdown::leads).reversed())
                .collect(Collectors.toList());
    }

    private static String sourceLabel(String source) {
        return switch (source) {
            case "social-media", "social_media" -> "Social Media";
            case "facebook-ads", "facebook_ads" -> "Facebook Ads";
            case "instagram" -> "Instagram";
            case "google-ads", "google_ads" -> "Google Ads";
            case "website" -> "Website";
            case "referral" -> "Referral";
            case "walk-in", "walk_in" -> "Walk-in";
            default -> Character.toUpperCase(source.charAt(0)) + source.substring(1).replace('-', ' ').replace('_', ' ');
        };
    }

    private CampaignLead toCampaignLead(Lead l, Map<Long, String> formNames) {
        String name = (Objects.toString(l.getFirstName(), "") + " " + Objects.toString(l.getLastName(), "")).trim();
        return new CampaignLead(l.getId(), l.getLeadId(), name, l.getPhone(), l.getStatus(), l.getSource(),
                l.getAssignedStaff(), l.getLeadFormId() == null ? null : formNames.getOrDefault(l.getLeadFormId(), "Deleted form"),
                l.getMemberId(), l.getCreatedAt());
    }

    private Spend toSpend(MarketingCampaignSpend s) {
        return new Spend(s.getId(), s.getSpendDate(), s.getCategory(), s.getAmount(), s.getHours(), s.getNotes(),
                s.getCreatedBy(), s.getCreatedAt());
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    private ZoneId zone() {
        return businessDayService.zone();
    }

    private LocalDate today() {
        return LocalDate.now(zone());
    }

    /** created_at is a UTC wall clock (JVM pinned to UTC); the gym's calendar day for it. */
    private static LocalDate localDate(LocalDateTime utc, ZoneId zone) {
        return utc == null ? null : utc.atOffset(ZoneOffset.UTC).atZoneSameInstant(zone).toLocalDate();
    }
}
