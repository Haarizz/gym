package com.company.project.controllers.mobile.leads;

import com.company.project.dto.mobile.leads.CreateMobileStaffLeadRequestDTO;
import com.company.project.dto.mobile.leads.CreateMobileStaffLeadResponseDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.leads.MobileStaffLeadService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mobile/staff/leads")
public class MobileStaffLeadController {

    private final MobileStaffLeadService mobileStaffLeadService;

    public MobileStaffLeadController(MobileStaffLeadService mobileStaffLeadService) {
        this.mobileStaffLeadService = mobileStaffLeadService;
    }

    /**
     * POST /api/mobile/staff/leads
     * Creates a new Lead and its initial Follow-Up in a single transaction.
     * Automatically assigns the Follow-Up to the authenticated Staff member.
     */
    @PostMapping
    public ResponseEntity<CreateMobileStaffLeadResponseDTO> createLeadAndFollowUp(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestBody CreateMobileStaffLeadRequestDTO request) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        CreateMobileStaffLeadResponseDTO response = mobileStaffLeadService.createLeadAndFollowUp(principal, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
