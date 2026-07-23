package com.company.project.repositories;

import com.company.project.entities.AutomationWorkflow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AutomationWorkflowRepository extends JpaRepository<AutomationWorkflow, Long> {

    List<AutomationWorkflow> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

    /** Used by the scheduler to fetch only runnable workflows. */
    List<AutomationWorkflow> findByCompanyIdAndStatus(Long companyId, String status);

    /** Used by the executor to find active workflows by trigger type. */
    List<AutomationWorkflow> findByCompanyIdAndStatusAndTriggerType(
            Long companyId, String status, String triggerType);
}
