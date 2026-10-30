package com.company.project.controllers.mobile.auth;

import com.company.project.services.accounts.AccountSelfService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Forgotten password for GymBios accounts — public (no session yet), and only ever
 * through a code sent to the account's verified email. Accounts without one are
 * reset by GymBios support, never by a gym.
 */
@RestController
@RequestMapping("/api/mobile/auth/password-reset")
public class MobilePasswordResetController {

    private static final String SENT_MESSAGE =
            "If this email belongs to a GymBios account with a verified email, we've sent it a code.";

    private final AccountSelfService selfService;

    public MobilePasswordResetController(AccountSelfService selfService) {
        this.selfService = selfService;
    }

    /** Body: { "email": "..." }. Same answer whether or not the account exists. */
    @PostMapping("/request")
    public ResponseEntity<Map<String, String>> request(@RequestBody Map<String, String> body) {
        Map<String, String> response = new LinkedHashMap<>();
        response.put("message", SENT_MESSAGE);
        selfService.requestPasswordReset(body.get("email")).ifPresent(code -> response.put("dev_code", code));
        return ResponseEntity.ok(response);
    }

    /** Body: { "email": "...", "code": "123456", "new_password": "..." } */
    @PostMapping("/confirm")
    public ResponseEntity<Map<String, String>> confirm(@RequestBody Map<String, String> body) {
        selfService.confirmPasswordReset(body.get("email"), body.get("code"), body.get("new_password"));
        return ResponseEntity.ok(Map.of("message", "Your password has been reset. You can sign in now."));
    }
}
