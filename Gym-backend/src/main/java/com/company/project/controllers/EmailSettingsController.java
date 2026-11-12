package com.company.project.controllers;

import com.company.project.services.email.EmailSettingsService;
import com.company.project.services.email.EmailSettingsService.Request;
import com.company.project.services.email.EmailSettingsService.Response;
import com.company.project.services.email.EmailSettingsService.TestRequest;
import com.company.project.services.email.EmailSettingsService.TestResult;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * GymOS › Settings › Email: the gym's own SMTP mailbox (gym-wide, not per branch).
 * Also gated in ModulePermissionRules (SETTINGS read / write).
 */
@RestController
@RequestMapping("/api/email-settings")
public class EmailSettingsController {

    private final EmailSettingsService service;

    public EmailSettingsController(EmailSettingsService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('SETTINGS_VIEW')")
    public Response get() {
        return service.get();
    }

    @PutMapping
    @PreAuthorize("hasAuthority('SETTINGS_EDIT')")
    public Response save(@RequestBody Request request) {
        return service.save(request);
    }

    /** Sends a test email through the saved settings, optionally with a PDF (the test invoice) attached. */
    @PostMapping("/test")
    @PreAuthorize("hasAuthority('SETTINGS_EDIT')")
    public TestResult test(@RequestBody TestRequest request) {
        return service.test(request);
    }
}
