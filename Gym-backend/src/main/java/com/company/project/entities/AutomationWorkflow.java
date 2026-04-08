package com.company.project.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Persisted automation workflow definition.
 *
 * Trigger config and action config are stored as JSON text so the executor
 * can read arbitrary key/value pairs without schema migrations.
 */
@Entity
@Table(name = "automation_workflows")
public class AutomationWorkflow extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Single-tenant — replace with user.getCompanyId() when multi-tenant
    @Column(name = "company_id", nullable = false)
    private Long companyId = 1L;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    // active | paused | draft | error
    @Column(nullable = false)
    private String status = "draft";

    // ── Trigger ─────────────────────────────────────────────────────────────

    // membership_expiry | birthday | missed_workout | low_attendance |
    // new_signup | class_reminder | goal_achievement | payment_failed
    @Column(name = "trigger_type", nullable = false)
    private String triggerType;

    // JSON: {"days_before": 7} / {"consecutive_days": 3} / etc.
    @Column(name = "trigger_params", columnDefinition = "TEXT")
    private String triggerParams = "{}";

    // ── Targeting ────────────────────────────────────────────────────────────

    // ALL | SEGMENT
    @Column(name = "target_type", nullable = false)
    private String targetType = "ALL";

    // JSON: {"membershipType": "Premium", "membershipStatus": "active"}
    @Column(name = "target_params", columnDefinition = "TEXT")
    private String targetParams = "{}";

    // ── Action ───────────────────────────────────────────────────────────────

    // send_in_app (the only action we execute — others are UI-only for now)
    @Column(name = "action_type", nullable = false)
    private String actionType;

    // Notification title (supports {FirstName} merge field)
    @Column(name = "action_title")
    private String actionTitle;

    // Notification body / email content
    @Column(name = "action_content", columnDefinition = "TEXT")
    private String actionContent;

    // Email subject (only for send_email action)
    @Column(name = "action_subject")
    private String actionSubject;

    // Delay before sending (stored in minutes, computed from UI delay + delayUnit)
    @Column(name = "delay_minutes", nullable = false)
    private int delayMinutes = 0;

    // ── Schedule ─────────────────────────────────────────────────────────────

    // once | daily | weekly | monthly
    @Column(nullable = false)
    private String frequency = "once";

    // Time-of-day when this workflow should execute (stored as HH:mm)
    @Column(name = "execution_time")
    private LocalTime executionTime;

    // 1=MON … 7=SUN (only relevant for frequency=weekly)
    @Column(name = "day_of_week")
    private Integer dayOfWeek;

    // 1–28 (only relevant for frequency=monthly)
    @Column(name = "day_of_month")
    private Integer dayOfMonth;

    // Timezone string, e.g. "Asia/Kolkata"
    @Column(name = "timezone")
    private String timezone = "Asia/Kolkata";

    // ── Idempotency & run tracking ────────────────────────────────────────────

    @Column(name = "last_run_at")
    private LocalDateTime lastRunAt;

    @Column(name = "next_run_at")
    private LocalDateTime nextRunAt;

    // Minimum gap between two runs for the same member (in hours)
    @Column(name = "cooldown_hours", nullable = false)
    private int cooldownHours = 24;

    // ── Stats (denormalized for fast dashboard display) ───────────────────────

    @Column(name = "total_runs", nullable = false)
    private int totalRuns = 0;

    @Column(name = "successful_runs", nullable = false)
    private int successfulRuns = 0;

    @Column(name = "failed_runs", nullable = false)
    private int failedRuns = 0;

    @Column(name = "members_engaged", nullable = false)
    private int membersEngaged = 0;

    // LOW | MEDIUM | HIGH
    @Column(nullable = false)
    private String priority = "MEDIUM";

    // true = cannot be deleted by users (system defaults)
    @Column(name = "is_system", nullable = false)
    private boolean isSystem = false;

    public AutomationWorkflow() {}

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCompanyId() { return companyId; }
    public void setCompanyId(Long companyId) { this.companyId = companyId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getTriggerType() { return triggerType; }
    public void setTriggerType(String triggerType) { this.triggerType = triggerType; }

    public String getTriggerParams() { return triggerParams; }
    public void setTriggerParams(String triggerParams) { this.triggerParams = triggerParams; }

    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }

    public String getTargetParams() { return targetParams; }
    public void setTargetParams(String targetParams) { this.targetParams = targetParams; }

    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }

    public String getActionTitle() { return actionTitle; }
    public void setActionTitle(String actionTitle) { this.actionTitle = actionTitle; }

    public String getActionContent() { return actionContent; }
    public void setActionContent(String actionContent) { this.actionContent = actionContent; }

    public String getActionSubject() { return actionSubject; }
    public void setActionSubject(String actionSubject) { this.actionSubject = actionSubject; }

    public int getDelayMinutes() { return delayMinutes; }
    public void setDelayMinutes(int delayMinutes) { this.delayMinutes = delayMinutes; }

    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }

    public LocalTime getExecutionTime() { return executionTime; }
    public void setExecutionTime(LocalTime executionTime) { this.executionTime = executionTime; }

    public Integer getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(Integer dayOfWeek) { this.dayOfWeek = dayOfWeek; }

    public Integer getDayOfMonth() { return dayOfMonth; }
    public void setDayOfMonth(Integer dayOfMonth) { this.dayOfMonth = dayOfMonth; }

    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }

    public LocalDateTime getLastRunAt() { return lastRunAt; }
    public void setLastRunAt(LocalDateTime lastRunAt) { this.lastRunAt = lastRunAt; }

    public LocalDateTime getNextRunAt() { return nextRunAt; }
    public void setNextRunAt(LocalDateTime nextRunAt) { this.nextRunAt = nextRunAt; }

    public int getCooldownHours() { return cooldownHours; }
    public void setCooldownHours(int cooldownHours) { this.cooldownHours = cooldownHours; }

    public int getTotalRuns() { return totalRuns; }
    public void setTotalRuns(int totalRuns) { this.totalRuns = totalRuns; }

    public int getSuccessfulRuns() { return successfulRuns; }
    public void setSuccessfulRuns(int successfulRuns) { this.successfulRuns = successfulRuns; }

    public int getFailedRuns() { return failedRuns; }
    public void setFailedRuns(int failedRuns) { this.failedRuns = failedRuns; }

    public int getMembersEngaged() { return membersEngaged; }
    public void setMembersEngaged(int membersEngaged) { this.membersEngaged = membersEngaged; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public boolean isSystem() { return isSystem; }
    public void setSystem(boolean system) { isSystem = system; }
}
