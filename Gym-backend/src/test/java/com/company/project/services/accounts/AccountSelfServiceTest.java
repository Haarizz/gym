package com.company.project.services.accounts;

import com.company.project.controlplane.entities.AccountCode;
import com.company.project.exceptions.OtpException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountSelfServiceTest {

    @Mock private GlobalAccountService accounts;
    @Mock private AccountCodeService codes;

    @InjectMocks private AccountSelfService service;

    private static final GlobalAccountService.Account GRACE =
            new GlobalAccountService.Account(55L, "grace", "grace@example.com", true, "Grace");

    @Test
    void reset_for_an_unknown_or_unverified_email_sends_nothing() {
        when(accounts.findMemberAccountByVerifiedEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertEquals(Optional.empty(), service.requestPasswordReset("nobody@example.com"));
        verifyNoInteractions(codes);
    }

    @Test
    void reset_code_is_never_returned_unless_explicitly_enabled() {
        when(accounts.findMemberAccountByVerifiedEmail("grace@example.com")).thenReturn(Optional.of(GRACE));
        when(codes.issue(55L, AccountCode.PASSWORD_RESET, "grace@example.com"))
                .thenReturn(new AccountCodeService.Issued("123456", false));

        assertEquals(Optional.empty(), service.requestPasswordReset("grace@example.com"));

        ReflectionTestUtils.setField(service, "resetDevReturnCode", true);
        when(codes.issue(55L, AccountCode.PASSWORD_RESET, "grace@example.com"))
                .thenReturn(new AccountCodeService.Issued("654321", false));
        assertEquals(Optional.of("654321"), service.requestPasswordReset("grace@example.com"));
    }

    @Test
    void reset_cooldown_answers_like_an_unknown_email() {
        when(accounts.findMemberAccountByVerifiedEmail("grace@example.com")).thenReturn(Optional.of(GRACE));
        when(codes.issue(55L, AccountCode.PASSWORD_RESET, "grace@example.com"))
                .thenThrow(new OtpException(HttpStatus.TOO_MANY_REQUESTS, "RESEND_COOLDOWN", "wait"));

        assertEquals(Optional.empty(), service.requestPasswordReset("grace@example.com"));
    }

    @Test
    void confirming_a_reset_checks_the_code_before_changing_the_password() {
        when(accounts.findMemberAccountByVerifiedEmail("grace@example.com")).thenReturn(Optional.of(GRACE));
        doThrow(new OtpException(HttpStatus.BAD_REQUEST, "INVALID_CODE", "Incorrect code."))
                .when(codes).verify(55L, AccountCode.PASSWORD_RESET, "grace@example.com", "000000");

        assertThrows(OtpException.class,
                () -> service.confirmPasswordReset("grace@example.com", "000000", "newpass1"));
        verify(accounts, never()).setPassword(anyLong(), any());

        service.confirmPasswordReset("grace@example.com", "123456", "newpass1");
        verify(accounts).setPassword(55L, "newpass1");
    }

    @Test
    void verifying_email_marks_the_address_the_code_was_sent_to() {
        GlobalAccountService.Account unverified =
                new GlobalAccountService.Account(55L, "grace", "grace@example.com", false, "Grace");
        when(accounts.findById(55L)).thenReturn(Optional.of(unverified), Optional.of(GRACE));

        assertTrue(service.verifyEmail(55L, "123456").emailVerified());
        verify(codes).verify(55L, AccountCode.EMAIL_VERIFY, "grace@example.com", "123456");
        verify(accounts).markEmailVerified(55L, "grace@example.com");
    }
}
