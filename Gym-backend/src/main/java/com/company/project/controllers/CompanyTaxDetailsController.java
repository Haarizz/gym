package com.company.project.controllers;

import com.company.project.dto.CompanyTaxDetailsDTO;
import com.company.project.services.CompanyTaxDetailsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/company-tax-details")
public class CompanyTaxDetailsController {

    private final CompanyTaxDetailsService companyTaxDetailsService;

    public CompanyTaxDetailsController(CompanyTaxDetailsService companyTaxDetailsService) {
        this.companyTaxDetailsService = companyTaxDetailsService;
    }

    @GetMapping
    public ResponseEntity<CompanyTaxDetailsDTO> get() {
        return ResponseEntity.ok(companyTaxDetailsService.get());
    }

    @PutMapping
    public ResponseEntity<CompanyTaxDetailsDTO> update(@RequestBody CompanyTaxDetailsDTO req) {
        return ResponseEntity.ok(companyTaxDetailsService.update(req));
    }
}
