package com.company.project.automation;

import com.company.project.automation.handlers.NewSignupHandler;
import com.company.project.entities.AutomationExecutionLog;
import com.company.project.entities.AutomationWorkflow;
import com.company.project.entities.Member;
import com.company.project.repositories.AutomationExecutionLogRepository;
import com.company.project.repositories.AutomationWorkflowRepository;
import com.company.project.services.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Executes automation workflows — both scheduler-driven (daily cron) and
 * event-driven (e.g. new_signup fired from MemberService).
 *
 * Delivery is always via NotificationService.notifyUser() — in-app only.
 * Other action types (email, SMS, WhatsApp) are accepted by the UI but
 * silently skipped here until those channels are wired up.
 */
@Service
public class AutomationExecutorService {

    private static final Logger log = LoggerFactory.getLogger(AutomationExecutorService.class);

    private static final Long COMPANY_ID = 1L;

    private final AutomationWorkflowRepository workflowRepository;
    private final AutomationExecutionLogRepository logRepository;
    private final NotificationService notificationService;

    /** Handler registry — keyed by triggerType string. */
    private final Map<String, TriggerHandler> handlers;

    public AutomationExecutorService(
            AutomationWorkflowRepository workflowRepository,
            AutomationExecutionLogRepository logRepository,
            NotificationService notificationService,
            List<TriggerHandler> handlerList) {
        this.workflowRepository = workflowRepository;
        this.logRepository = logRepository;
        this.notificationService = notificationService;
        this.handlers = handlerList.stream()
                .collect(Collectors.toMap(TriggerHandler::triggerType, Function.identity()));
    }

    // ── Scheduler entry point ─────────────────────────────────────────────────

    /**
     * Called once per day by NotificationScheduler.runDailyChecks().
     * Runs every active workflow whose frequency and schedule align with now.
     */
    @Transactional
    public void runScheduledWorkflows() {
        List<AutomationWorkflow> active =
                workflowRepository.findByCompanyIdAndStatus(COMPANY_ID, "active");

        for (AutomationWorkflow workflow : active) {
            try {
                if (!isDueNow(workflow)) continue;
                if (alreadyRanToday(workflow)) continue;
                executeWorkflow(workflow, "scheduler");
            } catch (Exception e) {
                log.error("Automation scheduler error for workflow {}: {}", workflow.getId(), e.getMessage(), e);
            }
        }
    }

    // ── Event-driven entry point (new_signup, payment_failed, etc.) ───────────

    /**
     * Called directly from business services when an event fires.
     * Finds all active workflows for this trigger type and sends to the given member.
     */
    @Transactional
    public void handleEvent(String triggerType, Member member) {
        if (member == null || member.getUserId() == null) return;

        List<AutomationWorkflow> workflows =
                workflowRepository.findByCompanyIdAndStatusAndTriggerType(COMPANY_ID, "active", triggerType);

        for (AutomationWorkflow workflow : workflows) {
            try {
                sendToMember(workflow, member, "event");
            } catch (Exception e) {
                log.error("Automation event error for workflow {} / member {}: {}",
                        workflow.getId(), member.getId(), e.getMessage(), e);
            }
        }
    }

    // ── Manual run (from controller) ──────────────────────────────────────────

    /**
     * Run a specific workflow immediately, regardless of schedule.
     */
    @Transactional
    public void manualRun(Long workflowId) {
        workflowRepository.findById(workflowId).ifPresent(w -> executeWorkflow(w, "manual"));
    }

    // ── Core execution ────────────────────────────────────────────────────────

    private void executeWorkflow(AutomationWorkflow workflow, String source) {
        AutomationExecutionLog execLog = new AutomationExecutionLog(workflow.getId(), source);

        try {
            TriggerHandler handler = handlers.get(workflow.getTriggerType());

            // new_signup is event-only — skip in scheduler
            if (handler == null || handler instanceof NewSignupHandler) {
                execLog.setStatus("skipped");
                execLog.setErrorMessage("No handler or event-only trigger");
                logRepository.save(execLog);
                return;
            }

            List<Member> members = handler.findQualifyingMembers(workflow);
            execLog.setMatchedCount(members.size());

            int sent = 0;
            for (Member m : members) {
                if (m.getUserId() == null) continue;
                sendToMember(workflow, m, source);
                sent++;
            }

            execLog.setProcessedCount(sent);
            execLog.setStatus("success");

            // Update denormalized stats on the workflow
            workflow.setTotalRuns(workflow.getTotalRuns() + 1);
            workflow.setSuccessfulRuns(workflow.getSuccessfulRuns() + 1);
            workflow.setMembersEngaged(workflow.getMembersEngaged() + sent);
            workflow.setLastRunAt(LocalDateTime.now());
            workflow.setNextRunAt(calculateNextRun(workflow));
            workflowRepository.save(workflow);

        } catch (Exception e) {
            log.error("Workflow {} execution failed: {}", workflow.getId(), e.getMessage(), e);
            execLog.setStatus("failed");
            execLog.setErrorMessage(e.getMessage());

            workflow.setTotalRuns(workflow.getTotalRuns() + 1);
            workflow.setFailedRuns(workflow.getFailedRuns() + 1);
            workflow.setStatus("error");
            workflowRepository.save(workflow);
        } finally {
            logRepository.save(execLog);
        }
    }

    private void sendToMember(AutomationWorkflow workflow, Member member, String source) {
        // Only in-app delivery is executed — other action types stored for future channels
        if (!"send_in_app".equals(workflow.getActionType())) return;

        String title = interpolate(workflow.getActionTitle(), member);
        String content = interpolate(workflow.getActionContent(), member);

        // Map workflow priority to notification priority
        String notifPriority = switch (workflow.getPriority()) {
            case "HIGH" -> "HIGH";
            case "LOW" -> "LOW";
            default -> "MEDIUM";
        };

        // Idempotency key: workflow + member + date — prevents duplicate if re-run
        String eventKey = "AUTO_" + workflow.getId() + "_M" + member.getId()
                + "_" + LocalDate.now();

        notificationService.notifyUser(
                member.getUserId(),
                title,
                content,
                "INFO", notifPriority, "GENERAL",
                member.getId(), workflow.getActionType(),
                eventKey
        );
    }

    // ── Merge field interpolation ─────────────────────────────────────────────

    private String interpolate(String template, Member member) {
        if (template == null) return "";
        return template
                .replace("{FirstName}", firstName(member.getName()))
                .replace("{FullName}", member.getName() != null ? member.getName() : "")
                .replace("{MembershipPlan}", member.getMembershipPlan() != null ? member.getMembershipPlan() : "")
                .replace("{MembershipType}", member.getMembershipType() != null ? member.getMembershipType() : "")
                .replace("{ExpiryDate}", member.getExpiryDate() != null
                        ? member.getExpiryDate().toLocalDate().toString() : "")
                .replace("{Phone}", member.getPhone() != null ? member.getPhone() : "")
                .replace("{Email}", member.getEmail() != null ? member.getEmail() : "");
    }

    private String firstName(String fullName) {
        if (fullName == null || fullName.isBlank()) return "";
        return fullName.split("\\s+")[0];
    }

    // ── Schedule helpers ──────────────────────────────────────────────────────

    /** True if this workflow's schedule aligns with the current moment. */
    private boolean isDueNow(AutomationWorkflow workflow) {
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();

        return switch (workflow.getFrequency()) {
            case "daily" -> true;
            case "weekly" -> {
                Integer dow = workflow.getDayOfWeek();
                yield dow == null || today.getDayOfWeek().getValue() == dow;
            }
            case "monthly" -> {
                Integer dom = workflow.getDayOfMonth();
                yield dom == null || today.getDayOfMonth() == dom;
            }
            // "once" workflows run once then get paused after first success
            case "once" -> workflow.getLastRunAt() == null;
            default -> false;
        };
    }

    /** Idempotency guard — did this workflow already run successfully today? */
    private boolean alreadyRanToday(AutomationWorkflow workflow) {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);
        return logRepository.hasSuccessfulRunToday(workflow.getId(), startOfDay, endOfDay);
    }

    /** Calculate when this workflow should next run after a successful execution. */
    private LocalDateTime calculateNextRun(AutomationWorkflow workflow) {
        LocalTime execTime = workflow.getExecutionTime() != null
                ? workflow.getExecutionTime() : LocalTime.of(8, 0);
        LocalDate today = LocalDate.now();

        return switch (workflow.getFrequency()) {
            case "daily" -> today.plusDays(1).atTime(execTime);
            case "weekly" -> {
                int dow = workflow.getDayOfWeek() != null ? workflow.getDayOfWeek() : today.getDayOfWeek().getValue();
                DayOfWeek target = DayOfWeek.of(dow);
                yield today.with(TemporalAdjusters.next(target)).atTime(execTime);
            }
            case "monthly" -> {
                int dom = workflow.getDayOfMonth() != null ? workflow.getDayOfMonth() : today.getDayOfMonth();
                LocalDate nextMonth = today.plusMonths(1).withDayOfMonth(Math.min(dom,
                        today.plusMonths(1).lengthOfMonth()));
                yield nextMonth.atTime(execTime);
            }
            // "once" — no next run; caller should pause the workflow
            default -> null;
        };
    }
}
