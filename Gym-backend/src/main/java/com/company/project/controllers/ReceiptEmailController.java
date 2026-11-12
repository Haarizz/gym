package com.company.project.controllers;

import com.company.project.services.email.ReceiptEmailService;
import com.company.project.services.email.ReceiptEmailService.Info;
import com.company.project.services.email.ReceiptEmailService.SendRequest;
import com.company.project.services.email.ReceiptEmailService.SendResult;
import org.springframework.web.bind.annotation.*;

/**
 * Billing › Email receipt / Email invoice. Under /api/receipts/**, so ModulePermissionRules'
 * receipts rule applies (Billing / Payments / Members / … write access to send).
 */
@RestController
@RequestMapping("/api/receipts/{id}")
public class ReceiptEmailController {

    private final ReceiptEmailService service;

    public ReceiptEmailController(ReceiptEmailService service) {
        this.service = service;
    }

    /** The member's email address, whether email is set up, and the emails already sent for this receipt. */
    @GetMapping("/email-info")
    public Info info(@PathVariable Long id) {
        return service.info(id);
    }

    /** Emails the receipt or invoice PDF with the given message. */
    @PostMapping("/email")
    public SendResult send(@PathVariable Long id, @RequestBody SendRequest request) {
        return service.send(id, request);
    }
}
