package com.company.project.controllers;

import com.company.project.services.PaymentTermsService;
import com.company.project.services.PaymentTermsService.AcceptRequest;
import com.company.project.services.PaymentTermsService.Acceptance;
import com.company.project.services.PaymentTermsService.AcceptanceDetail;
import com.company.project.services.PaymentTermsService.AcceptanceLog;
import com.company.project.services.PaymentTermsService.Request;
import com.company.project.services.PaymentTermsService.Terms;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Payment Terms: managed in GymOS › Settings (SETTINGS_VIEW / SETTINGS_EDIT); the
 * desk endpoints (active terms for a payment, recording an acceptance) are open to any
 * staff user who can take a payment.
 */
@RestController
@RequestMapping("/api/payment-terms")
public class PaymentTermsController {

    private final PaymentTermsService service;

    public PaymentTermsController(PaymentTermsService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('SETTINGS_VIEW')")
    public List<Terms> list(@RequestParam(required = false) Long branchId) {
        return service.list(branchId);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('SETTINGS_EDIT')")
    public Terms create(@RequestParam(required = false) Long branchId, @RequestBody Request request) {
        return service.create(branchId, request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('SETTINGS_EDIT')")
    public Terms update(@PathVariable Long id, @RequestBody Request request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('SETTINGS_EDIT')")
    public Map<String, Object> delete(@PathVariable Long id) {
        service.delete(id);
        return Map.of("deleted", true);
    }

    @PutMapping("/order")
    @PreAuthorize("hasAuthority('SETTINGS_EDIT')")
    public List<Terms> reorder(@RequestParam(required = false) Long branchId, @RequestBody List<Long> ids) {
        return service.reorder(branchId, ids);
    }

    @GetMapping("/acceptances")
    @PreAuthorize("hasAuthority('SETTINGS_VIEW')")
    public AcceptanceLog log(@RequestParam(required = false) Long branchId,
                             @RequestParam(defaultValue = "50") int limit) {
        return service.log(branchId, limit);
    }

    @GetMapping("/acceptances/{id}")
    @PreAuthorize("hasAuthority('SETTINGS_VIEW') or hasAuthority('MEMBERS_VIEW')")
    public AcceptanceDetail acceptance(@PathVariable Long id) {
        return service.acceptance(id);
    }

    @GetMapping("/acceptances/member/{memberDbId}")
    @PreAuthorize("hasAuthority('SETTINGS_VIEW') or hasAuthority('MEMBERS_VIEW')")
    public List<Acceptance> forMember(@PathVariable Long memberDbId) {
        return service.forMember(memberDbId);
    }

    // ── Desk ───────────────────────────────────────────────────────────────────

    /** Switched-on terms for one payment kind (empty = no dialog). */
    @GetMapping("/active")
    public List<Terms> active(@RequestParam String kind, @RequestParam(required = false) Long branchId) {
        return service.active(kind, branchId);
    }

    @PostMapping("/accept")
    public List<Acceptance> accept(@RequestBody AcceptRequest request) {
        return service.accept(request);
    }
}
