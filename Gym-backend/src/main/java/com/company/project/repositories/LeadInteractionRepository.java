package com.company.project.repositories;

import com.company.project.entities.LeadInteraction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeadInteractionRepository extends JpaRepository<LeadInteraction, Long> {

    List<LeadInteraction> findByLeadIdOrderByDateDesc(Long leadId);

    void deleteByLeadId(Long leadId);
}
