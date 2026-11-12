package com.company.project.services;

import com.company.project.entities.Branch;
import com.company.project.entities.PaymentTerms;
import com.company.project.entities.PaymentTermsAcceptance;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.PaymentTermsAcceptanceRepository;
import com.company.project.repositories.PaymentTermsRepository;
import com.company.project.security.BranchContextHolder;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * GymOS › Settings › Payment Terms: per-branch terms sets, each switched on/off and
 * attached to the desk payment kinds it covers, plus the log of what members accepted.
 * The POS never asks for terms.
 */
@Service
public class PaymentTermsService {

    /** Desk payment kinds a terms set can apply to (the web app asks before each of these). */
    public static final List<String> KINDS = List.of(
            "registration", "renewal", "upgrade", "downgrade", "freeze",
            "addon", "personal_training", "dues", "day_pass", "sales_invoice");

    static final int TITLE_MAX = 150;
    static final int CONTENT_MAX = 20_000;

    public record Request(String title, String content, List<String> appliesTo, Boolean enabled, Integer sortOrder) {}

    public record Terms(Long id, Long branchId, String title, String content, List<String> appliesTo,
                        boolean enabled, int sortOrder, int version,
                        OffsetDateTime createdAt, OffsetDateTime updatedAt, String updatedBy) {}

    public record AcceptRequest(String kind, Long branchId, Long memberDbId, String memberName,
                                BigDecimal amount, List<Long> termsIds) {}

    public record Acceptance(Long id, String paymentKind, Long memberDbId, String memberName, BigDecimal amount,
                             Long termsId, String termsTitle, int termsVersion, String acceptedBy,
                             OffsetDateTime acceptedAt) {}

    public record AcceptanceDetail(Acceptance acceptance, String termsContent) {}

    public record AcceptanceLog(long total, List<Acceptance> rows) {}

    private final PaymentTermsRepository repository;
    private final PaymentTermsAcceptanceRepository acceptances;
    private final BranchRepository branches;

    public PaymentTermsService(PaymentTermsRepository repository,
                               PaymentTermsAcceptanceRepository acceptances,
                               BranchRepository branches) {
        this.repository = repository;
        this.acceptances = acceptances;
        this.branches = branches;
    }

    // ── Settings ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Terms> list(Long branchId) {
        Long branch = resolveBranch(branchId);
        return repository.findByBranchIdOrderBySortOrderAscIdAsc(branch).stream().map(PaymentTermsService::toDto).toList();
    }

    @Transactional
    public Terms create(Long branchId, Request request) {
        Long branch = writableBranch(branchId);
        PaymentTerms t = new PaymentTerms();
        t.setBranchId(branch);
        apply(t, request, true);
        if (request.sortOrder() == null) {
            t.setSortOrder(repository.findByBranchIdOrderBySortOrderAscIdAsc(branch).stream()
                    .mapToInt(PaymentTerms::getSortOrder).max().orElse(-1) + 1);
        }
        return toDto(repository.save(t));
    }

    @Transactional
    public Terms update(Long id, Request request) {
        PaymentTerms t = find(id);
        writableBranch(t.getBranchId());
        String oldTitle = t.getTitle();
        String oldContent = t.getContent();
        apply(t, request, false);
        if (!Objects.equals(oldTitle, t.getTitle()) || !Objects.equals(oldContent, t.getContent())) {
            t.setVersion(t.getVersion() + 1);
        }
        return toDto(repository.save(t));
    }

    @Transactional
    public void delete(Long id) {
        PaymentTerms t = find(id);
        writableBranch(t.getBranchId());
        // Acceptances keep their own copy of the wording, so they stay meaningful.
        repository.delete(t);
    }

    /** Saves a new display order: ids listed first-to-last. Ids of other branches are ignored. */
    @Transactional
    public List<Terms> reorder(Long branchId, List<Long> ids) {
        Long branch = writableBranch(branchId);
        List<PaymentTerms> all = repository.findByBranchIdOrderBySortOrderAscIdAsc(branch);
        int i = 0;
        for (Long id : ids == null ? List.<Long>of() : ids) {
            for (PaymentTerms t : all) {
                if (t.getId().equals(id)) { t.setSortOrder(i++); break; }
            }
        }
        repository.saveAll(all);
        return list(branch);
    }

    // ── At the desk ─────────────────────────────────────────────────────────────

    /** The switched-on terms sets for one payment kind, in display order. */
    @Transactional(readOnly = true)
    public List<Terms> active(String kind, Long branchId) {
        String k = normalizeKind(kind);
        Long branch = resolveBranch(branchId);
        return repository.findByBranchIdOrderBySortOrderAscIdAsc(branch).stream()
                .filter(PaymentTerms::isEnabled)
                .filter(t -> kinds(t.getAppliesTo()).contains(k))
                .map(PaymentTermsService::toDto)
                .toList();
    }

    /** Records that the member accepted these terms sets for a payment of this kind. */
    @Transactional
    public List<Acceptance> accept(AcceptRequest request) {
        if (request == null) throw bad("Nothing to record");
        String kind = normalizeKind(request.kind());
        List<Long> ids = request.termsIds() == null ? List.of() : request.termsIds();
        if (ids.isEmpty()) throw bad("Choose the terms that were accepted");
        List<Acceptance> out = new ArrayList<>();
        for (PaymentTerms t : repository.findAllById(new LinkedHashSet<>(ids))) {
            PaymentTermsAcceptance a = new PaymentTermsAcceptance();
            a.setBranchId(t.getBranchId());
            a.setPaymentKind(kind);
            a.setMemberDbId(request.memberDbId());
            String name = request.memberName() == null ? null : request.memberName().trim();
            a.setMemberName(name == null || name.isEmpty() ? null : truncate(name, 255));
            a.setAmount(request.amount() != null && request.amount().signum() >= 0 ? request.amount() : null);
            a.setTermsId(t.getId());
            a.setTermsTitle(t.getTitle());
            a.setTermsVersion(t.getVersion());
            a.setTermsContent(t.getContent());
            out.add(toDto(acceptances.save(a)));
        }
        if (out.isEmpty()) throw bad("Those terms no longer exist — reopen the payment");
        return out;
    }

    @Transactional(readOnly = true)
    public AcceptanceLog log(Long branchId, int limit) {
        Long branch = resolveBranch(branchId);
        int size = Math.max(1, Math.min(limit <= 0 ? 50 : limit, 500));
        List<Acceptance> rows = acceptances.findByBranchIdOrderByCreatedAtDescIdDesc(branch, PageRequest.of(0, size))
                .stream().map(PaymentTermsService::toDto).toList();
        return new AcceptanceLog(acceptances.countByBranchId(branch), rows);
    }

    @Transactional(readOnly = true)
    public List<Acceptance> forMember(Long memberDbId) {
        return acceptances.findByMemberDbIdOrderByCreatedAtDescIdDesc(memberDbId).stream()
                .map(PaymentTermsService::toDto).toList();
    }

    @Transactional(readOnly = true)
    public AcceptanceDetail acceptance(Long id) {
        PaymentTermsAcceptance a = acceptances.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Acceptance not found"));
        return new AcceptanceDetail(toDto(a), a.getTermsContent());
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private void apply(PaymentTerms t, Request r, boolean creating) {
        if (r == null) throw bad("Nothing to save");
        if (creating || r.title() != null) {
            String title = r.title() == null ? "" : r.title().trim();
            if (title.isEmpty()) throw bad("Give the terms a title");
            if (title.length() > TITLE_MAX) throw bad("Title must be " + TITLE_MAX + " characters or fewer");
            t.setTitle(title);
        }
        if (creating || r.content() != null) {
            String content = r.content() == null ? "" : r.content().replace("\r\n", "\n").strip();
            if (content.isEmpty()) throw bad("Write the terms the member has to accept");
            if (content.length() > CONTENT_MAX) throw bad("Terms must be " + CONTENT_MAX + " characters or fewer");
            t.setContent(content);
        }
        if (creating || r.appliesTo() != null) {
            Set<String> chosen = new LinkedHashSet<>();
            for (String k : r.appliesTo() == null ? List.<String>of() : r.appliesTo()) chosen.add(normalizeKind(k));
            // Stored in catalogue order so the list reads the same everywhere.
            t.setAppliesTo(KINDS.stream().filter(chosen::contains).collect(Collectors.joining(",")));
        }
        if (r.enabled() != null) t.setEnabled(r.enabled());
        if (r.sortOrder() != null) t.setSortOrder(r.sortOrder());
    }

    private PaymentTerms find(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Terms not found"));
    }

    /**
     * The branch whose terms are read: the active branch when one is selected, otherwise the
     * one asked for, otherwise the default branch (All Branches mode).
     */
    private Long resolveBranch(Long requested) {
        Long active = BranchContextHolder.getActiveBranchId();
        if (active != null) return active;
        if (requested != null) return requested;
        return branches.findByIsDefaultTrue().map(Branch::getId)
                .orElseThrow(() -> bad("Select a branch first"));
    }

    /** Settings are edited one branch at a time, like the rest of GymOS › Settings. */
    private Long writableBranch(Long requested) {
        Long active = BranchContextHolder.getActiveBranchId();
        if (active == null) throw bad("Select a branch from the sidebar to change its payment terms");
        if (requested != null && !requested.equals(active)) {
            throw new org.springframework.security.access.AccessDeniedException("These terms belong to another branch");
        }
        return active;
    }

    static String normalizeKind(String kind) {
        String k = kind == null ? "" : kind.trim().toLowerCase(Locale.ROOT).replace('-', '_');
        if (!KINDS.contains(k)) throw bad("Unknown payment type: " + kind);
        return k;
    }

    static Set<String> kinds(String appliesTo) {
        if (appliesTo == null || appliesTo.isBlank()) return Set.of();
        return Arrays.stream(appliesTo.split(",")).map(String::trim).filter(s -> !s.isEmpty())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private static Terms toDto(PaymentTerms t) {
        return new Terms(t.getId(), t.getBranchId(), t.getTitle(), t.getContent(), List.copyOf(kinds(t.getAppliesTo())),
                t.isEnabled(), t.getSortOrder(), t.getVersion(), utc(t.getCreatedAt()), utc(t.getUpdatedAt()),
                t.getUpdatedBy() != null ? t.getUpdatedBy() : t.getCreatedBy());
    }

    private static Acceptance toDto(PaymentTermsAcceptance a) {
        return new Acceptance(a.getId(), a.getPaymentKind(), a.getMemberDbId(), a.getMemberName(), a.getAmount(),
                a.getTermsId(), a.getTermsTitle(), a.getTermsVersion(), a.getCreatedBy(), utc(a.getCreatedAt()));
    }

    private static OffsetDateTime utc(LocalDateTime t) {
        return t == null ? null : t.atOffset(ZoneOffset.UTC);
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }

    private static IllegalArgumentException bad(String message) {
        return new IllegalArgumentException(message);
    }
}
