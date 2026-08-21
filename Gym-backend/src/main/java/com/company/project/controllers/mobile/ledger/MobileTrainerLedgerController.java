package com.company.project.controllers.mobile.ledger;

import com.company.project.dto.mobile.ledger.trainer.TrainerLedgerResponseDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.ledger.MobileTrainerLedgerService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mobile/trainer/ledger")
public class MobileTrainerLedgerController {

    private final MobileTrainerLedgerService ledgerService;

    public MobileTrainerLedgerController(MobileTrainerLedgerService ledgerService) {
        this.ledgerService = ledgerService;
    }

    @GetMapping
    public ResponseEntity<TrainerLedgerResponseDTO> getLedger(
            @AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(ledgerService.getTrainerLedger(principal));
    }
}
