package com.company.project.controllers;

import com.company.project.services.MemberRefundService;
import com.company.project.services.MemberRefundService.MemberBills;
import com.company.project.services.MemberRefundService.Options;
import com.company.project.services.MemberRefundService.Refund;
import com.company.project.services.MemberRefundService.RefundPage;
import com.company.project.services.MemberRefundService.RefundRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * Billing › Refunds. Gated in ModulePermissionRules: reading needs a billing / finance /
 * members module, making a refund needs Billing write access.
 */
@RestController
@RequestMapping("/api/billing/refunds")
public class MemberRefundController {

    private final MemberRefundService service;
    private final com.company.project.services.MembershipCancellationService cancellations;

    public MemberRefundController(MemberRefundService service,
                                  com.company.project.services.MembershipCancellationService cancellations) {
        this.service = service;
        this.cancellations = cancellations;
    }

    /** Cancel a membership with a refund (Members › Cancel membership → "Cancel with refund"). */
    @PostMapping("/cancellation/{memberDbId}")
    public com.company.project.services.MembershipCancellationService.Result cancelWithRefund(
            @PathVariable Long memberDbId,
            @RequestBody com.company.project.services.MembershipCancellationService.RefundCancelRequest request) {
        return cancellations.cancelWithRefund(memberDbId, request);
    }

    @GetMapping("/options")
    public Options options() {
        return service.options();
    }

    @GetMapping("/member/{memberDbId}")
    public MemberBills memberBills(@PathVariable Long memberDbId) {
        return service.memberBills(memberDbId);
    }

    @GetMapping
    public RefundPage list(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                           @RequestParam(required = false) String search,
                           @RequestParam(required = false) String method,
                           @RequestParam(required = false) String reason,
                           @RequestParam(defaultValue = "1") int page,
                           @RequestParam(defaultValue = "25") int limit) {
        return service.list(from, to, search, method, reason, page, limit);
    }

    @GetMapping("/{id}")
    public Refund get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    public Refund refund(@RequestBody RefundRequest request) {
        return service.refund(request);
    }
}
