package com.company.project.controlplane.service;

import com.company.project.controlplane.entities.PlatformLead;
import com.company.project.controlplane.entities.PlatformLeadFollowUp;
import com.company.project.controlplane.repositories.PlatformLeadRepository;
import com.company.project.dto.PaginationDTO;
import com.company.project.dto.PlatformLeadFollowUpRequestDTO;
import com.company.project.dto.PlatformLeadFollowUpResponseDTO;
import com.company.project.dto.PlatformLeadPageResponseDTO;
import com.company.project.dto.PlatformLeadRequestDTO;
import com.company.project.dto.PlatformLeadResponseDTO;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Backs the Super Admin's Leads / Follow Up / Pending Approval pages and the
 * public "Request a demo" onboarding-form submission. See PlatformLead's javadoc
 * for the pipeline shape; "approved" gym creation itself is NOT done here — it
 * goes through the existing GymService.createGym (POST /api/gyms), and this
 * service is only told the result afterward via markApproved.
 */
@Service
public class PlatformLeadService {

    private static final int MAX_TEXT_LENGTH = 2000;
    private static final int MAX_SHORT_LENGTH = 255;
    private static final int MAX_LIST_ITEMS = 30;

    private final PlatformLeadRepository platformLeadRepository;

    public PlatformLeadService(PlatformLeadRepository platformLeadRepository) {
        this.platformLeadRepository = platformLeadRepository;
    }

    // ── Public submission (POST /api/platform-leads, permitAll) ──────────────

    @Transactional("controlPlaneTransactionManager")
    public PlatformLeadResponseDTO submitLead(PlatformLeadRequestDTO req, String sourceIp) {
        if (req.getWebsite() != null && !req.getWebsite().isBlank()) {
            // Honeypot tripped — pretend success so the bot doesn't learn to adapt,
            // but don't actually persist anything.
            PlatformLead discarded = new PlatformLead();
            discarded.setBusinessName(truncate(req.getBusinessName(), MAX_SHORT_LENGTH, "Untitled business"));
            return toDTO(discarded);
        }

        if (req.getBusinessName() == null || req.getBusinessName().isBlank()) {
            throw new BusinessRuleViolationException("Business name is required");
        }

        PlatformLead lead = new PlatformLead();
        lead.setStage(PlatformLead.STAGE_LEAD);
        lead.setLeadStatus(PlatformLead.LEAD_STATUS_NEW);
        lead.setBusinessName(truncate(req.getBusinessName(), MAX_SHORT_LENGTH, null));
        lead.setPlanInterest(truncate(req.getPlanInterest(), MAX_SHORT_LENGTH, "Not specified"));
        lead.setBusinessTypes(capList(req.getBusinessTypes()));
        lead.setYearsInBusiness(truncate(req.getYearsInBusiness(), MAX_SHORT_LENGTH, null));
        lead.setCountry(truncate(req.getCountry(), MAX_SHORT_LENGTH, null));
        lead.setState(truncate(req.getState(), MAX_SHORT_LENGTH, null));
        lead.setCityArea(truncate(req.getCityArea(), MAX_SHORT_LENGTH, null));
        lead.setAddress(truncate(req.getAddress(), MAX_TEXT_LENGTH, null));
        lead.setBranches(truncate(req.getBranches(), 50, null));
        lead.setMemberCount(truncate(req.getMemberCount(), 50, null));
        lead.setStaffCount(truncate(req.getStaffCount(), 50, null));
        lead.setServices(capList(req.getServices()));
        lead.setCurrentSoftware(truncate(req.getCurrentSoftware(), MAX_SHORT_LENGTH, null));
        lead.setReasonsToSwitch(capList(req.getReasonsToSwitch()));
        lead.setGoals(capList(req.getGoals()));
        lead.setContactName(truncate(req.getContactName(), MAX_SHORT_LENGTH, null));
        lead.setContactEmail(truncate(req.getContactEmail(), MAX_SHORT_LENGTH, null));
        lead.setContactPhone(truncate(req.getContactPhone(), 50, null));
        lead.setContactWhatsapp(truncate(req.getContactWhatsapp(), 50, null));
        lead.setNotes(truncate(req.getNotes(), MAX_TEXT_LENGTH, null));
        lead.setSource("Pricing page onboarding");
        lead.setSubmittedFromIp(truncate(sourceIp, 64, null));

        return toDTO(platformLeadRepository.save(lead));
    }

    // ── Admin reads ────────────────────────────────────────────────────────

    @Transactional(value = "controlPlaneTransactionManager", readOnly = true)
    public PlatformLeadPageResponseDTO getByStage(String stage, int page, int size, String search) {
        Pageable pageable = PageRequest.of(Math.max(page - 1, 0), size, Sort.by("createdAt").descending());
        Page<PlatformLead> result = platformLeadRepository.searchByStage(stage, search, pageable);
        List<PlatformLeadResponseDTO> dtos = result.getContent().stream().map(this::toDTO).collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO();
        pagination.setPage(page);
        pagination.setTotalPages(result.getTotalPages());
        pagination.setTotal(result.getTotalElements());
        pagination.setLimit(size);

        return new PlatformLeadPageResponseDTO(dtos, pagination);
    }

    @Transactional(value = "controlPlaneTransactionManager", readOnly = true)
    public PlatformLeadResponseDTO getById(Long id) {
        return toDTO(findOrThrow(id));
    }

    // ── Stage / status transitions ────────────────────────────────────────

    @Transactional("controlPlaneTransactionManager")
    public PlatformLeadResponseDTO updateLeadStatus(Long id, String leadStatus) {
        PlatformLead lead = findOrThrow(id);
        if (!lead.getStage().equals(PlatformLead.STAGE_LEAD)) {
            throw new BusinessRuleViolationException("Only leads still in the LEAD stage can have their status updated");
        }
        lead.setLeadStatus(leadStatus);
        return toDTO(platformLeadRepository.save(lead));
    }

    @Transactional("controlPlaneTransactionManager")
    public PlatformLeadResponseDTO moveToPendingApproval(Long id) {
        PlatformLead lead = findOrThrow(id);
        if (!lead.getStage().equals(PlatformLead.STAGE_LEAD)) {
            throw new BusinessRuleViolationException("Only a lead can be approved for onboarding");
        }
        lead.setStage(PlatformLead.STAGE_PENDING_APPROVAL);
        return toDTO(platformLeadRepository.save(lead));
    }

    @Transactional("controlPlaneTransactionManager")
    public PlatformLeadResponseDTO reject(Long id) {
        PlatformLead lead = findOrThrow(id);
        if (lead.getStage().equals(PlatformLead.STAGE_APPROVED)) {
            throw new BusinessRuleViolationException("An already-approved record cannot be rejected");
        }
        lead.setStage(PlatformLead.STAGE_REJECTED);
        return toDTO(platformLeadRepository.save(lead));
    }

    /**
     * Called after the frontend successfully calls POST /api/gyms with this lead's
     * data and receives back a tenant id/slug — records the outcome, does not
     * create anything itself.
     */
    @Transactional("controlPlaneTransactionManager")
    public PlatformLeadResponseDTO markApproved(Long id, Long gymTenantId, String gymSlug) {
        PlatformLead lead = findOrThrow(id);
        if (!lead.getStage().equals(PlatformLead.STAGE_PENDING_APPROVAL)) {
            throw new BusinessRuleViolationException("Only a record in Pending Approval can be marked approved");
        }
        lead.setStage(PlatformLead.STAGE_APPROVED);
        lead.setGymTenantId(gymTenantId);
        lead.setGymSlug(gymSlug);
        lead.setApprovedAt(LocalDateTime.now());
        return toDTO(platformLeadRepository.save(lead));
    }

    // ── Follow-ups ─────────────────────────────────────────────────────────

    @Transactional("controlPlaneTransactionManager")
    public PlatformLeadResponseDTO addFollowUp(Long leadId, PlatformLeadFollowUpRequestDTO req) {
        PlatformLead lead = findOrThrow(leadId);

        if (req.getType() == null || req.getDueDate() == null || req.getDueDate().isBlank()) {
            throw new BusinessRuleViolationException("Follow-up type and due date are required");
        }
        LocalDateTime dueDate;
        try {
            dueDate = LocalDateTime.parse(req.getDueDate());
        } catch (DateTimeParseException e) {
            throw new BusinessRuleViolationException("Invalid due date format");
        }

        PlatformLeadFollowUp followUp = new PlatformLeadFollowUp();
        followUp.setPlatformLead(lead);
        followUp.setType(req.getType());
        followUp.setDueDate(dueDate);
        followUp.setNotes(truncate(req.getNotes(), MAX_TEXT_LENGTH, null));
        followUp.setStatus(PlatformLeadFollowUp.STATUS_PENDING);
        lead.getFollowUps().add(followUp);

        if (lead.getStage().equals(PlatformLead.STAGE_LEAD)) {
            lead.setLeadStatus(PlatformLead.LEAD_STATUS_FOLLOW_UP);
        }

        return toDTO(platformLeadRepository.save(lead));
    }

    @Transactional("controlPlaneTransactionManager")
    public PlatformLeadResponseDTO completeFollowUp(Long leadId, Long followUpId) {
        PlatformLead lead = findOrThrow(leadId);
        PlatformLeadFollowUp followUp = lead.getFollowUps().stream()
                .filter(f -> f.getId().equals(followUpId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Follow-up not found: " + followUpId));
        followUp.setStatus(PlatformLeadFollowUp.STATUS_COMPLETED);
        return toDTO(platformLeadRepository.save(lead));
    }

    // ── Mapping / helpers ──────────────────────────────────────────────────

    private PlatformLead findOrThrow(Long id) {
        return platformLeadRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Platform lead not found: " + id));
    }

    private String truncate(String value, int maxLength, String fallback) {
        if (value == null || value.isBlank()) return fallback;
        String trimmed = value.trim();
        return trimmed.length() > maxLength ? trimmed.substring(0, maxLength) : trimmed;
    }

    private List<String> capList(List<String> values) {
        if (values == null || values.isEmpty()) return new ArrayList<>();
        return values.stream()
                .filter(v -> v != null && !v.isBlank())
                .map(v -> v.length() > MAX_SHORT_LENGTH ? v.substring(0, MAX_SHORT_LENGTH) : v)
                .limit(MAX_LIST_ITEMS)
                .collect(Collectors.toList());
    }

    private PlatformLeadResponseDTO toDTO(PlatformLead lead) {
        PlatformLeadResponseDTO dto = new PlatformLeadResponseDTO();
        dto.setId(lead.getId());
        dto.setStage(lead.getStage());
        dto.setLeadStatus(lead.getLeadStatus());
        dto.setBusinessName(lead.getBusinessName());
        dto.setPlanInterest(lead.getPlanInterest());
        dto.setBusinessTypes(lead.getBusinessTypes());
        dto.setYearsInBusiness(lead.getYearsInBusiness());
        dto.setCountry(lead.getCountry());
        dto.setState(lead.getState());
        dto.setCityArea(lead.getCityArea());
        dto.setAddress(lead.getAddress());
        dto.setBranches(lead.getBranches());
        dto.setMemberCount(lead.getMemberCount());
        dto.setStaffCount(lead.getStaffCount());
        dto.setServices(lead.getServices());
        dto.setCurrentSoftware(lead.getCurrentSoftware());
        dto.setReasonsToSwitch(lead.getReasonsToSwitch());
        dto.setGoals(lead.getGoals());
        dto.setContactName(lead.getContactName());
        dto.setContactEmail(lead.getContactEmail());
        dto.setContactPhone(lead.getContactPhone());
        dto.setContactWhatsapp(lead.getContactWhatsapp());
        dto.setNotes(lead.getNotes());
        dto.setSource(lead.getSource());
        dto.setGymTenantId(lead.getGymTenantId());
        dto.setGymSlug(lead.getGymSlug());
        dto.setApprovedAt(lead.getApprovedAt());
        dto.setCreatedAt(lead.getCreatedAt());
        dto.setUpdatedAt(lead.getUpdatedAt());
        dto.setFollowUps(
                lead.getFollowUps() == null ? Collections.emptyList() :
                        lead.getFollowUps().stream().map(this::toFollowUpDTO).collect(Collectors.toList())
        );
        return dto;
    }

    private PlatformLeadFollowUpResponseDTO toFollowUpDTO(PlatformLeadFollowUp f) {
        PlatformLeadFollowUpResponseDTO dto = new PlatformLeadFollowUpResponseDTO();
        dto.setId(f.getId());
        dto.setType(f.getType());
        dto.setDueDate(f.getDueDate());
        dto.setNotes(f.getNotes());
        dto.setStatus(f.getStatus());
        return dto;
    }
}
