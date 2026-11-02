package com.company.project.controllers.mobile.ledger;

import com.company.project.dto.mobile.ledger.MobileSalaryAdvanceDTOs.Advance;
import com.company.project.dto.mobile.ledger.MobileSalaryAdvanceDTOs.CreateRequest;
import com.company.project.dto.mobile.ledger.MobileSalaryAdvanceDTOs.Overview;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.ledger.MobileSalaryAdvanceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** The signed-in staff's own salary advance requests (see MobileSalaryAdvanceService). */
@RestController
@RequestMapping("/api/mobile/staff/salary-advances")
public class MobileStaffSalaryAdvanceController {

    private final MobileSalaryAdvanceService service;

    public MobileStaffSalaryAdvanceController(MobileSalaryAdvanceService service) {
        this.service = service;
    }

    @GetMapping
    public Overview list(@AuthenticationPrincipal UserDetailsImpl principal) {
        return service.overview(principal);
    }

    /** Body: { amount, reason }. */
    @PostMapping
    public ResponseEntity<Advance> create(@AuthenticationPrincipal UserDetailsImpl principal,
                                          @RequestBody CreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(principal, request));
    }

    @PostMapping("/{id}/cancel")
    public Advance cancel(@AuthenticationPrincipal UserDetailsImpl principal, @PathVariable Long id) {
        return service.cancel(principal, id);
    }
}
