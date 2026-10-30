package com.company.project.controllers;

import com.company.project.dto.WalletDebitRequestDTO;
import com.company.project.dto.WalletResponseDTO;
import com.company.project.services.WalletService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wallet")
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    /**
     * GET /api/wallet/credits?search=&type=&status=&page=1&size=20 — every wallet credit with
     * what of it is used and left (Billing › Customer Credits), plus a summary of the filter.
     */
    @GetMapping("/credits")
    public ResponseEntity<java.util.Map<String, Object>> credits(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(walletService.credits(search, type, status, page, size));
    }

    /** GET /api/wallet/{memberId} */
    @GetMapping("/{memberId}")
    public ResponseEntity<WalletResponseDTO> getWallet(@PathVariable String memberId) {
        return ResponseEntity.ok(walletService.getWallet(memberId));
    }

    /** POST /api/wallet/{memberId}/debit — checkout "Use Wallet" checkbox. */
    @PostMapping("/{memberId}/debit")
    public ResponseEntity<WalletResponseDTO> debit(@PathVariable String memberId,
                                                    @RequestBody WalletDebitRequestDTO request) {
        return ResponseEntity.ok(walletService.debit(memberId, request.getAmount(),
                request.getSourceType(), request.getSourceId(), request.getRemarks()));
    }
}
