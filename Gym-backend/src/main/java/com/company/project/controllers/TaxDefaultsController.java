package com.company.project.controllers;

import com.company.project.services.TaxPolicyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * GET /api/tax-defaults — the active branch's tax policy for every sales and purchase screen:
 * whether it is VAT registered (TRN switch) and its default VAT, sales and purchase tax rates.
 * Read-only and open to any signed-in user (the POS needs it); the values are edited in
 * Settings › Tax Configuration through /api/financial-settings.
 */
@RestController
@RequestMapping("/api/tax-defaults")
public class TaxDefaultsController {

    private final TaxPolicyService taxPolicyService;

    public TaxDefaultsController(TaxPolicyService taxPolicyService) {
        this.taxPolicyService = taxPolicyService;
    }

    @GetMapping
    public ResponseEntity<TaxPolicyService.TaxDefaults> current() {
        return ResponseEntity.ok(taxPolicyService.current());
    }
}
