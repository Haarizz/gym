package com.company.project.services.mobile.leads;

import com.company.project.dto.FollowUpRequestDTO;
import com.company.project.dto.FollowUpResponseDTO;
import com.company.project.dto.LeadRequestDTO;
import com.company.project.dto.LeadResponseDTO;
import com.company.project.dto.mobile.leads.CreateMobileStaffLeadRequestDTO;
import com.company.project.dto.mobile.leads.CreateMobileStaffLeadResponseDTO;
import com.company.project.dto.mobile.leads.MobileCreatedFollowUpDTO;
import com.company.project.dto.mobile.leads.MobileCreatedLeadDTO;
import com.company.project.entities.Staff;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.StaffRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.FollowUpService;
import com.company.project.services.LeadService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class MobileStaffLeadService {

    private final LeadService leadService;
    private final FollowUpService followUpService;
    private final StaffRepository staffRepository;

    public MobileStaffLeadService(LeadService leadService, FollowUpService followUpService, StaffRepository staffRepository) {
        this.leadService = leadService;
        this.followUpService = followUpService;
        this.staffRepository = staffRepository;
    }

    public CreateMobileStaffLeadResponseDTO createLeadAndFollowUp(UserDetailsImpl principal, CreateMobileStaffLeadRequestDTO request) {
        // Resolve authenticated staff
        Staff staff = staffRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new EntityNotFoundException("Staff not found for user ID: " + principal.getId()));

        // 1. Create Lead
        LeadRequestDTO leadRequest = new LeadRequestDTO();
        leadRequest.setFirstName(request.getFirstName());
        leadRequest.setLastName(request.getLastName());
        leadRequest.setEmail(request.getEmail());
        leadRequest.setPhone(request.getPhone());
        leadRequest.setStatus(request.getStatus());
        leadRequest.setSource(request.getSource());
        leadRequest.setPriority(request.getPriority());
        leadRequest.setInterestLevel(request.getInterestLevel());
        leadRequest.setNotes(request.getNotes());
        leadRequest.setTags(request.getTags());
        leadRequest.setMembershipInterest(request.getMembershipInterest());
        leadRequest.setBudget(request.getBudget());
        leadRequest.setPreferredContactMethod(request.getPreferredContactMethod());
        leadRequest.setLeadScore(request.getLeadScore());
        // Deliberately NOT setting assignedStaff here to preserve existing lead behavior

        LeadResponseDTO createdLead = leadService.createLead(leadRequest);

        // 2. Create Follow-Up
        FollowUpRequestDTO followUpRequest = new FollowUpRequestDTO();
        followUpRequest.setLeadId(createdLead.getId());
        followUpRequest.setAssignedStaff(staff.getName()); // Assign to authenticated staff
        followUpRequest.setType(request.getFollowUpType());
        followUpRequest.setStatus(request.getFollowUpStatus());
        followUpRequest.setPriority(request.getFollowUpPriority());
        followUpRequest.setDueDate(request.getFollowUpDueDate());
        followUpRequest.setScheduledTime(request.getFollowUpScheduledTime());
        followUpRequest.setSubject(request.getFollowUpSubject());
        followUpRequest.setNotes(request.getFollowUpNotes());
        followUpRequest.setTags(request.getFollowUpTags());
        followUpRequest.setMembershipStatus(request.getFollowUpMembershipStatus());
        followUpRequest.setMembershipPlan(request.getFollowUpMembershipPlan());
        followUpRequest.setFollowUpReason(request.getFollowUpReason());
        followUpRequest.setEstimatedDuration(request.getFollowUpEstimatedDuration());
        followUpRequest.setOutcome(request.getFollowUpOutcome());

        FollowUpResponseDTO createdFollowUp = followUpService.createFollowUp(followUpRequest);

        // 3. Map to Mobile Response DTOs
        MobileCreatedLeadDTO mobileLead = new MobileCreatedLeadDTO();
        mobileLead.setId(createdLead.getId());
        mobileLead.setLeadId(createdLead.getLeadId());
        mobileLead.setFirstName(createdLead.getFirstName());
        mobileLead.setLastName(createdLead.getLastName());
        mobileLead.setEmail(createdLead.getEmail());
        mobileLead.setPhone(createdLead.getPhone());
        mobileLead.setStatus(createdLead.getStatus());
        mobileLead.setPriority(createdLead.getPriority());
        mobileLead.setAssignedStaff(createdLead.getAssignedStaff()); // Will be whatever the existing LeadService set it to (likely null)
        mobileLead.setNotes(createdLead.getNotes());
        mobileLead.setTags(createdLead.getTags());
        mobileLead.setCreatedAt(createdLead.getCreatedAt());

        MobileCreatedFollowUpDTO mobileFollowUp = new MobileCreatedFollowUpDTO();
        mobileFollowUp.setId(createdFollowUp.getId());
        mobileFollowUp.setFollowUpId(createdFollowUp.getFollowUpId());
        mobileFollowUp.setLeadId(createdFollowUp.getLeadId());
        mobileFollowUp.setType(createdFollowUp.getType());
        mobileFollowUp.setStatus(createdFollowUp.getStatus());
        mobileFollowUp.setPriority(createdFollowUp.getPriority());
        mobileFollowUp.setAssignedStaff(createdFollowUp.getAssignedStaff());
        mobileFollowUp.setDueDate(createdFollowUp.getDueDate());
        mobileFollowUp.setSubject(createdFollowUp.getSubject());
        mobileFollowUp.setNotes(createdFollowUp.getNotes());
        mobileFollowUp.setCreatedAt(createdFollowUp.getCreatedAt());

        CreateMobileStaffLeadResponseDTO response = new CreateMobileStaffLeadResponseDTO();
        response.setLead(mobileLead);
        response.setFollowUp(mobileFollowUp);

        return response;
    }
}
