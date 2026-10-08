package com.company.project.services.pos;

import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.*;
import com.company.project.entities.PosCounter;
import com.company.project.entities.PosPrinter;
import com.company.project.entities.PosSession;
import com.company.project.entities.PosSessionTerminalHistory;
import com.company.project.entities.PosSettings;
import com.company.project.entities.PosTerminal;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.PosCounterRepository;
import com.company.project.repositories.PosPrinterRepository;
import com.company.project.repositories.PosSessionRepository;
import com.company.project.repositories.PosSessionTerminalHistoryRepository;
import com.company.project.repositories.PosTerminalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

import static com.company.project.services.pos.PosSupport.trimToNull;

/**
 * POS terminals and counters (BillBull's PosTerminalService / PosCounterService, trimmed to what a
 * gym front desk needs). A browser registers itself once (terminal code kept in the browser, device
 * fingerprint as the fallback); new devices can be held for a supervisor's approval. Supervisors
 * rename terminals, pick the main one, assign counters, put a terminal into maintenance or block
 * it, archive (restorable) or decommission it (permanent). A terminal runs at most one open session;
 * moving a session to another terminal is an explicit, supervisor-approved transfer.
 */
@Service
@Transactional
public class PosTerminalService {

    public static final String PENDING = "PENDING";
    public static final String ACTIVE = "ACTIVE";
    public static final String MAINTENANCE = "MAINTENANCE";
    public static final String BLOCKED = "BLOCKED";
    public static final String ARCHIVED = "ARCHIVED";
    public static final String DECOMMISSIONED = "DECOMMISSIONED";
    /** Statuses that no longer hold one of the branch's terminal slots. */
    private static final List<String> RETIRED = List.of(ARCHIVED, DECOMMISSIONED);
    private static final List<String> SESSION_HOLDING = List.of("OPEN", "SUSPENDED");

    private final PosTerminalRepository repository;
    private final PosCounterRepository counterRepository;
    private final PosSessionRepository sessionRepository;
    private final PosSessionTerminalHistoryRepository historyRepository;
    private final PosPrinterRepository printerRepository;
    private final PosSettingsService settingsService;
    private final PosAuditService auditService;
    private final PosSupport support;
    private final PosMapper mapper;

    /** Optional (absent in unit tests): hardware profiles. */
    private PosDeviceService deviceService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setDeviceService(@org.springframework.context.annotation.Lazy PosDeviceService deviceService) {
        this.deviceService = deviceService;
    }

    public PosTerminalService(PosTerminalRepository repository, PosCounterRepository counterRepository,
                              PosSessionRepository sessionRepository, PosSessionTerminalHistoryRepository historyRepository,
                              PosPrinterRepository printerRepository, PosSettingsService settingsService,
                              PosAuditService auditService, PosSupport support, PosMapper mapper) {
        this.repository = repository;
        this.counterRepository = counterRepository;
        this.sessionRepository = sessionRepository;
        this.historyRepository = historyRepository;
        this.printerRepository = printerRepository;
        this.settingsService = settingsService;
        this.auditService = auditService;
        this.support = support;
        this.mapper = mapper;
    }

    // ── Registration / heartbeat ────────────────────────────────────────────

    /**
     * Registers this browser as a terminal, or recognises it again (by its code, then by its
     * fingerprint). Returns retired / blocked terminals too, so the till can say why it can't sell.
     */
    public TerminalRegistration register(PosRequests.TerminalRegister req, String ipAddress) {
        Long branchId = support.requireBranch();
        String code = trimToNull(req.terminalCode());
        String fingerprint = trimToNull(req.deviceFingerprint());

        PosTerminal t = null;
        if (code != null) {
            t = repository.findFirstByTerminalCode(code)
                    .filter(x -> branchId.equals(x.getBranchId()))
                    .filter(x -> !DECOMMISSIONED.equals(x.getStatus()))
                    .filter(x -> fingerprint == null || x.getDeviceFingerprint() == null || fingerprint.equals(x.getDeviceFingerprint()))
                    .orElse(null);
        }
        if (t == null && fingerprint != null) {
            t = repository.findFirstByDeviceFingerprintAndBranchIdAndStatusNotOrderByIdDesc(fingerprint, branchId, DECOMMISSIONED)
                    .orElse(null);
        }
        if (t != null) {
            touch(t, req, ipAddress);
            t = repository.save(t);
            return new TerminalRegistration(dto(t), false, PENDING.equals(t.getStatus()));
        }

        PosSettings settings = settingsService.current();
        int max = settings.getMaxTerminals() == null ? 10 : settings.getMaxTerminals();
        long inUse = repository.countByBranchIdAndStatusNotIn(branchId, RETIRED);
        if (inUse >= max) {
            throw new BusinessRuleViolationException("This branch already has the maximum of " + max
                    + " terminals. Archive an unused terminal, or raise the limit in POS Console › Terminals.");
        }
        long seq = repository.countByBranchId(branchId) + 1;
        t = new PosTerminal();
        t.setBranchId(branchId);
        t.setTerminalCode(String.format("T%03d-%s", seq, UUID.randomUUID().toString().substring(0, 4).toUpperCase(Locale.ROOT)));
        t.setName(Optional.ofNullable(trimToNull(req.name())).orElse("Terminal " + seq));
        t.setDeviceFingerprint(fingerprint);
        t.setRegisteredBy(support.currentUsername());
        boolean needsApproval = Boolean.TRUE.equals(settings.getRequireTerminalApproval()) && !support.isSupervisor();
        t.setStatus(needsApproval ? PENDING : ACTIVE);
        if (!needsApproval) {
            t.setApprovedBy(Boolean.TRUE.equals(settings.getRequireTerminalApproval()) ? support.currentUsername() : null);
            t.setApprovedAt(LocalDateTime.now());
        }
        t.setIsMain(!needsApproval && mainOf(branchId).isEmpty());
        touch(t, req, ipAddress);
        t = repository.save(t);
        auditService.log("TERMINAL_REGISTER", "PosTerminal", t.getId(), t.getTerminalCode(), null, null,
                t.getName() + (needsApproval ? " — waiting for approval" : "") + describeDevice(t), null, t.getName());
        return new TerminalRegistration(dto(t), true, needsApproval);
    }

    public TerminalDTO heartbeat(String code, String ipAddress) {
        PosTerminal t = byCode(code);
        LocalDateTime now = LocalDateTime.now();
        t.setLastHeartbeatAt(now);
        t.setLastSeenAt(now);
        t.setLastUser(support.currentUsername());
        if (trimToNull(ipAddress) != null) t.setIpAddress(ipAddress);
        return dto(repository.save(t));
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TerminalDTO> list(boolean includeRetired) {
        Long branchId = support.requireBranch();
        return repository.findByBranchIdOrderByIdAsc(branchId).stream()
                .filter(t -> includeRetired || !RETIRED.contains(t.getStatus()))
                .sorted(Comparator.comparing((PosTerminal t) -> !Boolean.TRUE.equals(t.getIsMain()))
                        .thenComparing(t -> RETIRED.contains(t.getStatus()))
                        .thenComparing(PosTerminal::getName, String.CASE_INSENSITIVE_ORDER))
                .map(this::dto).toList();
    }

    @Transactional(readOnly = true)
    public TerminalDTO get(Long id) {
        return dto(find(id));
    }

    @Transactional(readOnly = true)
    public List<SessionTerminalHistoryDTO> sessionHistory(Long sessionId) {
        return historyRepository.findBySessionIdOrderByStartedAtAsc(sessionId).stream()
                .map(h -> new SessionTerminalHistoryDTO(h.getId(), h.getTerminalId(), h.getTerminalName(), h.getStartedAt(),
                        h.getEndedAt(), h.getMovedBy(), h.getApprovedBy(), h.getReason()))
                .toList();
    }

    // ── Supervisor actions ──────────────────────────────────────────────────

    public TerminalDTO approve(Long id) {
        PosTerminal t = find(id);
        if (!PENDING.equals(t.getStatus())) throw new BusinessRuleViolationException(t.getName() + " is not waiting for approval.");
        t.setStatus(ACTIVE);
        t.setApprovedBy(support.currentUsername());
        t.setApprovedAt(LocalDateTime.now());
        t.setStatusReason(null);
        if (mainOf(t.getBranchId()).isEmpty()) t.setIsMain(true);
        t = repository.save(t);
        log("TERMINAL_APPROVE", t, "Approved");
        return dto(t);
    }

    /** A rejected device is retired; it can register again as a new terminal. */
    public TerminalDTO reject(Long id, String reason) {
        PosTerminal t = find(id);
        if (!PENDING.equals(t.getStatus())) throw new BusinessRuleViolationException(t.getName() + " is not waiting for approval.");
        t.setStatus(DECOMMISSIONED);
        t.setDecommissionedAt(LocalDateTime.now());
        t.setRejectionReason(trimToNull(reason));
        t.setStatusReason(Optional.ofNullable(trimToNull(reason)).orElse("Registration rejected"));
        t = repository.save(t);
        log("TERMINAL_REJECT", t, t.getStatusReason());
        return dto(t);
    }

    public TerminalDTO update(Long id, PosRequests.TerminalUpdate req) {
        PosTerminal t = find(id);
        assertNotRetired(t);
        List<String> changes = new ArrayList<>();
        String name = trimToNull(req.name());
        if (name != null && !name.equals(t.getName())) {
            if (name.length() > 100) throw new BusinessRuleViolationException("Terminal names are at most 100 characters.");
            boolean taken = repository.findByBranchIdOrderByIdAsc(t.getBranchId()).stream()
                    .anyMatch(x -> !x.getId().equals(t.getId()) && !RETIRED.contains(x.getStatus()) && name.equalsIgnoreCase(x.getName()));
            if (taken) throw new BusinessRuleViolationException("Another terminal is already called \"" + name + "\".");
            String old = t.getName();
            t.setName(name);
            // Printers are assigned to terminals by name; keep them attached, and the open session's label.
            for (PosPrinter p : printerRepository.findAll()) {
                if (old.equals(p.getTerminalName())) {
                    p.setTerminalName(name);
                    printerRepository.save(p);
                }
            }
            if (t.getCurrentSessionId() != null) {
                sessionRepository.findById(t.getCurrentSessionId()).ifPresent(s -> {
                    s.setTerminalName(name);
                    sessionRepository.save(s);
                });
            }
            changes.add("renamed " + old + " → " + name);
        }
        if (Boolean.TRUE.equals(req.clearCounter())) {
            t.setCounterId(null);
            t.setCounterName(null);
            changes.add("counter cleared");
        } else if (req.counterId() != null && !req.counterId().equals(t.getCounterId())) {
            PosCounter c = counterRepository.findById(req.counterId())
                    .orElseThrow(() -> new EntityNotFoundException("Counter not found with id: " + req.counterId()));
            if (!ACTIVE.equals(c.getStatus())) throw new BusinessRuleViolationException("Counter " + c.getName() + " is inactive.");
            t.setCounterId(c.getId());
            t.setCounterName(c.getName());
            changes.add("assigned to " + c.getName());
        }
        PosTerminal saved = repository.save(t);
        if (!changes.isEmpty()) log("TERMINAL_UPDATE", saved, String.join("; ", changes));
        return dto(saved);
    }

    public TerminalDTO setStatus(Long id, PosRequests.TerminalStatus req) {
        PosTerminal t = find(id);
        String status = req.status() == null ? "" : req.status().trim().toUpperCase(Locale.ROOT);
        if (!List.of(ACTIVE, MAINTENANCE, BLOCKED).contains(status)) {
            throw new BusinessRuleViolationException("Status must be ACTIVE, MAINTENANCE or BLOCKED.");
        }
        if (PENDING.equals(t.getStatus())) throw new BusinessRuleViolationException("Approve or reject " + t.getName() + " first.");
        assertNotRetired(t);
        if (status.equals(t.getStatus())) return dto(t);
        if (BLOCKED.equals(status)) {
            Optional<PosSession> s = openSessionOn(t);
            if (s.isPresent()) {
                throw new BusinessRuleViolationException(t.getName() + " has session " + s.get().getSessionNumber()
                        + " open. Transfer or close it before blocking the terminal.");
            }
            if (Boolean.TRUE.equals(t.getIsMain())) throw new BusinessRuleViolationException("Make another terminal the main one before blocking " + t.getName() + ".");
        }
        String reason = trimToNull(req.reason());
        if (!ACTIVE.equals(status) && reason == null) throw new BusinessRuleViolationException("Give a reason.");
        t.setStatus(status);
        t.setStatusReason(ACTIVE.equals(status) ? null : reason);
        t = repository.save(t);
        log("TERMINAL_STATUS", t, status + (reason != null ? " — " + reason : ""));
        return dto(t);
    }

    public TerminalDTO setMain(Long id) {
        PosTerminal t = find(id);
        if (!ACTIVE.equals(t.getStatus())) throw new BusinessRuleViolationException("Only an active terminal can be the main terminal.");
        for (PosTerminal other : repository.findByBranchIdOrderByIdAsc(t.getBranchId())) {
            if (Boolean.TRUE.equals(other.getIsMain()) && !other.getId().equals(t.getId())) {
                other.setIsMain(false);
                repository.save(other);
            }
        }
        t.setIsMain(true);
        t = repository.save(t);
        log("TERMINAL_SET_MAIN", t, "Main terminal");
        return dto(t);
    }

    public TerminalDTO archive(Long id, String reason) {
        PosTerminal t = find(id);
        assertNotRetired(t);
        assertNoSession(t, "archiving");
        t.setStatus(ARCHIVED);
        t.setArchivedAt(LocalDateTime.now());
        t.setStatusReason(Optional.ofNullable(trimToNull(reason)).orElse("Archived"));
        handOverMain(t);
        t = repository.save(t);
        log("TERMINAL_ARCHIVE", t, t.getStatusReason());
        return dto(t);
    }

    public TerminalDTO restore(Long id) {
        PosTerminal t = find(id);
        if (!ARCHIVED.equals(t.getStatus())) throw new BusinessRuleViolationException("Only an archived terminal can be restored.");
        PosSettings settings = settingsService.current();
        int max = settings.getMaxTerminals() == null ? 10 : settings.getMaxTerminals();
        if (repository.countByBranchIdAndStatusNotIn(t.getBranchId(), RETIRED) >= max) {
            throw new BusinessRuleViolationException("The branch is at its limit of " + max + " terminals — archive another one first.");
        }
        t.setStatus(ACTIVE);
        t.setArchivedAt(null);
        t.setStatusReason(null);
        if (mainOf(t.getBranchId()).isEmpty()) t.setIsMain(true);
        t = repository.save(t);
        log("TERMINAL_RESTORE", t, "Restored");
        return dto(t);
    }

    /** Permanent: the device has to register again as a new terminal. */
    public TerminalDTO decommission(Long id, String reason) {
        PosTerminal t = find(id);
        if (DECOMMISSIONED.equals(t.getStatus())) throw new BusinessRuleViolationException(t.getName() + " is already decommissioned.");
        String why = trimToNull(reason);
        if (why == null) throw new BusinessRuleViolationException("Give a reason for decommissioning " + t.getName() + ".");
        assertNoSession(t, "decommissioning");
        t.setStatus(DECOMMISSIONED);
        t.setDecommissionedAt(LocalDateTime.now());
        t.setStatusReason(why);
        handOverMain(t);
        t = repository.save(t);
        log("TERMINAL_DECOMMISSION", t, why);
        return dto(t);
    }

    // ── Sessions on terminals ───────────────────────────────────────────────

    /** The terminal a new session opens on: must be approved, active and free. */
    public PosTerminal claimForNewSession(String code) {
        PosTerminal t = byCode(code);
        switch (t.getStatus()) {
            case PENDING -> throw new BusinessRuleViolationException(t.getName() + " is waiting for a supervisor to approve it (POS Console › Terminals).");
            case MAINTENANCE -> throw new BusinessRuleViolationException(t.getName() + " is under maintenance — no new sessions"
                    + (t.getStatusReason() != null ? " (" + t.getStatusReason() + ")" : "") + ".");
            case BLOCKED, ARCHIVED, DECOMMISSIONED -> throw new BusinessRuleViolationException(t.getName() + " is "
                    + t.getStatus().toLowerCase(Locale.ROOT) + " and can't be used for selling.");
            default -> { }
        }
        Optional<PosSession> busy = openSessionOn(t);
        if (busy.isPresent()) {
            throw new BusinessRuleViolationException(t.getName() + " already has session " + busy.get().getSessionNumber()
                    + " (" + busy.get().getOpenedBy() + ") open. Use another terminal, or ask a supervisor to transfer that session.");
        }
        return t;
    }

    public void attach(PosSession s, PosTerminal t, String reason, String approvedBy) {
        LocalDateTime now = LocalDateTime.now();
        historyRepository.findFirstBySessionIdAndEndedAtIsNullOrderByStartedAtDesc(s.getId()).ifPresent(h -> {
            h.setEndedAt(now);
            historyRepository.save(h);
        });
        s.setTerminalId(t.getId());
        s.setTerminalName(t.getName());
        s.setCounterName(t.getCounterName());
        t.setCurrentSessionId(s.getId());
        t.setLastUser(s.getOpenedBy());
        repository.save(t);
        PosSessionTerminalHistory h = new PosSessionTerminalHistory();
        h.setBranchId(s.getBranchId() != null ? s.getBranchId() : t.getBranchId());
        h.setSessionId(s.getId());
        h.setTerminalId(t.getId());
        h.setTerminalName(t.getName());
        h.setStartedAt(now);
        h.setMovedBy(support.currentUsername());
        h.setApprovedBy(approvedBy);
        h.setReason(reason);
        historyRepository.save(h);
    }

    /** A session closed: its terminal is free again. */
    public void release(PosSession s) {
        if (s.getTerminalId() == null) return;
        repository.findById(s.getTerminalId()).ifPresent(t -> {
            if (s.getId().equals(t.getCurrentSessionId())) {
                t.setCurrentSessionId(null);
                repository.save(t);
            }
        });
        historyRepository.findFirstBySessionIdAndEndedAtIsNullOrderByStartedAtDesc(s.getId()).ifPresent(h -> {
            h.setEndedAt(LocalDateTime.now());
            historyRepository.save(h);
        });
    }

    /** Refuses selling on a terminal that has been blocked or retired since the session opened. */
    public void assertCanSell(PosSession s) {
        if (s.getTerminalId() == null) return;
        repository.findById(s.getTerminalId()).ifPresent(t -> {
            if (BLOCKED.equals(t.getStatus()) || RETIRED.contains(t.getStatus())) {
                throw new BusinessRuleViolationException(t.getName() + " is " + t.getStatus().toLowerCase(Locale.ROOT)
                        + ". Ask a supervisor to transfer session " + s.getSessionNumber() + " to another terminal.");
            }
        });
    }

    /** BillBull session roaming: move an open session to another (free, active) terminal. */
    public SessionDTO transfer(Long sessionId, PosRequests.SessionTransfer req) {
        support.requireBranch();
        if (!Boolean.TRUE.equals(req.confirm())) throw new BusinessRuleViolationException("Confirm the transfer.");
        PosSession s = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("POS session not found with id: " + sessionId));
        if (!SESSION_HOLDING.contains(s.getStatus())) throw new BusinessRuleViolationException("Only an open session can be transferred.");
        if (s.getClosingStartedAt() != null) throw new BusinessRuleViolationException(s.getSessionNumber() + " is being closed.");
        if (s.getOpenedBy() != null && !s.getOpenedBy().equals(support.currentUsername()) && !support.isSupervisor()) {
            throw new BusinessRuleViolationException("Session " + s.getSessionNumber() + " belongs to " + s.getOpenedBy() + ".");
        }
        String reason = trimToNull(req.reason());
        if (reason == null) throw new BusinessRuleViolationException("Give a reason for the transfer.");
        PosTerminal dest = req.destinationTerminalId() != null ? find(req.destinationTerminalId()) : byCode(req.destinationTerminalCode());
        if (dest.getId().equals(s.getTerminalId())) throw new BusinessRuleViolationException("The session is already on " + dest.getName() + ".");
        if (!ACTIVE.equals(dest.getStatus())) {
            throw new BusinessRuleViolationException(dest.getName() + " is " + dest.getStatus().toLowerCase(Locale.ROOT) + " — pick an active terminal.");
        }
        openSessionOn(dest).ifPresent(other -> {
            throw new BusinessRuleViolationException(dest.getName() + " already has session " + other.getSessionNumber() + " open.");
        });
        String approvedBy = support.approve(settingsService.current(), true, req.supervisorPin(), "moving a session to another terminal");

        String from = s.getTerminalName();
        if (s.getTerminalId() != null) {
            repository.findById(s.getTerminalId()).ifPresent(old -> {
                if (s.getId().equals(old.getCurrentSessionId())) {
                    old.setCurrentSessionId(null);
                    repository.save(old);
                }
            });
        }
        attach(s, dest, reason, approvedBy);
        PosSession saved = sessionRepository.save(s);
        auditService.log("SESSION_TRANSFER", "PosSession", saved.getId(), saved.getSessionNumber(), saved.getId(), null,
                (from != null ? from : "(no terminal)") + " → " + dest.getName() + " | " + reason, approvedBy, dest.getName());
        return mapper.session(saved);
    }

    // ── Counters ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CounterDTO> counters() {
        Long branchId = support.requireBranch();
        return counterRepository.findByBranchIdOrderByDisplayOrderAscNameAsc(branchId).stream().map(this::counterDto).toList();
    }

    public CounterDTO createCounter(PosRequests.Counter req) {
        Long branchId = support.requireBranch();
        String name = trimToNull(req.name());
        if (name == null) throw new BusinessRuleViolationException("Enter a counter name.");
        if (counterRepository.findFirstByBranchIdAndNameIgnoreCase(branchId, name).isPresent()) {
            throw new BusinessRuleViolationException("A counter named \"" + name + "\" already exists.");
        }
        PosCounter c = new PosCounter();
        c.setBranchId(branchId);
        c.setName(name);
        c.setCode(uniqueCounterCode(branchId, Optional.ofNullable(trimToNull(req.code())).orElse(name), null));
        c.setDescription(trimToNull(req.description()));
        c.setDisplayOrder(req.displayOrder() != null ? req.displayOrder() : (int) counterRepository.countByBranchId(branchId) + 1);
        c.setStatus(ACTIVE);
        c = counterRepository.save(c);
        auditService.log("COUNTER_CREATE", "PosCounter", c.getId(), c.getCode(), null, null, c.getName(), null, null);
        return counterDto(c);
    }

    public CounterDTO updateCounter(Long id, PosRequests.Counter req) {
        PosCounter c = counterRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Counter not found with id: " + id));
        String name = trimToNull(req.name());
        if (name != null && !name.equalsIgnoreCase(c.getName())) {
            if (counterRepository.findFirstByBranchIdAndNameIgnoreCase(c.getBranchId(), name).isPresent()) {
                throw new BusinessRuleViolationException("A counter named \"" + name + "\" already exists.");
            }
        }
        if (name != null && !name.equals(c.getName())) {
            c.setName(name);
            for (PosTerminal t : repository.findByCounterId(c.getId())) {
                t.setCounterName(name);
                repository.save(t);
            }
        }
        if (trimToNull(req.code()) != null && !req.code().trim().equalsIgnoreCase(c.getCode())) {
            c.setCode(uniqueCounterCode(c.getBranchId(), req.code(), c.getId()));
        }
        if (req.description() != null) c.setDescription(trimToNull(req.description()));
        if (req.displayOrder() != null) c.setDisplayOrder(req.displayOrder());
        if (req.status() != null) {
            String st = req.status().trim().toUpperCase(Locale.ROOT);
            if (!List.of(ACTIVE, "INACTIVE").contains(st)) throw new BusinessRuleViolationException("Counter status must be ACTIVE or INACTIVE.");
            if ("INACTIVE".equals(st) && repository.countByCounterIdAndStatusNotIn(c.getId(), RETIRED) > 0) {
                throw new BusinessRuleViolationException("Move the terminals off " + c.getName() + " before deactivating it.");
            }
            c.setStatus(st);
        }
        c = counterRepository.save(c);
        auditService.log("COUNTER_UPDATE", "PosCounter", c.getId(), c.getCode(), null, null, c.getName() + " (" + c.getStatus() + ")", null, null);
        return counterDto(c);
    }

    // ── Internals ───────────────────────────────────────────────────────────

    private void touch(PosTerminal t, PosRequests.TerminalRegister req, String ipAddress) {
        LocalDateTime now = LocalDateTime.now();
        t.setLastSeenAt(now);
        t.setLastHeartbeatAt(now);
        t.setLastUser(support.currentUsername());
        if (trimToNull(req.deviceFingerprint()) != null && t.getDeviceFingerprint() == null) t.setDeviceFingerprint(req.deviceFingerprint().trim());
        if (trimToNull(req.deviceInfo()) != null) t.setDeviceInfo(cut(req.deviceInfo(), 500));
        if (trimToNull(req.operatingSystem()) != null) t.setOperatingSystem(cut(req.operatingSystem(), 100));
        if (trimToNull(req.browser()) != null) t.setBrowser(cut(req.browser(), 100));
        if (trimToNull(ipAddress) != null) t.setIpAddress(cut(ipAddress, 64));
    }

    private Optional<PosTerminal> mainOf(Long branchId) {
        return repository.findByBranchIdOrderByIdAsc(branchId).stream()
                .filter(t -> Boolean.TRUE.equals(t.getIsMain()) && !RETIRED.contains(t.getStatus())).findFirst();
    }

    /** A retiring main terminal passes "main" to the oldest other active terminal. */
    private void handOverMain(PosTerminal t) {
        if (!Boolean.TRUE.equals(t.getIsMain())) return;
        t.setIsMain(false);
        repository.findByBranchIdOrderByIdAsc(t.getBranchId()).stream()
                .filter(x -> !x.getId().equals(t.getId()) && ACTIVE.equals(x.getStatus()))
                .findFirst().ifPresent(x -> {
                    x.setIsMain(true);
                    repository.save(x);
                });
    }

    private Optional<PosSession> openSessionOn(PosTerminal t) {
        return sessionRepository.findFirstByTerminalIdAndStatusInOrderByOpenedAtDesc(t.getId(), SESSION_HOLDING);
    }

    private void assertNoSession(PosTerminal t, String what) {
        openSessionOn(t).ifPresent(s -> {
            throw new BusinessRuleViolationException(t.getName() + " has session " + s.getSessionNumber()
                    + " open. Close or transfer it before " + what + " the terminal.");
        });
    }

    private void assertNotRetired(PosTerminal t) {
        if (RETIRED.contains(t.getStatus())) {
            throw new BusinessRuleViolationException(t.getName() + " is " + t.getStatus().toLowerCase(Locale.ROOT) + ".");
        }
    }

    private PosTerminal find(Long id) {
        return repository.findById(id).orElseThrow(() -> new EntityNotFoundException("Terminal not found with id: " + id));
    }

    private PosTerminal byCode(String code) {
        String c = trimToNull(code);
        if (c == null) throw new BusinessRuleViolationException("This browser is not registered as a terminal yet.");
        return repository.findFirstByTerminalCode(c)
                .orElseThrow(() -> new EntityNotFoundException("Terminal " + c + " is not registered in this branch."));
    }

    private String uniqueCounterCode(Long branchId, String raw, Long selfId) {
        String base = PosCashCategoryService.slug(raw);
        String code = base;
        for (int i = 2; ; i++) {
            Optional<PosCounter> hit = counterRepository.findFirstByBranchIdAndCodeIgnoreCase(branchId, code);
            if (hit.isEmpty() || hit.get().getId().equals(selfId)) return code;
            code = base + "_" + i;
        }
    }

    private void log(String action, PosTerminal t, String details) {
        auditService.log(action, "PosTerminal", t.getId(), t.getTerminalCode(), t.getCurrentSessionId(), null,
                t.getName() + " · " + details, null, t.getName());
    }

    private static String describeDevice(PosTerminal t) {
        List<String> parts = new ArrayList<>();
        if (t.getBrowser() != null) parts.add(t.getBrowser());
        if (t.getOperatingSystem() != null) parts.add(t.getOperatingSystem());
        if (t.getIpAddress() != null) parts.add(t.getIpAddress());
        return parts.isEmpty() ? "" : " (" + String.join(", ", parts) + ")";
    }

    private static String cut(String s, int max) {
        String t = s.trim();
        return t.length() > max ? t.substring(0, max) : t;
    }

    private CounterDTO counterDto(PosCounter c) {
        return new CounterDTO(c.getId(), c.getCode(), c.getName(), c.getDescription(), c.getStatus(), c.getDisplayOrder(),
                repository.countByCounterIdAndStatusNotIn(c.getId(), RETIRED));
    }

    TerminalDTO dto(PosTerminal t) {
        PosSettings settings = settingsService.current();
        int threshold = settings.getOfflineThresholdMinutes() == null ? 15 : settings.getOfflineThresholdMinutes();
        LocalDateTime beat = t.getLastHeartbeatAt() != null ? t.getLastHeartbeatAt() : t.getLastSeenAt();
        boolean online = beat != null && beat.isAfter(LocalDateTime.now().minusMinutes(threshold));
        PosSession current = t.getCurrentSessionId() == null ? null
                : sessionRepository.findById(t.getCurrentSessionId()).filter(s -> SESSION_HOLDING.contains(s.getStatus())).orElse(null);
        boolean canSell = ACTIVE.equals(t.getStatus()) || (MAINTENANCE.equals(t.getStatus()) && current != null);
        return new TerminalDTO(t.getId(), t.getTerminalCode(), t.getName(), t.getCounterId(), t.getCounterName(),
                t.getDeviceInfo(), t.getOperatingSystem(), t.getBrowser(), t.getIpAddress(), Boolean.TRUE.equals(t.getIsMain()),
                t.getStatus(), online ? "ONLINE" : "OFFLINE", t.getStatusReason(), t.getRegisteredBy(), t.getApprovedBy(),
                t.getLastUser(), t.getLastSeenAt(), t.getLastHeartbeatAt(),
                current != null ? current.getId() : null, current != null ? current.getSessionNumber() : null,
                current != null ? Optional.ofNullable(current.getStaffName()).orElse(current.getOpenedBy()) : null,
                t.getCreatedAt(), t.getArchivedAt(), t.getDecommissionedAt(), canSell,
                t.getHardwareProfileId(), deviceService != null ? deviceService.profileName(t.getHardwareProfileId()) : null,
                deviceService != null ? deviceService.receiptPrinterOf(t.getHardwareProfileId()) : null);
    }
}
