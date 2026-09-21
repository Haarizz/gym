package com.company.project.controllers.mobile.membership;

import com.company.project.dto.mobile.membership.MobileReceiptDetailDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.membership.MobileMemberReceiptsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Read-only mobile endpoints for a member to view their own receipts.
 *
 * <ul>
 *   <li>GET /api/mobile/member/receipts       → List own receipts (newest first)</li>
 *   <li>GET /api/mobile/member/receipts/{id}   → View one receipt (ownership enforced)</li>
 * </ul>
 *
 * Security: The authenticated member is derived from the JWT principal.
 * The service layer enforces ownership — a member can never access another
 * member's receipts. Tenant isolation is handled by the global branch filter.
 */
@RestController
@RequestMapping("/api/mobile/member/receipts")
public class MobileMemberReceiptsController {

    private final MobileMemberReceiptsService receiptsService;

    public MobileMemberReceiptsController(MobileMemberReceiptsService receiptsService) {
        this.receiptsService = receiptsService;
    }

    /**
     * Returns all receipts belonging to the authenticated member, newest first.
     */
    @GetMapping
    public ResponseEntity<List<MobileReceiptDetailDTO>> getMyReceipts(
            @AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(receiptsService.getMyReceipts(principal));
    }

    /**
     * Returns a single receipt's detail. 403 if the receipt belongs to another member.
     */
    @GetMapping("/{id}")
    public ResponseEntity<MobileReceiptDetailDTO> getMyReceiptById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(receiptsService.getMyReceiptById(id, principal));
    }
}
