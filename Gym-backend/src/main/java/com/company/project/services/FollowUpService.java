package com.company.project.services;

import com.company.project.dto.CommunicationRecordDTO;
import com.company.project.dto.FollowUpPageResponseDTO;
import com.company.project.dto.FollowUpRequestDTO;
import com.company.project.dto.FollowUpResponseDTO;
import com.company.project.dto.FollowUpStatsDTO;
import com.company.project.dto.PaginationDTO;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.entities.CommunicationRecord;
import com.company.project.entities.FollowUp;
import com.company.project.entities.Lead;
import com.company.project.repositories.CommunicationRecordRepository;
import com.company.project.repositories.FollowUpRepository;
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
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class FollowUpService {

    private final FollowUpRepository followUpRepository;
    private final CommunicationRecordRepository communicationRecordRepository;
    private final NotificationService notificationService;
    private final LeadRepository leadRepository;

    public FollowUpService(FollowUpRepository followUpRepository,
                           CommunicationRecordRepository communicationRecordRepository,
                           NotificationService notificationService,
                           LeadRepository leadRepository) {
        this.followUpRepository = followUpRepository;
        this.communicationRecordRepository = communicationRecordRepository;
        this.notificationService = notificationService;
        this.leadRepository = leadRepository;
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    public FollowUpResponseDTO createFollowUp(FollowUpRequestDTO req) {
        FollowUp fu = new FollowUp();
        mapRequestToEntity(req, fu);
        fu.setStatus(req.getStatus() != null ? req.getStatus() : "pending");

        FollowUp saved = followUpRepository.save(fu);

        // Generate business ID
        String fuId = "FU-" + String.format("%010d", saved.getId());
        saved.setFollowUpId(fuId);
        saved = followUpRepository.save(saved);

        notificationService.notifyRoles(
                List.of("ADMIN", "MANAGER"),
                "New Follow-Up Scheduled",
                "Follow-up for " + (saved.getLead() != null ? saved.getLead().getFirstName() : "a contact") +
                " is due on " + (saved.getDueDate() != null ? saved.getDueDate().toLocalDate().toString() : "N/A") + ".",
                "INFO", "MEDIUM", "FOLLOW_UPS",
                saved.getId(), "/follow-ups",
                "FOLLOWUP_CREATED_" + saved.getId()
        );

        return toDTO(saved);
    }

    public FollowUpResponseDTO updateFollowUp(Long id, FollowUpRequestDTO req) {
        FollowUp fu = followUpRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Follow-up not found: " + id));
        mapRequestToEntity(req, fu);
        return toDTO(followUpRepository.save(fu));
    }

    public FollowUpResponseDTO getById(Long id) {
        return toDTO(followUpRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Follow-up not found: " + id)));
    }

    public void deleteFollowUp(Long id) {
        FollowUp fu = followUpRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Follow-up not found: " + id));
        followUpRepository.delete(fu);
    }

    public FollowUpResponseDTO complete(Long id, String outcome, String notes) {
        FollowUp fu = followUpRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Follow-up not found: " + id));
        fu.setStatus("completed");
        fu.setCompletedDate(LocalDateTime.now());
        if (outcome != null) fu.setOutcome(outcome);
        if (notes != null) fu.setNotes(notes);

        if (fu.getLead() != null) {
            fu.getLead().setLastContactDate(LocalDateTime.now());
            leadRepository.save(fu.getLead());
        }

        return toDTO(followUpRepository.save(fu));
    }

    public FollowUpResponseDTO cancel(Long id) {
        FollowUp fu = followUpRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Follow-up not found: " + id));
        fu.setStatus("cancelled");
        return toDTO(followUpRepository.save(fu));
    }

    public FollowUpResponseDTO reschedule(Long id, LocalDateTime newDueDate) {
        FollowUp fu = followUpRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Follow-up not found: " + id));
        fu.setStatus("rescheduled");
        fu.setDueDate(newDueDate);
        return toDTO(followUpRepository.save(fu));
    }

    @Transactional(readOnly = true)
    public FollowUpPageResponseDTO getFollowUps(int page, int size, String status, String type,
                                                 String priority, String assignedStaff, String search) {
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by("dueDate").ascending());

        Specification<FollowUp> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (type != null && !type.isBlank()) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (priority != null && !priority.isBlank()) {
                predicates.add(cb.equal(root.get("priority"), priority));
            }
            if (assignedStaff != null && !assignedStaff.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("assignedStaff")), "%" + assignedStaff.toLowerCase() + "%"));
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search.toLowerCase() + "%";
                jakarta.persistence.criteria.Join<FollowUp, Lead> leadJoin = root.join("lead", jakarta.persistence.criteria.JoinType.LEFT);
                predicates.add(cb.or(
                        cb.like(cb.lower(leadJoin.get("firstName")), like),
                        cb.like(cb.lower(leadJoin.get("lastName")), like),
                        cb.like(cb.lower(leadJoin.get("email")), like),
                        cb.like(cb.lower(root.get("subject")), like),
                        cb.like(cb.lower(root.get("followUpId")), like)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<FollowUp> result = followUpRepository.findAll(spec, pageable);
        List<FollowUpResponseDTO> dtos = result.getContent().stream().map(this::toDTO).collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO();
        pagination.setPage(page);
        pagination.setTotalPages(result.getTotalPages());
        pagination.setTotal(result.getTotalElements());
        pagination.setLimit(size);

        return new FollowUpPageResponseDTO(dtos, pagination);
    }

    @Transactional(readOnly = true)
    public FollowUpStatsDTO getStats() {
        long total = followUpRepository.count();
        long pending = followUpRepository.countByStatus("pending");
        long overdue = followUpRepository.countByStatus("overdue");
        long completed = followUpRepository.countByStatus("completed");
        long cancelled = followUpRepository.countByStatus("cancelled");
        long rescheduled = followUpRepository.countByStatus("rescheduled");

        FollowUpStatsDTO stats = new FollowUpStatsDTO();
        stats.setTotalFollowUps(total);
        stats.setPendingFollowUps(pending);
        stats.setOverdueFollowUps(overdue);
        stats.setCompletedFollowUps(completed);
        stats.setCancelledFollowUps(cancelled);
        stats.setRescheduledFollowUps(rescheduled);
        long eligible = total - cancelled;
        stats.setCompletionRate(eligible > 0
                ? BigDecimal.valueOf((double) completed / eligible * 100).setScale(1, RoundingMode.HALF_UP).doubleValue()
                : 0.0);
        return stats;
    }

    // ── Communication Records ─────────────────────────────────────────────────

    public CommunicationRecordDTO addRecord(Long followUpId, CommunicationRecordDTO dto) {
        FollowUp fu = followUpRepository.findById(followUpId)
                .orElseThrow(() -> new EntityNotFoundException("Follow-up not found: " + followUpId));

        CommunicationRecord record = new CommunicationRecord();
        record.setFollowUp(fu);
        record.setType(dto.getType());
        record.setDate(dto.getDate() != null ? dto.getDate() : LocalDateTime.now());
        record.setStaffMember(dto.getStaffMember());
        record.setDuration(dto.getDuration());
        record.setOutcome(dto.getOutcome());
        record.setNotes(dto.getNotes());
        record.setNextAction(dto.getNextAction());

        CommunicationRecord saved = communicationRecordRepository.save(record);
        return toRecordDTO(saved);
    }

    public void deleteRecord(Long recordId) {
        communicationRecordRepository.deleteById(recordId);
    }

    // ── Mark overdue ───────────────────────────────────────────────────────────
    // Called on demand or via scheduler to update statuses
    public void markOverdueFollowUps() {
        List<FollowUp> pending = followUpRepository.findByStatusAndDueDateBefore("pending", LocalDateTime.now());
        pending.forEach(fu -> fu.setStatus("overdue"));
        followUpRepository.saveAll(pending);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private void mapRequestToEntity(FollowUpRequestDTO req, FollowUp fu) {
        if (req.getLeadId() != null) {
            Lead lead = leadRepository.findById(req.getLeadId())
                    .orElseThrow(() -> new EntityNotFoundException("Lead not found: " + req.getLeadId()));
            fu.setLead(lead);
        }
        if (req.getType() != null) fu.setType(req.getType());
        if (req.getStatus() != null) fu.setStatus(req.getStatus());
        if (req.getPriority() != null) fu.setPriority(req.getPriority());
        if (req.getAssignedStaff() != null) fu.setAssignedStaff(req.getAssignedStaff());
        if (req.getDueDate() != null) fu.setDueDate(req.getDueDate());
        if (req.getScheduledTime() != null) fu.setScheduledTime(req.getScheduledTime());
        if (req.getCompletedDate() != null) fu.setCompletedDate(req.getCompletedDate());
        if (req.getSubject() != null) fu.setSubject(req.getSubject());
        if (req.getNotes() != null) fu.setNotes(req.getNotes());
        if (req.getTags() != null) fu.setTags(req.getTags());
        if (req.getMembershipStatus() != null) fu.setMembershipStatus(req.getMembershipStatus());
        if (req.getMembershipPlan() != null) fu.setMembershipPlan(req.getMembershipPlan());
        if (req.getFollowUpReason() != null) fu.setFollowUpReason(req.getFollowUpReason());
        if (req.getEstimatedDuration() != null) fu.setEstimatedDuration(req.getEstimatedDuration());
        if (req.getOutcome() != null) fu.setOutcome(req.getOutcome());
    }

    private FollowUpResponseDTO toDTO(FollowUp fu) {
        FollowUpResponseDTO dto = new FollowUpResponseDTO();
        dto.setId(fu.getId());
        dto.setFollowUpId(fu.getFollowUpId());
        if (fu.getLead() != null) {
            dto.setLeadId(fu.getLead().getId());
            dto.setLeadName(fu.getLead().getFirstName() + " " + (fu.getLead().getLastName() != null ? fu.getLead().getLastName() : ""));
            dto.setLeadEmail(fu.getLead().getEmail());
            dto.setLeadPhone(fu.getLead().getPhone());
        }
        dto.setType(fu.getType());
        dto.setStatus(fu.getStatus());
        dto.setPriority(fu.getPriority());
        dto.setAssignedStaff(fu.getAssignedStaff());
        dto.setDueDate(fu.getDueDate());
        dto.setScheduledTime(fu.getScheduledTime());
        dto.setCompletedDate(fu.getCompletedDate());
        dto.setSubject(fu.getSubject());
        dto.setNotes(fu.getNotes());
        dto.setTags(fu.getTags());
        dto.setMembershipStatus(fu.getMembershipStatus());
        dto.setMembershipPlan(fu.getMembershipPlan());
        dto.setFollowUpReason(fu.getFollowUpReason());
        dto.setEstimatedDuration(fu.getEstimatedDuration());
        dto.setOutcome(fu.getOutcome());
        dto.setCommunicationHistory(fu.getCommunicationHistory().stream()
                .map(this::toRecordDTO).collect(Collectors.toList()));
        dto.setCreatedAt(fu.getCreatedAt());
        dto.setUpdatedAt(fu.getUpdatedAt());
        return dto;
    }

    private CommunicationRecordDTO toRecordDTO(CommunicationRecord r) {
        CommunicationRecordDTO dto = new CommunicationRecordDTO();
        dto.setId(r.getId());
        dto.setType(r.getType());
        dto.setDate(r.getDate());
        dto.setStaffMember(r.getStaffMember());
        dto.setDuration(r.getDuration());
        dto.setOutcome(r.getOutcome());
        dto.setNotes(r.getNotes());
        dto.setNextAction(r.getNextAction());
        return dto;
    }
}
