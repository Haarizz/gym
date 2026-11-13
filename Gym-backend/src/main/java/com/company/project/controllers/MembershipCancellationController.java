package com.company.project.controllers;

import com.company.project.services.MembershipCancellationService;
import com.company.project.services.MembershipCancellationService.CancelRequest;
import com.company.project.services.MembershipCancellationService.HoldRequest;
import com.company.project.services.MembershipCancellationService.Preview;
import com.company.project.services.MembershipCancellationService.Result;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Members › Cancel membership. Writes need Members write access (ModulePermissionRules'
 * /api/members/** rule). Cancelling WITH a refund lives in Billing › Refunds
 * (MemberRefundController), so it needs Billing write access.
 */
@RestController
@RequestMapping("/api/members/{id}/cancellation")
public class MembershipCancellationController {

    private final MembershipCancellationService service;

    public MembershipCancellationController(MembershipCancellationService service) {
        this.service = service;
    }

    /** The review: household, usage, dues, and the policy's refund. */
    @GetMapping
    public Preview preview(@PathVariable Long id) {
        return service.preview(id);
    }

    /** Cancel without a refund. */
    @PostMapping
    public Result cancel(@PathVariable Long id, @RequestBody CancelRequest request) {
        return service.cancel(id, request);
    }

    /** Hold the cancellation (membership suspended) until the dues are cleared. */
    @PostMapping("/hold")
    public Preview hold(@PathVariable Long id, @RequestBody HoldRequest request) {
        return service.hold(id, request);
    }

    /** Withdraw a held cancellation. */
    @DeleteMapping("/hold")
    public Preview releaseHold(@PathVariable Long id) {
        return service.releaseHold(id);
    }
}
