package com.company.project.controllers.mobile.membership;

import com.company.project.dto.mobile.membership.MobilePaymentHistoryDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.membership.MobileMemberPaymentsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/mobile/member/membership/payments")
public class MobileMemberPaymentsController {

    private final MobileMemberPaymentsService paymentsService;

    public MobileMemberPaymentsController(MobileMemberPaymentsService paymentsService) {
        this.paymentsService = paymentsService;
    }

    @GetMapping
    public ResponseEntity<List<MobilePaymentHistoryDTO>> getPaymentHistory(
            @AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(paymentsService.getPaymentHistory(principal));
    }
}
