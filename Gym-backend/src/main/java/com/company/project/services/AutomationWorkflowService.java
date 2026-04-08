package com.company.project.services;

import com.company.project.automation.AutomationExecutorService;
import com.company.project.entities.AutomationWorkflow;
import com.company.project.repositories.AutomationExecutionLogRepository;
import com.company.project.repositories.AutomationWorkflowRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@Service
@Transactional
public class AutomationWorkflowService {

    private static final Long COMPANY_ID = 1L;

    private final AutomationWorkflowRepository workflowRepository;
    private final AutomationExecutionLogRepository logRepository;
    private final AutomationExecutorService executorService;

    public AutomationWorkflowService(AutomationWorkflowRepository workflowRepository,
                                     AutomationExecutionLogRepository logRepository,
                                     AutomationExecutorService executorService) {
        this.workflowRepository = workflowRepository;
        this.logRepository = logRepository;
        this.executorService = executorService;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AutomationWorkflow> getAll() {
        return workflowRepository.findByCompanyIdOrderByCreatedAtDesc(COMPANY_ID);
    }

    @Transactional(readOnly = true)
    public AutomationWorkflow getById(Long id) {
        return workflowRepository.findById(id)
                .filter(w -> COMPANY_ID.equals(w.getCompanyId()))
                .orElseThrow(() -> new NoSuchElementException("Workflow not found: " + id));
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    public AutomationWorkflow create(AutomationWorkflow workflow) {
        workflow.setCompanyId(COMPANY_ID);
        if (workflow.getStatus() == null) workflow.setStatus("draft");
        return workflowRepository.save(workflow);
    }

    public AutomationWorkflow update(Long id, AutomationWorkflow patch) {
        AutomationWorkflow existing = getById(id);
        if (existing.isSystem()) throw new IllegalStateException("System workflows cannot be modified");

        existing.setName(patch.getName());
        existing.setDescription(patch.getDescription());
        existing.setTriggerType(patch.getTriggerType());
        existing.setTriggerParams(patch.getTriggerParams());
        existing.setTargetType(patch.getTargetType());
        existing.setTargetParams(patch.getTargetParams());
        existing.setActionType(patch.getActionType());
        existing.setActionTitle(patch.getActionTitle());
        existing.setActionContent(patch.getActionContent());
        existing.setActionSubject(patch.getActionSubject());
        existing.setDelayMinutes(patch.getDelayMinutes());
        existing.setFrequency(patch.getFrequency());
        existing.setExecutionTime(patch.getExecutionTime());
        existing.setDayOfWeek(patch.getDayOfWeek());
        existing.setDayOfMonth(patch.getDayOfMonth());
        existing.setTimezone(patch.getTimezone());
        existing.setCooldownHours(patch.getCooldownHours());
        existing.setPriority(patch.getPriority());
        return workflowRepository.save(existing);
    }

    public void delete(Long id) {
        AutomationWorkflow w = getById(id);
        if (w.isSystem()) throw new IllegalStateException("System workflows cannot be deleted");
        workflowRepository.delete(w);
    }

    /**
     * Toggle between active ↔ paused.
     * If the workflow is in "error" state, toggling to active resets it.
     */
    public AutomationWorkflow toggleStatus(Long id) {
        AutomationWorkflow w = getById(id);
        String current = w.getStatus();
        w.setStatus("active".equals(current) ? "paused" : "active");
        return workflowRepository.save(w);
    }

    /** Trigger an immediate manual run (bypasses schedule check). */
    public void manualRun(Long id) {
        getById(id); // validates existence + ownership
        executorService.manualRun(id);
    }

    // ── Analytics ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getStats() {
        List<AutomationWorkflow> all = getAll();
        long active    = all.stream().filter(w -> "active".equals(w.getStatus())).count();
        long paused    = all.stream().filter(w -> "paused".equals(w.getStatus())).count();
        long draft     = all.stream().filter(w -> "draft".equals(w.getStatus())).count();
        long error     = all.stream().filter(w -> "error".equals(w.getStatus())).count();
        int  totalRuns = all.stream().mapToInt(AutomationWorkflow::getTotalRuns).sum();
        int  engaged   = all.stream().mapToInt(AutomationWorkflow::getMembersEngaged).sum();
        return Map.of(
                "total",    all.size(),
                "active",   active,
                "paused",   paused,
                "draft",    draft,
                "error",    error,
                "totalRuns",  totalRuns,
                "membersEngaged", engaged
        );
    }

    @Transactional(readOnly = true)
    public List<?> getExecutionLogs(Long workflowId, int page, int size) {
        getById(workflowId); // validates ownership
        return logRepository.findByWorkflowIdOrderByRanAtDesc(
                workflowId, PageRequest.of(page, size)).getContent();
    }
}
