package com.company.project.services.accounts;

import com.company.project.controlplane.entities.AccountCode;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.exceptions.OtpException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * What a person does to their own GymBios account: add/change and verify its email,
 * and reset a forgotten password (docs/global-accounts-for-gym-created-members-plan.md §2).
 * Gyms never reach this — a password is only ever reset through a code sent to a
 * verified email; accounts without one go to GymBios support.
 */
@Service
public class AccountSelfService {

    /** The account as its owner sees it. devCode only in dev mode, when no email could be sent. */
    public record CodeSent(String maskedEmail, boolean emailed, String devCode) {}

    private final GlobalAccountService accounts;
    private final AccountCodeService codes;

    // Same switch registration OTPs use: return the email-verification code in the
    // response so it can be tested without SMTP. The owner is signed in, so this only
    // ever shows them their own code.
    @Value("${otp.dev-mode:true}")
    private boolean devMode;

    // Separate, default off: a password-reset code in the response would let anyone who
    // knows an email address take that account over. Only for local testing.
    @Value("${account.password-reset.dev-return-code:false}")
    private boolean resetDevReturnCode;

    public AccountSelfService(GlobalAccountService accounts, AccountCodeService codes) {
        this.accounts = accounts;
        this.codes = codes;
    }

    public GlobalAccountService.Account account(long globalUserId) {
        return accounts.findById(globalUserId)
                .orElseThrow(() -> new EntityNotFoundException("Account not found."));
    }

    /** Sets a new (unverified) email and sends it a code. */
    public CodeSent changeEmail(long globalUserId, String email) {
        accounts.setEmail(globalUserId, email);
        return sendEmailCode(globalUserId);
    }

    public CodeSent sendEmailCode(long globalUserId) {
        GlobalAccountService.Account account = account(globalUserId);
        if (account.email() == null) {
            throw new BusinessRuleViolationException("Add an email address first.");
        }
        if (account.emailVerified()) {
            throw new BusinessRuleViolationException("This email is already verified.");
        }
        AccountCodeService.Issued issued = codes.issue(globalUserId, AccountCode.EMAIL_VERIFY, account.email());
        return new CodeSent(mask(account.email()), issued.emailed(),
                devMode && !issued.emailed() ? issued.code() : null);
    }

    public GlobalAccountService.Account verifyEmail(long globalUserId, String code) {
        GlobalAccountService.Account account = account(globalUserId);
        if (account.email() == null) {
            throw new BusinessRuleViolationException("Add an email address first.");
        }
        codes.verify(globalUserId, AccountCode.EMAIL_VERIFY, account.email(), code);
        accounts.markEmailVerified(globalUserId, account.email());
        return account(globalUserId);
    }

    /**
     * Always answers the same way whether or not the email belongs to an account, so the
     * endpoint can't be used to find out who has one. Returns the code only when
     * account.password-reset.dev-return-code is on and no email went out.
     */
    public Optional<String> requestPasswordReset(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Enter your email address.");
        }
        Optional<GlobalAccountService.Account> account = accounts.findMemberAccountByVerifiedEmail(email);
        if (account.isEmpty()) {
            return Optional.empty();
        }
        AccountCodeService.Issued issued;
        try {
            issued = codes.issue(account.get().id(), AccountCode.PASSWORD_RESET, account.get().email());
        } catch (OtpException cooldown) {
            // A code went out under a minute ago; answering differently here would reveal
            // that the email has an account.
            return Optional.empty();
        }
        return resetDevReturnCode && !issued.emailed() ? Optional.of(issued.code()) : Optional.empty();
    }

    public void confirmPasswordReset(String email, String code, String newPassword) {
        GlobalAccountService.validatePassword(newPassword);
        GlobalAccountService.Account account = accounts.findMemberAccountByVerifiedEmail(email)
                .orElseThrow(() -> new BusinessRuleViolationException("This code is no longer valid. Request a new one."));
        codes.verify(account.id(), AccountCode.PASSWORD_RESET, account.email(), code);
        accounts.setPassword(account.id(), newPassword);
    }

    static String mask(String email) {
        int at = email.indexOf('@');
        return at <= 1 ? email : email.charAt(0) + "***" + email.substring(at);
    }
}
