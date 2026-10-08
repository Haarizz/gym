package com.company.project.services.pos;

import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.DayCloseDTO;
import com.company.project.dto.pos.PosResponses.ReportSummary;
import com.company.project.dto.pos.PosResponses.ZReport;
import com.company.project.entities.PosDayClose;
import com.company.project.entities.PosSession;
import com.company.project.entities.PosSettings;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.PosDayCloseRepository;
import com.company.project.repositories.PosSessionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

import static com.company.project.services.pos.PosSupport.*;

/**
 * Z-report day close (BillBull's POS › Z-Report › Close Day): once every session of
 * the business date is closed, the day's figures are frozen into a PosDayClose
 * snapshot and no new session can be opened for that date.
 */
@Service
@Transactional
public class PosDayCloseService {

    private final PosDayCloseRepository dayCloseRepo;
    private final PosSessionRepository sessionRepo;
    private final PosReportService reportService;
    private final PosSettingsService settingsService;
    private final PosAuditService auditService;
    private final PosSupport support;
    private final PosMapper mapper;
    private final ObjectMapper objectMapper;

    public PosDayCloseService(PosDayCloseRepository dayCloseRepo, PosSessionRepository sessionRepo,
                              PosReportService reportService, PosSettingsService settingsService,
                              PosAuditService auditService, PosSupport support, PosMapper mapper,
                              ObjectMapper objectMapper) {
        this.dayCloseRepo = dayCloseRepo;
        this.sessionRepo = sessionRepo;
        this.reportService = reportService;
        this.settingsService = settingsService;
        this.auditService = auditService;
        this.support = support;
        this.mapper = mapper;
        this.objectMapper = objectMapper;
    }

    public DayCloseDTO close(PosRequests.DayClose req) {
        support.requireBranch();
        LocalDate day = req.businessDate() != null ? req.businessDate() : support.today();
        PosSettings settings = settingsService.current();
        String approvedBy = support.approve(settings, !"ANY".equals(settings.getZReportAccess()), req.supervisorPin(),
                "closing the business day");

        ZReport z = reportService.zReport(day);
        if (!z.canClose()) {
            String why = z.checklist().stream().filter(c -> !c.ok() && !"HELD_SALES".equals(c.key()) && !"CASH_VARIANCE".equals(c.key()))
                    .map(c -> c.label() + ": " + c.detail()).collect(Collectors.joining("; "));
            throw new BusinessRuleViolationException("Day " + day + " cannot be closed yet — "
                    + (why.isBlank() ? "it is in the future." : why));
        }

        List<PosSession> sessions = sessionRepo.findByBusinessDateOrderByOpenedAtAsc(day);
        BigDecimal counted = sessions.stream().map(PosSession::getClosingCash).map(PosSupport::nz).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal expected = sessions.stream().map(PosSession::getExpectedCash).map(PosSupport::nz).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (req.countedCash() != null) counted = r2(req.countedCash());
        ReportSummary s = z.summary();

        PosDayClose dc = new PosDayClose();
        dc.setBusinessDate(day);
        dc.setSessionCount(sessions.size());
        dc.setInvoiceCount(s.invoiceCount());
        dc.setGrossSales(s.grossSales());
        dc.setTotalDiscount(s.totalDiscount());
        dc.setTotalTax(s.totalTax());
        dc.setNetSales(s.netSales());
        dc.setTotalReturns(s.returnTotal());
        dc.setExpectedCash(r2(expected));
        dc.setCountedCash(r2(counted));
        dc.setCashVariance(r2(counted.subtract(expected)));
        dc.setRemarks(trimToNull(req.remarks()));
        dc.setClosedBy(support.currentUsername());
        dc.setClosedAt(LocalDateTime.now());
        try {
            dc.setSummaryJson(objectMapper.writeValueAsString(z));
        } catch (Exception e) {
            dc.setSummaryJson(null);
        }
        dc = dayCloseRepo.save(dc);
        dc.setCloseNumber("DC-" + day.format(DateTimeFormatter.BASIC_ISO_DATE) + "-" + dc.getId());
        dc = dayCloseRepo.save(dc);

        for (PosSession session : sessions) {
            session.setDayCloseId(dc.getId());
            sessionRepo.save(session);
        }
        auditService.log("DAY_CLOSE", "PosDayClose", dc.getId(), dc.getCloseNumber(), null, s.netSales(),
                sessions.size() + " session(s), " + s.invoiceCount() + " sale(s), net " + s.netSales(), approvedBy, null);
        return mapper.dayClose(dc);
    }

    /**
     * Reopens the most recently closed business day (a day closed by mistake). Departs from BillBull,
     * which has no reopen path: here it is supervisor-only, needs a reason, only the latest Day Close
     * can be undone, and the audit trail keeps the close it removed. The day's sessions go back to
     * "not day-closed"; closing the day again freezes a fresh Z-report.
     */
    public DayCloseDTO reopen(LocalDate day, PosRequests.SupervisorAction req) {
        support.requireBranch();
        PosDayClose dc = dayCloseRepo.findFirstByBusinessDate(day)
                .orElseThrow(() -> new BusinessRuleViolationException("Day " + day + " is not closed."));
        String reason = req == null ? null : trimToNull(req.reason());
        if (reason == null) throw new BusinessRuleViolationException("Give a reason for reopening " + day + ".");
        PosDayClose latest = dayCloseRepo.findTop60ByOrderByBusinessDateDesc().stream().findFirst().orElse(dc);
        if (!latest.getId().equals(dc.getId())) {
            throw new BusinessRuleViolationException("Only the latest closed day can be reopened — reopen "
                    + latest.getBusinessDate() + " (" + latest.getCloseNumber() + ") first.");
        }
        String approvedBy = support.approve(settingsService.current(), true, req.supervisorPin(), "reopening a closed business day");

        int sessions = 0;
        for (PosSession session : sessionRepo.findByBusinessDateOrderByOpenedAtAsc(day)) {
            if (dc.getId().equals(session.getDayCloseId())) {
                session.setDayCloseId(null);
                sessionRepo.save(session);
                sessions++;
            }
        }
        DayCloseDTO removed = mapper.dayClose(dc);
        dayCloseRepo.delete(dc);
        auditService.log("DAY_REOPEN", "PosDayClose", dc.getId(), dc.getCloseNumber(), null, dc.getNetSales(),
                "Reopened " + day + " (" + sessions + " session(s); was closed by " + dc.getClosedBy() + " at " + dc.getClosedAt()
                        + ", counted " + dc.getCountedCash() + ", variance " + dc.getCashVariance() + ") | reason: " + reason,
                approvedBy, null);
        return removed;
    }

    @Transactional(readOnly = true)
    public List<DayCloseDTO> history(LocalDate from, LocalDate to) {
        List<PosDayClose> rows = from != null || to != null
                ? dayCloseRepo.findByBusinessDateBetweenOrderByBusinessDateDesc(
                        from != null ? from : LocalDate.of(2000, 1, 1), to != null ? to : support.today())
                : dayCloseRepo.findTop60ByOrderByBusinessDateDesc();
        return rows.stream().map(mapper::dayClose).toList();
    }

    /** The Z-report exactly as it was frozen at close, for reprinting a past day. */
    @Transactional(readOnly = true)
    public String snapshot(LocalDate day) {
        return dayCloseRepo.findFirstByBusinessDate(day).map(PosDayClose::getSummaryJson)
                .orElseThrow(() -> new BusinessRuleViolationException("Day " + day + " has not been closed."));
    }
}
