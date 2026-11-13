package com.company.project.controllers;

import com.company.project.services.MembershipCancellationService;
import com.company.project.services.MembershipCancellationService.RequestRow;
import com.company.project.services.MembershipCancellationService.Result;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Approvals › Cancellations. Under /api/members/** (Members write access); approving or
 * rejecting is further limited to Admin / Manager roles in the service.
 */
@RestController
@RequestMapping("/api/members/cancellation-requests")
public class MembershipCancellationRequestController {

    private final MembershipCancellationService service;

    public MembershipCancellationRequestController(MembershipCancellationService service) {
        this.service = service;
    }

    /** status=PENDING (default) for the queue; anything else for decided ones. */
    @GetMapping
    public List<RequestRow> list(@RequestParam(required = false) String status) {
        return service.requests(status);
    }

    @GetMapping("/can-approve")
    public Map<String, Boolean> canApprove() {
        return Map.of("can_approve", service.isApprover());
    }

    @PostMapping("/{id}/approve")
    public Result approve(@PathVariable Long id) {
        return service.approve(id);
    }

    @PostMapping("/{id}/reject")
    public void reject(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        service.reject(id, body == null ? null : body.get("note"));
    }

    @PostMapping("/{id}/withdraw")
    public void withdraw(@PathVariable Long id) {
        service.withdraw(id);
    }
}
