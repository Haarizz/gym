package com.company.project.controllers;

import com.company.project.dto.MemberRequestDTO;
import com.company.project.dto.MemberResponseDTO;
import com.company.project.dto.MembersPageResponseDTO;
import com.company.project.services.MemberService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    /**
     * GET /api/members?page=1&limit=20&search=&status=&membership_type=&payment_status=
     * Returns paginated list: { members: [...], pagination: {...} }
     */
    @GetMapping
    public ResponseEntity<MembersPageResponseDTO> getMembers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(name = "membership_type", required = false) String membershipType,
            @RequestParam(name = "payment_status",  required = false) String paymentStatus,
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int limit) {

        return ResponseEntity.ok(
                memberService.getMembers(search, status, membershipType, paymentStatus, page, limit)
        );
    }

    /**
     * GET /api/members/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<MemberResponseDTO> getMemberById(@PathVariable Long id) {
        return ResponseEntity.ok(memberService.getMemberById(id));
    }

    /**
     * POST /api/members
     */
    @PostMapping
    public ResponseEntity<MemberResponseDTO> createMember(@RequestBody MemberRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(memberService.createMember(request));
    }

    /**
     * PUT /api/members/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<MemberResponseDTO> updateMember(
            @PathVariable Long id,
            @RequestBody MemberRequestDTO request) {
        return ResponseEntity.ok(memberService.updateMember(id, request));
    }

    /**
     * DELETE /api/members/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMember(@PathVariable Long id) {
        memberService.deleteMember(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/members/{id}/renew
     */
    @PostMapping("/{id}/renew")
    public ResponseEntity<MemberResponseDTO> renewMember(
            @PathVariable Long id,
            @RequestBody com.company.project.dto.RenewalRequestDTO request) {
        return ResponseEntity.ok(memberService.renewMember(id, request));
    }

    /**
     * POST /api/members/{id}/freeze
     */
    @PostMapping("/{id}/freeze")
    public ResponseEntity<MemberResponseDTO> freezeMember(
            @PathVariable Long id,
            @RequestBody com.company.project.dto.FreezeRequestDTO request) {
        return ResponseEntity.ok(memberService.freezeMember(id, request));
    }

    /**
     * POST /api/members/{id}/unfreeze
     */
    @PostMapping("/{id}/unfreeze")
    public ResponseEntity<MemberResponseDTO> unfreezeMember(@PathVariable Long id) {
        return ResponseEntity.ok(memberService.unfreezeMember(id));
    }
}
