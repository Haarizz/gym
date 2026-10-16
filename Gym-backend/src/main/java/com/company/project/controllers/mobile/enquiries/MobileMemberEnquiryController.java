package com.company.project.controllers.mobile.enquiries;

import com.company.project.dto.enquiries.MemberEnquiryDTO;
import com.company.project.dto.enquiries.MemberEnquiryRequestDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.enquiries.MobileMemberEnquiryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** The member app's enquiries to their gym (Profile → Raise Enquiry). */
@RestController
@RequestMapping("/api/mobile/member/enquiries")
public class MobileMemberEnquiryController {

    private final MobileMemberEnquiryService service;

    public MobileMemberEnquiryController(MobileMemberEnquiryService service) {
        this.service = service;
    }

    /** The member's own enquiries, newest first, with the gym's reply once there is one. */
    @GetMapping
    public ResponseEntity<List<MemberEnquiryDTO>> list(@AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(service.list(principal));
    }

    /** Body: { "category": "BILLING", "subject": "...", "message": "..." }. */
    @PostMapping
    public ResponseEntity<MemberEnquiryDTO> create(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestBody MemberEnquiryRequestDTO request) {
        return ResponseEntity.ok(service.create(principal, request));
    }
}
