package com.company.project.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Audit log for every automation workflow run.
 * One row per execution attempt — success or failure.
 */
@Entity
@Table(name = "automation_execution_logs",
        indexes = {
            @Index(name = "idx_ael_workflow", columnList = "workflow_id, ran_at"),
            @Index(name = "idx_ael_status",   columnList = "status, ran_at")
        })
public class AutomationExecutionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workflow_id", nullable = false)
    private Long workflowId;

    @Column(name = "ran_at", nullable = false)
    private LocalDateTime ranAt;

    // success | failed | skipped
    @Column(nullable = false)
    private String status;

    // Number of members matched by the trigger
    @Column(name = "matched_count", nullable = false)
    private int matchedCount = 0;

    // Number of notifications successfully sent
    @Column(name = "processed_count", nullable = false)
    private int processedCount = 0;

    // Populated when status = "failed"
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    // What triggered this run: "scheduler" | "manual"
    @Column(name = "trigger_source", nullable = false)
    private String triggerSource = "scheduler";

    public AutomationExecutionLog() {}

    public AutomationExecutionLog(Long workflowId, String triggerSource) {
        this.workflowId = workflowId;
        this.triggerSource = triggerSource;
        this.ranAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getWorkflowId() { return workflowId; }
    public void setWorkflowId(Long workflowId) { this.workflowId = workflowId; }

    public LocalDateTime getRanAt() { return ranAt; }
    public void setRanAt(LocalDateTime ranAt) { this.ranAt = ranAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getMatchedCount() { return matchedCount; }
    public void setMatchedCount(int matchedCount) { this.matchedCount = matchedCount; }

    public int getProcessedCount() { return processedCount; }
    public void setProcessedCount(int processedCount) { this.processedCount = processedCount; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public String getTriggerSource() { return triggerSource; }
    public void setTriggerSource(String triggerSource) { this.triggerSource = triggerSource; }
}
