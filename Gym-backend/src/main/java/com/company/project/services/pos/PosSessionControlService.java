package com.company.project.services.pos;

import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.DayStatus;
import com.company.project.dto.pos.PosResponses.SessionDTO;
import com.company.project.entities.PosSession;
import com.company.project.entities.PosSettings;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.PosDayCloseRepository;
import com.company.project.repositories.PosSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static com.company.project.services.pos.PosSupport.trimToNull;

/**
 * Session lifecycle controls beyond open / close (BillBull parity):
 * <ul>
 *   <li>Suspend / resume — a cashier steps away without closing; nothing can be sold on a
 *       suspended session.</li>
 *   <li>Supervisor takeover — another user continues a session (shift handover, cashier gone home).</li>
 *   <li>Closing workflow — "Close Session" first marks the session as closing, which stops selling;
 *       only a supervisor can cancel that and put the till back into service.</li>
 *   <li>Heartbeat — the terminal reports activity so Live Sessions shows idle tills.</li>
 *   <li>Day status — the business-day phase, a pending Day Close, and sessions left open on a day
 *       that has ended.</li>
 * </ul>
 */
@Service
@Transactional
public class PosSessionControlService {

    static final List<String> CURRENT = List.of("OPEN", "SUSPENDED");

    private final PosSessionRepository sessionRepo;
    private final PosDayCloseRepository dayCloseRepo;
    private final PosBusinessDayService businessDay;
    private final PosSettingsService settingsService;
    private final PosAuditService auditService;
    private final PosSupport support;
    private final PosMapper mapper;

    public PosSessionControlService(PosSessionRepository sessionRepo, PosDayCloseRepository dayCloseRepo,
                                    PosBusinessDayService businessDay, PosSettingsService settingsService,
                                    PosAuditService auditService, PosSupport support, PosMapper mapper) {
        this.sessionRepo = sessionRepo;
        this.dayCloseRepo = dayCloseRepo;
        this.businessDay = businessDay;
        this.settingsService = settingsService;
        this.auditService = auditService;
        this.support = support;
        this.mapper = mapper;
    }

    // ── Suspend / resume ────────────────────────────────────────────────────

    public SessionDTO suspend(Long id) {
        support.requireBranch();
        PosSession s = find(id);
        requireOwnerOrSupervisor(s, "suspend");
        if (!"OPEN".equals(s.getStatus())) throw new BusinessRuleViolationException("Only an open session can be suspended.");
        s.setStatus("SUSPENDED");
        s.setSuspendedAt(LocalDateTime.now());
        s.setSuspendedBy(support.currentUsername());
        s = sessionRepo.save(s);
        auditService.log("SESSION_SUSPEND", "PosSession", s.getId(), s.getSessionNumber(), s.getId(), null,
                "Session suspended", null, s.getTerminalName());
        return mapper.session(s);
    }

    public SessionDTO resume(Long id) {
        support.requireBranch();
        PosSession s = find(id);
        requireOwnerOrSupervisor(s, "resume");
        if (!"SUSPENDED".equals(s.getStatus())) throw new BusinessRuleViolationException("Only a suspended session can be resumed.");
        if (s.getClosingStartedAt() != null) {
            throw new BusinessRuleViolationException("Session " + s.getSessionNumber() + " is being closed — it can only be closed now.");
        }
        assertSameTradingDay(s);
        assertDayOpen();
        s.setStatus("OPEN");
        s.setSuspendedAt(null);
        s.setSuspendedBy(null);
        s.setLastActivityAt(LocalDateTime.now());
        s = sessionRepo.save(s);
        auditService.log("SESSION_RESUME", "PosSession", s.getId(), s.getSessionNumber(), s.getId(), null,
                "Session resumed", null, s.getTerminalName());
        return mapper.session(s);
    }

    // ── Takeover ────────────────────────────────────────────────────────────

    /** The caller becomes the session's owner. Needs a supervisor (or the supervisor PIN). */
    public SessionDTO takeover(Long id, PosRequests.SupervisorAction req) {
        support.requireBranch();
        PosSession s = find(id);
        if ("CLOSED".equals(s.getStatus())) throw new BusinessRuleViolationException("Session " + s.getSessionNumber() + " is already closed.");
        String me = support.currentUsername();
        if (me.equals(s.getOpenedBy())) throw new BusinessRuleViolationException("This is already your session.");
        sessionRepo.findFirstByStatusInAndOpenedByOrderByOpenedAtDesc(CURRENT, me).ifPresent(mine -> {
            throw new BusinessRuleViolationException("You already have session " + mine.getSessionNumber()
                    + ". Close it before taking over another one.");
        });
        PosSettings settings = settingsService.current();
        String approvedBy = support.approve(settings, true, req == null ? null : req.supervisorPin(),
                "taking over " + (s.getOpenedBy() != null ? s.getOpenedBy() + "'s" : "this") + " session");
        String previous = s.getOpenedBy();
        s.setTakenOverFrom(previous);
        s.setOpenedBy(me);
        s.setStaffName(support.currentDisplayName());
        s.setLastActivityAt(LocalDateTime.now());
        s = sessionRepo.save(s);
        auditService.log("SESSION_TAKEOVER", "PosSession", s.getId(), s.getSessionNumber(), s.getId(), null,
                "Taken over from " + previous + (req != null && trimToNull(req.reason()) != null ? " — " + req.reason().trim() : ""),
                approvedBy, s.getTerminalName());
        return mapper.session(s);
    }

    // ── Closing workflow ────────────────────────────────────────────────────

    /** Marks the session as closing (idempotent). Selling stops; X-Report and close stay available. */
    public SessionDTO beginClosure(Long id) {
        support.requireBranch();
        PosSession s = find(id);
        requireOwnerOrSupervisor(s, "close");
        if ("CLOSED".equals(s.getStatus())) throw new BusinessRuleViolationException("Session " + s.getSessionNumber() + " is already closed.");
        if (s.getClosingStartedAt() != null) return mapper.session(s);
        s.setClosingStartedAt(LocalDateTime.now());
        s.setClosingStartedBy(support.currentUsername());
        s = sessionRepo.save(s);
        auditService.log("SESSION_CLOSING", "PosSession", s.getId(), s.getSessionNumber(), s.getId(), null,
                "Closing started", null, s.getTerminalName());
        return mapper.session(s);
    }

    /** Supervisor-only: puts a session that started closing back into service. */
    public SessionDTO cancelClosure(Long id, PosRequests.SupervisorAction req) {
        support.requireBranch();
        PosSession s = find(id);
        if (s.getClosingStartedAt() == null) throw new BusinessRuleViolationException("Session " + s.getSessionNumber() + " is not being closed.");
        if ("CLOSED".equals(s.getStatus())) throw new BusinessRuleViolationException("Session " + s.getSessionNumber() + " is already closed.");
        String approvedBy = support.approve(settingsService.current(), true, req == null ? null : req.supervisorPin(),
                "cancelling a session close");
        String startedBy = s.getClosingStartedBy();
        s.setClosingStartedAt(null);
        s.setClosingStartedBy(null);
        s = sessionRepo.save(s);
        auditService.log("SESSION_CLOSING_CANCEL", "PosSession", s.getId(), s.getSessionNumber(), s.getId(), null,
                "Close started by " + startedBy + " cancelled"
                        + (req != null && trimToNull(req.reason()) != null ? " — " + req.reason().trim() : ""),
                approvedBy, s.getTerminalName());
        return mapper.session(s);
    }

    // ── Heartbeat ───────────────────────────────────────────────────────────

    public void touch(Long id) {
        PosSession s = find(id);
        if (!"OPEN".equals(s.getStatus()) || !support.currentUsername().equals(s.getOpenedBy())) return;
        s.setLastActivityAt(LocalDateTime.now());
        sessionRepo.save(s);
    }

    // ── Day status ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public DayStatus dayStatus() {
        PosBusinessDayService.Window w = businessDay.window();
        LocalDate trading = w.tradingDate();
        boolean dayClosed = dayCloseRepo.findFirstByBusinessDate(trading).isPresent();
        // Once the window has closed, today's own sessions also need closing before the Day Close.
        LocalDate pendingBefore = w.closed() || dayClosed ? trading.plusDays(1) : trading;
        LocalDate pending = sessionRepo.firstUnclosedDayBefore(pendingBefore);
        if (pending != null && pending.equals(trading) && dayClosed) pending = null;

        List<PosSession> current = sessionRepo.findByStatusInOrderByOpenedAtDesc(CURRENT);
        List<PosSession> needClosing = current.stream().filter(s -> {
            LocalDate bd = s.getBusinessDate();
            return bd != null && (bd.isBefore(trading) || (w.closed() && !bd.isAfter(trading)));
        }).toList();
        Optional<PosSession> mine = sessionRepo.findFirstByStatusInAndOpenedByOrderByOpenedAtDesc(CURRENT, support.currentUsername());

        return new DayStatus(w.zone().getId(), trading, w.phase().name(), w.start(), w.scheduledEnd(), w.closesAt(), w.nextStart(),
                dayClosed, pending, mapper.sessions(needClosing), mine.map(mapper::session).orElse(null));
    }

    // ── Gates used by selling / opening ─────────────────────────────────────

    /** Refuses new sessions and sales once the business-day window has closed. */
    public void assertDayOpen() {
        PosBusinessDayService.Window w = businessDay.window();
        if (w.closed()) {
            throw new BusinessRuleViolationException("The business day closed at "
                    + PosBusinessDayService.localTime(w.closesAt(), w.zone())
                    + ". Close open sessions and run the Day Close; trading resumes at "
                    + PosBusinessDayService.localTime(w.nextStart(), w.zone()) + ".");
        }
    }

    private void assertSameTradingDay(PosSession s) {
        LocalDate trading = support.today();
        if (s.getBusinessDate() != null && s.getBusinessDate().isBefore(trading)) {
            throw new BusinessRuleViolationException("Session " + s.getSessionNumber() + " is from business day "
                    + s.getBusinessDate() + ". Close it (X-Report) before selling on " + trading + ".");
        }
    }

    private void requireOwnerOrSupervisor(PosSession s, String action) {
        if (s.getOpenedBy() != null && !s.getOpenedBy().equals(support.currentUsername()) && !support.isSupervisor()) {
            throw new BusinessRuleViolationException("Only " + s.getOpenedBy() + " or a supervisor can " + action
                    + " session " + s.getSessionNumber() + ".");
        }
    }

    private PosSession find(Long id) {
        return sessionRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("POS session not found with id: " + id));
    }
}
