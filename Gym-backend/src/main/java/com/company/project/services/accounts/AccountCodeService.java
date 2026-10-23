package com.company.project.services.accounts;

import com.company.project.controlplane.entities.AccountCode;
import com.company.project.controlplane.repositories.AccountCodeRepository;
import com.company.project.exceptions.OtpException;
import com.company.project.services.EmailService;
import com.company.project.services.mobile.auth.OtpService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.time.LocalDateTime;

/**
 * Six-digit codes emailed to a GymBios account — to verify its email address, or to
 * reset a forgotten password. Same limits as registration OTPs
 * (MobilePendingRegistrationService): 10-minute expiry, 5 tries per code, 60 seconds
 * between sends. Only the account's latest code for a purpose is ever valid.
 */
@Service
public class AccountCodeService {

    private static final Logger log = LoggerFactory.getLogger(AccountCodeService.class);

    private static final int EXPIRY_MINUTES = 10;
    private static final int MAX_ATTEMPTS = 5;
    private static final int RESEND_COOLDOWN_SECONDS = 60;

    /** A freshly issued code, and whether the email actually went out. */
    public record Issued(String code, boolean emailed) {}

    private final AccountCodeRepository codeRepository;
    private final OtpService otpService;
    private final EmailService emailService;

    public AccountCodeService(AccountCodeRepository codeRepository, OtpService otpService, EmailService emailService) {
        this.codeRepository = codeRepository;
        this.otpService = otpService;
        this.emailService = emailService;
    }

    /** Throws RESEND_COOLDOWN if a code for this purpose went out under a minute ago. */
    public Issued issue(long globalUserId, String purpose, String email) {
        codeRepository.findFirstByGlobalUserIdAndPurposeOrderByCreatedAtDesc(globalUserId, purpose)
                .filter(last -> last.getCreatedAt() != null
                        && last.getCreatedAt().plusSeconds(RESEND_COOLDOWN_SECONDS).isAfter(LocalDateTime.now()))
                .ifPresent(last -> {
                    throw new OtpException(HttpStatus.TOO_MANY_REQUESTS, "RESEND_COOLDOWN",
                            "Please wait a minute before requesting another code.");
                });

        String code = otpService.generateOtp();
        AccountCode row = new AccountCode();
        row.setGlobalUserId(globalUserId);
        row.setPurpose(purpose);
        row.setEmail(email.trim().toLowerCase());
        row.setCodeHash(otpService.hash(code));
        row.setExpiresAt(LocalDateTime.now().plusMinutes(EXPIRY_MINUTES));
        codeRepository.save(row);

        return new Issued(code, send(email, purpose, code));
    }

    /** Checks and consumes the latest code; wrong guesses count toward its 5 tries. */
    public void verify(long globalUserId, String purpose, String email, String code) {
        AccountCode row = codeRepository.findFirstByGlobalUserIdAndPurposeOrderByCreatedAtDesc(globalUserId, purpose)
                .filter(c -> c.getConsumedAt() == null && c.getEmail().equalsIgnoreCase(email.trim()))
                .orElseThrow(() -> new OtpException(HttpStatus.BAD_REQUEST, "INVALID_CODE",
                        "This code is no longer valid. Request a new one."));
        if (row.getAttemptCount() >= MAX_ATTEMPTS) {
            throw new OtpException(HttpStatus.TOO_MANY_REQUESTS, "CODE_LOCKED",
                    "Too many incorrect attempts for this code. Request a new one.");
        }
        boolean expired = LocalDateTime.now().isAfter(row.getExpiresAt());
        if (expired || !otpService.matches(code, row.getCodeHash())) {
            row.setAttemptCount(row.getAttemptCount() + 1);
            codeRepository.save(row);
            throw new OtpException(HttpStatus.BAD_REQUEST, "INVALID_CODE",
                    expired ? "This code has expired. Request a new one." : "Incorrect code.");
        }
        row.setConsumedAt(LocalDateTime.now());
        codeRepository.save(row);
    }

    private boolean send(String email, String purpose, String code) {
        if (!emailService.isConfigured()) {
            log.warn("SMTP not configured — {} code for {} not emailed", purpose, email);
            return false;
        }
        boolean reset = AccountCode.PASSWORD_RESET.equals(purpose);
        String subject = reset ? "Your GymBios password reset code" : "Confirm your GymBios email";
        String html = "<p>Your code is <strong style=\"font-size:20px;letter-spacing:3px\">"
                + HtmlUtils.htmlEscape(code) + "</strong></p>"
                + "<p>It expires in " + EXPIRY_MINUTES + " minutes.</p>"
                + (reset
                    ? "<p>If you didn't ask to reset your password, you can ignore this email — your password stays the same.</p>"
                    : "<p>Enter it in the GymBios app to confirm this is your email address.</p>");
        try {
            emailService.sendEmail(email, subject, html);
            return true;
        } catch (Exception e) {
            log.error("Failed to email {} code to {}", purpose, email, e);
            return false;
        }
    }
}
