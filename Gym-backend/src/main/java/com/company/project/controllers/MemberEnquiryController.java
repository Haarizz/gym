package com.company.project.controllers;

import com.company.project.dto.enquiries.MemberEnquiryDTO;
import com.company.project.dto.enquiries.MemberEnquiryRequestDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.MemberEnquiryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * The gym's Enquiries page: what members asked from the mobile app, one reply each.
 * Member Connect permissions, like Ratings: answering members is member communication,
 * and a new permission key wouldn't reach existing gyms' roles.
 */
@RestController
@RequestMapping("/api/enquiries")
public class MemberEnquiryController {

    private final MemberEnquiryService service;

    public MemberEnquiryController(MemberEnquiryService service) {
        this.service = service;
    }

    /** GET /api/enquiries?status=OPEN&category=BILLING&page=0&size=20 */
    @GetMapping
    @PreAuthorize("hasAuthority('MEMBER_CONNECT_VIEW')")
    public ResponseEntity<MemberEnquiryService.PageResult> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.list(status, category, page, size));
    }

    /** Body: { "reply": "..." } */
    @PostMapping("/{id}/reply")
    @PreAuthorize("hasAuthority('MEMBER_CONNECT_EDIT')")
    public ResponseEntity<MemberEnquiryDTO> reply(
            @PathVariable Long id,
            @RequestBody MemberEnquiryRequestDTO request,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        String repliedBy = principal != null ? principal.getUsername() : "Admin";
        return ResponseEntity.ok(service.reply(id, request.getReply(), repliedBy));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAuthority('MEMBER_CONNECT_EDIT')")
    public ResponseEntity<MemberEnquiryDTO> close(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        String closedBy = principal != null ? principal.getUsername() : "Admin";
        return ResponseEntity.ok(service.close(id, closedBy));
    }
}
