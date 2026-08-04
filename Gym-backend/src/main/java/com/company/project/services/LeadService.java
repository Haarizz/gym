package com.company.project.services;

import com.company.project.dto.LeadInteractionDTO;
import com.company.project.dto.LeadPageResponseDTO;
import com.company.project.dto.LeadRequestDTO;
import com.company.project.dto.LeadResponseDTO;
import com.company.project.dto.LeadStatsDTO;
import com.company.project.dto.PaginationDTO;
import com.company.project.dto.FollowUpResponseDTO;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.entities.Lead;
import com.company.project.entities.LeadInteraction;
import com.company.project.entities.FollowUp;
import com.company.project.repositories.LeadInteractionRepository;
import com.company.project.repositories.LeadRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class LeadService {

    private final LeadRepository leadRepository;
    private final LeadInteractionRepository interactionRepository;
    private final NotificationService notificationService;

    public LeadService(LeadRepository leadRepository, LeadInteractionRepository interactionRepository,
                       NotificationService notificationService) {
        this.leadRepository = leadRepository;
        this.interactionRepository = interactionRepository;
        this.notificationService = notificationService;
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    public LeadResponseDTO createLead(LeadRequestDTO req) {
        Lead lead = new Lead();
        mapRequestToEntity(req, lead);
        lead.setStatus(req.getStatus() != null ? req.getStatus() : "new");

        Lead saved = leadRepository.save(lead);

        // Generate business ID
        String leadId = "LEAD-" + String.format("%010d", saved.getId());
        saved.setLeadId(leadId);
        saved = leadRepository.save(saved);

        notificationService.notifyRoles(
                List.of("ADMIN", "MANAGER"),
                "New Lead",
                saved.getFirstName() + " " + saved.getLastName() + " added as a new lead.",
                "INFO", "MEDIUM", "LEADS",
                saved.getId(), "/leads",
                "LEAD_CREATED_" + saved.getId()
        );

        return toDTO(saved);
    }

    public LeadResponseDTO updateLead(Long id, LeadRequestDTO req) {
        Lead lead = leadRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Lead not found: " + id));
        mapRequestToEntity(req, lead);
        return toDTO(leadRepository.save(lead));
    }

    public LeadResponseDTO getById(Long id) {
        return toDTO(leadRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Lead not found: " + id)));
    }

    public void deleteLead(Long id) {
        Lead lead = leadRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Lead not found: " + id));
        leadRepository.delete(lead);
    }

    public LeadResponseDTO updateStatus(Long id, String status) {
        Lead lead = leadRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Lead not found: " + id));
        lead.setStatus(status);
        if ("converted".equals(status) || "contacted".equals(status)) {
            lead.setLastContactDate(LocalDateTime.now());
        }
        return toDTO(leadRepository.save(lead));
    }

    @Transactional(readOnly = true)
    public LeadPageResponseDTO getLeads(int page, int size, String status, String source, String priority, String search) {
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("createdAt").descending());

        Specification<Lead> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (source != null && !source.isBlank()) {
                predicates.add(cb.equal(root.get("source"), source));
            }
            if (priority != null && !priority.isBlank()) {
                predicates.add(cb.equal(root.get("priority"), priority));
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("firstName")), like),
                        cb.like(cb.lower(root.get("lastName")), like),
                        cb.like(cb.lower(root.get("email")), like),
                        cb.like(cb.lower(root.get("phone")), like),
                        cb.like(cb.lower(root.get("leadId")), like)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Lead> result = leadRepository.findAll(spec, pageable);
        List<LeadResponseDTO> dtos = result.getContent().stream().map(this::toDTO).collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO();
        pagination.setPage(page);
        pagination.setTotalPages(result.getTotalPages());
        pagination.setTotal(result.getTotalElements());
        pagination.setLimit(size);

        return new LeadPageResponseDTO(dtos, pagination);
    }

    @Transactional(readOnly = true)
    public LeadStatsDTO getStats() {
        long total = leadRepository.count();
        long newLeads = leadRepository.countByStatus("new");
        long contacted = leadRepository.countByStatus("contacted");
        long followUp = leadRepository.countByStatus("follow_up");
        long converted = leadRepository.countByStatus("converted");
        long lost = leadRepository.countByStatus("lost");

        LeadStatsDTO stats = new LeadStatsDTO();
        stats.setTotalLeads(total);
        stats.setNewLeads(newLeads);
        stats.setContactedLeads(contacted);
        stats.setFollowUpLeads(followUp);
        stats.setConvertedLeads(converted);
        stats.setLostLeads(lost);
        long eligible = total - lost;
        stats.setConversionRate(eligible > 0
                ? BigDecimal.valueOf((double) converted / eligible * 100).setScale(1, RoundingMode.HALF_UP).doubleValue()
                : 0.0);
        return stats;
    }

    // ── Interactions ───────────────────────────────────────────────────────────

    public LeadInteractionDTO addInteraction(Long leadId, LeadInteractionDTO dto) {
        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new EntityNotFoundException("Lead not found: " + leadId));
        LeadInteraction interaction = new LeadInteraction();
        interaction.setLead(lead);
        interaction.setType(dto.getType());
        interaction.setDate(dto.getDate() != null ? dto.getDate() : LocalDateTime.now());
        interaction.setStaffMember(dto.getStaffMember());
        interaction.setNotes(dto.getNotes());
        interaction.setOutcome(dto.getOutcome());
        interaction.setDuration(dto.getDuration());

        lead.setLastContactDate(interaction.getDate());
        leadRepository.save(lead);

        LeadInteraction saved = interactionRepository.save(interaction);
        return toInteractionDTO(saved);
    }

    public void deleteInteraction(Long interactionId) {
        interactionRepository.deleteById(interactionId);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private void mapRequestToEntity(LeadRequestDTO req, Lead lead) {
        if (req.getFirstName() != null) lead.setFirstName(req.getFirstName());
        if (req.getLastName() != null) lead.setLastName(req.getLastName());
        if (req.getEmail() != null) lead.setEmail(req.getEmail());
        if (req.getPhone() != null) lead.setPhone(req.getPhone());
        if (req.getStatus() != null) lead.setStatus(req.getStatus());
        if (req.getSource() != null) lead.setSource(req.getSource());
        if (req.getPriority() != null) lead.setPriority(req.getPriority());
        if (req.getAssignedStaff() != null) lead.setAssignedStaff(req.getAssignedStaff());
        if (req.getNextFollowUp() != null) lead.setNextFollowUp(req.getNextFollowUp());
        if (req.getLastContactDate() != null) lead.setLastContactDate(req.getLastContactDate());
        if (req.getInterestLevel() != null) lead.setInterestLevel(req.getInterestLevel());
        if (req.getNotes() != null) lead.setNotes(req.getNotes());
        if (req.getTags() != null) lead.setTags(req.getTags());
        if (req.getMembershipInterest() != null) lead.setMembershipInterest(req.getMembershipInterest());
        if (req.getBudget() != null) lead.setBudget(req.getBudget());
        if (req.getPreferredContactMethod() != null) lead.setPreferredContactMethod(req.getPreferredContactMethod());
        if (req.getLeadScore() != null) lead.setLeadScore(req.getLeadScore());
    }

    private LeadResponseDTO toDTO(Lead lead) {
        LeadResponseDTO dto = new LeadResponseDTO();
        dto.setId(lead.getId());
        dto.setLeadId(lead.getLeadId());
        dto.setFirstName(lead.getFirstName());
        dto.setLastName(lead.getLastName());
        dto.setEmail(lead.getEmail());
        dto.setPhone(lead.getPhone());
        dto.setStatus(lead.getStatus());
        dto.setSource(lead.getSource());
        dto.setPriority(lead.getPriority());
        dto.setAssignedStaff(lead.getAssignedStaff());
        dto.setNextFollowUp(lead.getNextFollowUp());
        dto.setLastContactDate(lead.getLastContactDate());
        dto.setInterestLevel(lead.getInterestLevel());
        dto.setNotes(lead.getNotes());
        dto.setTags(lead.getTags());
        dto.setMembershipInterest(lead.getMembershipInterest());
        dto.setBudget(lead.getBudget());
        dto.setPreferredContactMethod(lead.getPreferredContactMethod());
        dto.setLeadScore(lead.getLeadScore());
        dto.setInteractions(lead.getInteractions().stream().map(this::toInteractionDTO).collect(Collectors.toList()));
        if (lead.getFollowUps() != null) {
            dto.setFollowUps(lead.getFollowUps().stream().map(this::toFollowUpDTO).collect(Collectors.toList()));
        }
        dto.setCreatedAt(lead.getCreatedAt());
        dto.setUpdatedAt(lead.getUpdatedAt());
        return dto;
    }

    private LeadInteractionDTO toInteractionDTO(LeadInteraction i) {
        LeadInteractionDTO dto = new LeadInteractionDTO();
        dto.setId(i.getId());
        dto.setType(i.getType());
        dto.setDate(i.getDate());
        dto.setStaffMember(i.getStaffMember());
        dto.setNotes(i.getNotes());
        dto.setOutcome(i.getOutcome());
        dto.setDuration(i.getDuration());
        return dto;
    }

    private FollowUpResponseDTO toFollowUpDTO(FollowUp fu) {
        FollowUpResponseDTO dto = new FollowUpResponseDTO();
        dto.setId(fu.getId());
        dto.setFollowUpId(fu.getFollowUpId());
        dto.setType(fu.getType());
        dto.setStatus(fu.getStatus());
        dto.setPriority(fu.getPriority());
        dto.setAssignedStaff(fu.getAssignedStaff());
        dto.setDueDate(fu.getDueDate());
        dto.setScheduledTime(fu.getScheduledTime());
        dto.setCompletedDate(fu.getCompletedDate());
        dto.setSubject(fu.getSubject());
        dto.setOutcome(fu.getOutcome());
        dto.setCreatedAt(fu.getCreatedAt());
        return dto;
    }
}
