package com.company.project.services.pos;

import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.CashCategoryDTO;
import com.company.project.entities.AccountHead;
import com.company.project.entities.PosCashMovementCategory;
import com.company.project.entities.PosSettings;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.AccountHeadRepository;
import com.company.project.repositories.PosCashMovementCategoryRepository;
import com.company.project.security.BranchContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static com.company.project.services.pos.PosSupport.trimToNull;

/**
 * Managed cash in / cash out categories (BillBull's PosCashMovementCategory). A branch starts
 * with the labels from its POS settings (or the defaults) and is seeded into the table the first
 * time categories are managed or used. A category may name a ledger account — cash movements in
 * it are then journaled against that account.
 */
@Service
@Transactional
public class PosCashCategoryService {

    private static final List<String> TYPES = List.of(PosCashMovementCategory.DROP_IN,
            PosCashMovementCategory.CASH_OUT, PosCashMovementCategory.BOTH);

    private final PosCashMovementCategoryRepository repository;
    private final AccountHeadRepository accountRepository;
    private final PosSettingsService settingsService;
    private final PosAuditService auditService;
    private final PosSupport support;

    public PosCashCategoryService(PosCashMovementCategoryRepository repository, AccountHeadRepository accountRepository,
                                  PosSettingsService settingsService, PosAuditService auditService, PosSupport support) {
        this.repository = repository;
        this.accountRepository = accountRepository;
        this.settingsService = settingsService;
        this.auditService = auditService;
        this.support = support;
    }

    // ── Read ────────────────────────────────────────────────────────────────

    public List<CashCategoryDTO> list(boolean includeInactive) {
        Long branchId = support.requireBranch();
        ensureSeeded(branchId);
        return repository.findByBranchIdOrderByDisplayOrderAscNameAsc(branchId).stream()
                .filter(c -> includeInactive || Boolean.TRUE.equals(c.getActive()))
                .map(PosCashCategoryService::toDto).toList();
    }

    /**
     * Active category names for a movement type without seeding (safe in read-only transactions):
     * the managed rows once a branch has any, otherwise the legacy settings labels.
     */
    @Transactional(readOnly = true)
    public List<String> names(PosSettings settings, String movementType) {
        Long branchId = BranchContextHolder.getActiveBranchId();
        if (branchId != null && repository.countByBranchId(branchId) > 0) {
            return repository.findByBranchIdOrderByDisplayOrderAscNameAsc(branchId).stream()
                    .filter(c -> Boolean.TRUE.equals(c.getActive()) && c.appliesTo(movementType))
                    .map(PosCashMovementCategory::getName).toList();
        }
        return PosCashMovementCategory.DROP_IN.equals(movementType)
                ? settingsService.cashInCategories(settings) : settingsService.cashOutCategories(settings);
    }

    /**
     * The category a cash movement is recorded in: by id when given, else by name (legacy clients).
     * Returns null for an uncategorised movement; refuses an inactive or wrong-direction category.
     */
    public PosCashMovementCategory resolve(String movementType, Long categoryId, String name) {
        Long branchId = support.requireBranch();
        ensureSeeded(branchId);
        PosCashMovementCategory c = null;
        if (categoryId != null) {
            c = find(categoryId);
        } else if (trimToNull(name) != null) {
            c = repository.findFirstByBranchIdAndNameIgnoreCase(branchId, name.trim()).orElse(null);
            if (c == null) {
                throw new BusinessRuleViolationException("Unknown cash category \"" + name.trim()
                        + "\". Pick one from the list or add it in POS Console › Cash categories.");
            }
        }
        if (c == null) return null;
        if (!Boolean.TRUE.equals(c.getActive())) {
            throw new BusinessRuleViolationException("The cash category \"" + c.getName() + "\" is inactive.");
        }
        if (!c.appliesTo(movementType)) {
            throw new BusinessRuleViolationException("\"" + c.getName() + "\" is a "
                    + (PosCashMovementCategory.DROP_IN.equals(c.getMovementType()) ? "cash in" : "cash out") + " category.");
        }
        return c;
    }

    // ── Manage ──────────────────────────────────────────────────────────────

    public CashCategoryDTO create(PosRequests.CashCategory req) {
        Long branchId = support.requireBranch();
        ensureSeeded(branchId);
        String name = trimToNull(req.name());
        if (name == null) throw new BusinessRuleViolationException("Enter a category name.");
        if (repository.findFirstByBranchIdAndNameIgnoreCase(branchId, name).isPresent()) {
            throw new BusinessRuleViolationException("A cash category named \"" + name + "\" already exists.");
        }
        PosCashMovementCategory c = new PosCashMovementCategory();
        c.setBranchId(branchId);
        c.setCode(uniqueCode(branchId, trimToNull(req.code()) != null ? req.code() : name, null));
        c.setName(name);
        c.setMovementType(PosCashMovementCategory.BOTH);
        c.setDisplayOrder((int) repository.countByBranchId(branchId) + 1);
        apply(c, req);
        c = repository.save(c);
        auditService.log("CASH_CATEGORY_CREATE", "PosCashMovementCategory", c.getId(), c.getCode(), null, null,
                describe(c), null, null);
        return toDto(c);
    }

    public CashCategoryDTO update(Long id, PosRequests.CashCategory req) {
        Long branchId = support.requireBranch();
        PosCashMovementCategory c = find(id);
        String name = trimToNull(req.name());
        if (name != null && !name.equalsIgnoreCase(c.getName())) {
            if (repository.findFirstByBranchIdAndNameIgnoreCase(branchId, name).isPresent()) {
                throw new BusinessRuleViolationException("A cash category named \"" + name + "\" already exists.");
            }
        }
        if (name != null) c.setName(name);
        if (trimToNull(req.code()) != null && !req.code().trim().equalsIgnoreCase(c.getCode())) {
            c.setCode(uniqueCode(branchId, req.code(), c.getId()));
        }
        apply(c, req);
        c = repository.save(c);
        auditService.log("CASH_CATEGORY_UPDATE", "PosCashMovementCategory", c.getId(), c.getCode(), null, null,
                describe(c), null, null);
        return toDto(c);
    }

    public CashCategoryDTO setActive(Long id, boolean active) {
        support.requireBranch();
        PosCashMovementCategory c = find(id);
        c.setActive(active);
        c = repository.save(c);
        auditService.log(active ? "CASH_CATEGORY_ACTIVATE" : "CASH_CATEGORY_DEACTIVATE", "PosCashMovementCategory",
                c.getId(), c.getCode(), null, null, c.getName(), null, null);
        return toDto(c);
    }

    /** Settings saves that still send plain label lists: make sure each label exists and is active. */
    public void ensureNames(String movementType, List<String> names) {
        Long branchId = BranchContextHolder.getActiveBranchId();
        if (branchId == null || names == null) return;
        ensureSeeded(branchId);
        for (String raw : names) {
            String name = trimToNull(raw);
            if (name == null) continue;
            PosCashMovementCategory c = repository.findFirstByBranchIdAndNameIgnoreCase(branchId, name).orElse(null);
            if (c == null) {
                c = new PosCashMovementCategory();
                c.setBranchId(branchId);
                c.setCode(uniqueCode(branchId, name, null));
                c.setName(name);
                c.setMovementType(movementType);
                c.setDisplayOrder((int) repository.countByBranchId(branchId) + 1);
            } else {
                if (!c.appliesTo(movementType)) c.setMovementType(PosCashMovementCategory.BOTH);
                c.setActive(true);
            }
            repository.save(c);
        }
    }

    PosCashMovementCategory find(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Cash category not found with id: " + id));
    }

    // ── Internals ───────────────────────────────────────────────────────────

    /** First use in a branch: copy its settings labels (or the defaults) into managed categories. */
    void ensureSeeded(Long branchId) {
        if (repository.countByBranchId(branchId) > 0) return;
        PosSettings settings = settingsService.current();
        Map<String, String> byName = new LinkedHashMap<>();
        for (String n : settingsService.cashInCategories(settings)) byName.put(n.trim(), PosCashMovementCategory.DROP_IN);
        for (String n : settingsService.cashOutCategories(settings)) {
            String key = byName.keySet().stream().filter(k -> k.equalsIgnoreCase(n.trim())).findFirst().orElse(null);
            if (key != null) byName.put(key, PosCashMovementCategory.BOTH);
            else byName.put(n.trim(), PosCashMovementCategory.CASH_OUT);
        }
        int order = 1;
        List<PosCashMovementCategory> rows = new ArrayList<>();
        List<String> codes = new ArrayList<>();
        for (Map.Entry<String, String> e : byName.entrySet()) {
            if (e.getKey().isEmpty()) continue;
            PosCashMovementCategory c = new PosCashMovementCategory();
            c.setBranchId(branchId);
            String code = slug(e.getKey());
            String base = code;
            for (int i = 2; codes.contains(code); i++) code = base + "_" + i;
            codes.add(code);
            c.setCode(code);
            c.setName(e.getKey());
            c.setMovementType(e.getValue());
            c.setDisplayOrder(order++);
            // "Other" needs an explanation, as it says nothing on its own.
            c.setNotesRequired("other".equalsIgnoreCase(e.getKey()));
            rows.add(c);
        }
        repository.saveAll(rows);
    }

    private void apply(PosCashMovementCategory c, PosRequests.CashCategory req) {
        if (req.description() != null) c.setDescription(trimToNull(req.description()));
        if (req.movementType() != null) {
            String t = req.movementType().trim().toUpperCase(Locale.ROOT);
            if (!TYPES.contains(t)) throw new BusinessRuleViolationException("Movement type must be DROP_IN, CASH_OUT or BOTH.");
            c.setMovementType(t);
        }
        if (req.accountCode() != null) {
            String code = trimToNull(req.accountCode());
            if (code == null) {
                c.setAccountCode(null);
                c.setAccountName(null);
            } else {
                AccountHead account = accountRepository.findFirstByCode(code)
                        .orElseThrow(() -> new BusinessRuleViolationException("No ledger account with code " + code + "."));
                if (Boolean.FALSE.equals(account.getIsActive())) {
                    throw new BusinessRuleViolationException("Ledger account " + code + " is inactive.");
                }
                if (com.company.project.services.FinancialEventService.ACC_CASH_IN_HAND.equals(code)) {
                    throw new BusinessRuleViolationException("Pick the account the cash comes from or goes to, not Cash in Hand itself.");
                }
                c.setAccountCode(account.getCode());
                c.setAccountName(account.getName());
            }
        }
        if (req.displayOrder() != null) c.setDisplayOrder(req.displayOrder());
        if (req.notesRequired() != null) c.setNotesRequired(req.notesRequired());
        if (req.approvalRequired() != null) c.setApprovalRequired(req.approvalRequired());
        if (req.active() != null) c.setActive(req.active());
    }

    private String uniqueCode(Long branchId, String raw, Long selfId) {
        String base = slug(raw);
        String code = base;
        for (int i = 2; ; i++) {
            var hit = repository.findFirstByBranchIdAndCodeIgnoreCase(branchId, code);
            if (hit.isEmpty() || hit.get().getId().equals(selfId)) return code;
            code = base + "_" + i;
        }
    }

    static String slug(String raw) {
        String s = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
        if (s.isEmpty()) s = "CATEGORY";
        return s.length() > 36 ? s.substring(0, 36) : s;
    }

    private static String describe(PosCashMovementCategory c) {
        return c.getName() + " (" + c.getMovementType() + ")"
                + (c.getAccountCode() != null ? " → " + c.getAccountCode() + " " + c.getAccountName() : "")
                + (Boolean.TRUE.equals(c.getApprovalRequired()) ? ", approval" : "")
                + (Boolean.TRUE.equals(c.getNotesRequired()) ? ", notes" : "");
    }

    static CashCategoryDTO toDto(PosCashMovementCategory c) {
        return new CashCategoryDTO(c.getId(), c.getCode(), c.getName(), c.getDescription(), c.getMovementType(),
                c.getAccountCode(), c.getAccountName(), c.getDisplayOrder(), c.getNotesRequired(),
                c.getApprovalRequired(), c.getActive());
    }
}
