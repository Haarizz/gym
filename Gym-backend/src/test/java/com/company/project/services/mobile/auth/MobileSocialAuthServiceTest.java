package com.company.project.services.mobile.auth;

import com.company.project.dto.AuthResponseDTO;
import com.company.project.dto.mobile.auth.MobileLinkProviderResponseDTO;
import com.company.project.dto.mobile.auth.MobileSocialAuthResponseDTO;
import com.company.project.entities.MobilePendingSocialRegistration;
import com.company.project.entities.User;
import com.company.project.entities.UserIdentityProvider;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.exceptions.OtpException;
import com.company.project.repositories.UserRepository;
import com.company.project.repositories.mobile.auth.MobilePendingSocialRegistrationRepository;
import com.company.project.repositories.mobile.auth.UserIdentityProviderRepository;
import com.company.project.security.JwtService;
import com.company.project.security.social.AppleIdTokenVerifier;
import com.company.project.security.social.GoogleIdTokenVerifier;
import com.company.project.security.social.VerifiedProviderIdentity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MobileSocialAuthServiceTest {

    @Mock private UserIdentityProviderRepository identityProviderRepository;
    @Mock private MobilePendingSocialRegistrationRepository pendingRepository;
    @Mock private UserRepository userRepository;
    @Mock private MobileAuthService mobileAuthService;
    @Mock private MobileJwtIssuer mobileJwtIssuer;
    @Mock private GoogleIdTokenVerifier googleIdTokenVerifier;
    @Mock private AppleIdTokenVerifier appleIdTokenVerifier;
    @Mock private JwtService jwtService;

    // Real encoder (not mocked) so the placeholder-password test genuinely
    // exercises BCrypt, rather than asserting against a stubbed value.
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private MobileSocialAuthService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new MobileSocialAuthService(
                identityProviderRepository, pendingRepository, userRepository, mobileAuthService,
                passwordEncoder, mobileJwtIssuer, googleIdTokenVerifier, appleIdTokenVerifier, jwtService);
    }

    private VerifiedProviderIdentity googleIdentity(String email, boolean verified) {
        return new VerifiedProviderIdentity("GOOGLE", "google-sub-1", email, verified, null, "Jane Doe");
    }

    // ── authenticateWithGoogle ───────────────────────────────────────────────

    @Test
    void googleAuth_missingEmail_throws() {
        when(googleIdTokenVerifier.verify("tok")).thenReturn(googleIdentity(null, true));

        OtpException ex = assertThrows(OtpException.class, () -> service.authenticateWithGoogle("tok"));
        assertEquals("PROVIDER_EMAIL_MISSING", ex.getCode());
        verifyNoInteractions(pendingRepository, identityProviderRepository);
    }

    @Test
    void googleAuth_existingLink_returnsAuthenticated() {
        when(googleIdTokenVerifier.verify("tok")).thenReturn(googleIdentity("jane@example.com", true));
        UserIdentityProvider link = new UserIdentityProvider();
        link.setUserId(42L);
        when(identityProviderRepository.findByProviderAndProviderUserId("GOOGLE", "google-sub-1"))
                .thenReturn(Optional.of(link));
        User user = new User("jane", "jane@example.com", "hash");
        user.setId(42L);
        when(userRepository.findById(42L)).thenReturn(Optional.of(user));
        AuthResponseDTO session = AuthResponseDTO.builder().token("jwt").build();
        when(mobileJwtIssuer.issueForExistingSocialMember(user)).thenReturn(session);

        MobileSocialAuthResponseDTO result = service.authenticateWithGoogle("tok");

        assertEquals(MobileSocialAuthResponseDTO.STATUS_AUTHENTICATED, result.getStatus());
        assertSame(session, result.getSession());
        verify(pendingRepository, never()).save(any());
        verify(identityProviderRepository, never()).save(any());
    }

    @Test
    void googleAuth_emailCollision_returnsLinkRequired_writesNoRows() {
        when(googleIdTokenVerifier.verify("tok")).thenReturn(googleIdentity("jane@example.com", true));
        when(identityProviderRepository.findByProviderAndProviderUserId("GOOGLE", "google-sub-1"))
                .thenReturn(Optional.empty());
        when(userRepository.existsByEmail("jane@example.com")).thenReturn(true);

        MobileSocialAuthResponseDTO result = service.authenticateWithGoogle("tok");

        assertEquals(MobileSocialAuthResponseDTO.STATUS_LINK_REQUIRED, result.getStatus());
        assertEquals("GOOGLE", result.getProvider());
        assertTrue(result.getMaskedEmail().contains("***"));
        verify(pendingRepository, never()).save(any());
        verify(identityProviderRepository, never()).save(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void googleAuth_newIdentity_returnsNeedsUsername_savesHashedPendingRow() {
        when(googleIdTokenVerifier.verify("tok")).thenReturn(googleIdentity("jane@example.com", true));
        when(identityProviderRepository.findByProviderAndProviderUserId("GOOGLE", "google-sub-1"))
                .thenReturn(Optional.empty());
        when(userRepository.existsByEmail("jane@example.com")).thenReturn(false);
        when(pendingRepository.findByProviderAndProviderUserId("GOOGLE", "google-sub-1"))
                .thenReturn(Optional.empty());
        when(pendingRepository.save(any(MobilePendingSocialRegistration.class)))
                .thenAnswer(i -> i.getArguments()[0]);

        MobileSocialAuthResponseDTO result = service.authenticateWithGoogle("tok");

        assertEquals(MobileSocialAuthResponseDTO.STATUS_NEEDS_USERNAME, result.getStatus());
        assertNotNull(result.getPendingToken());
        assertEquals("Jane Doe", result.getPrefillFullName());

        ArgumentCaptor<MobilePendingSocialRegistration> captor = ArgumentCaptor.forClass(MobilePendingSocialRegistration.class);
        verify(pendingRepository).save(captor.capture());
        MobilePendingSocialRegistration saved = captor.getValue();
        assertNotEquals(result.getPendingToken(), saved.getPendingTokenHash(), "raw token must never be stored as-is");
        assertEquals(64, saved.getPendingTokenHash().length(), "SHA-256 hex digest is 64 chars");
        assertEquals(MobilePendingSocialRegistration.STATUS_PENDING, saved.getStatus());
    }

    @Test
    void googleAuth_retryForSameIdentity_updatesSameRow_neverBlanksExistingNameHint() {
        when(googleIdTokenVerifier.verify("tok")).thenReturn(googleIdentity("jane@example.com", true));
        when(identityProviderRepository.findByProviderAndProviderUserId("GOOGLE", "google-sub-1"))
                .thenReturn(Optional.empty());
        when(userRepository.existsByEmail("jane@example.com")).thenReturn(false);

        MobilePendingSocialRegistration existingRow = new MobilePendingSocialRegistration();
        existingRow.setId(7L);
        existingRow.setProvider("GOOGLE");
        existingRow.setProviderUserId("google-sub-1");
        existingRow.setFullNameAtProvider("Previously Captured Name");
        existingRow.setExpiresAt(java.time.LocalDateTime.now().plusHours(1));
        when(pendingRepository.findByProviderAndProviderUserId("GOOGLE", "google-sub-1"))
                .thenReturn(Optional.of(existingRow));
        when(pendingRepository.save(any(MobilePendingSocialRegistration.class)))
                .thenAnswer(i -> i.getArguments()[0]);

        service.authenticateWithGoogle("tok");

        ArgumentCaptor<MobilePendingSocialRegistration> captor = ArgumentCaptor.forClass(MobilePendingSocialRegistration.class);
        verify(pendingRepository).save(captor.capture());
        assertEquals(7L, captor.getValue().getId(), "must update the same row, not insert a new one");
        assertEquals("Previously Captured Name", captor.getValue().getFullNameAtProvider(),
                "must not overwrite a previously-captured name hint");
    }

    // ── authenticateWithApple email recovery ────────────────────────────────

    @Test
    void appleAuth_noEmailClaim_recoversFromValidPendingRow() {
        VerifiedProviderIdentity noEmail = new VerifiedProviderIdentity("APPLE", "apple-sub-1", null, false, null, null);
        when(appleIdTokenVerifier.verify("tok")).thenReturn(noEmail);

        MobilePendingSocialRegistration priorPending = new MobilePendingSocialRegistration();
        priorPending.setProvider("APPLE");
        priorPending.setProviderUserId("apple-sub-1");
        priorPending.setEmailAtProvider("hidden@privaterelay.appleid.com");
        priorPending.setEmailVerified(true);
        priorPending.setIsPrivateRelay(true);
        priorPending.setExpiresAt(java.time.LocalDateTime.now().plusHours(1));
        when(pendingRepository.findByProviderAndProviderUserId("APPLE", "apple-sub-1"))
                .thenReturn(Optional.of(priorPending));
        when(identityProviderRepository.findByProviderAndProviderUserId("APPLE", "apple-sub-1"))
                .thenReturn(Optional.empty());
        when(userRepository.existsByEmail("hidden@privaterelay.appleid.com")).thenReturn(false);
        when(pendingRepository.save(any(MobilePendingSocialRegistration.class))).thenAnswer(i -> i.getArguments()[0]);

        MobileSocialAuthResponseDTO result = service.authenticateWithApple("tok", null);

        assertEquals(MobileSocialAuthResponseDTO.STATUS_NEEDS_USERNAME, result.getStatus());
        assertTrue(result.getMaskedEmail().contains("***"));
    }

    @Test
    void appleAuth_noEmailClaim_noPending_throwsUnrecoverable() {
        VerifiedProviderIdentity noEmail = new VerifiedProviderIdentity("APPLE", "apple-sub-2", null, false, null, null);
        when(appleIdTokenVerifier.verify("tok")).thenReturn(noEmail);
        when(pendingRepository.findByProviderAndProviderUserId("APPLE", "apple-sub-2"))
                .thenReturn(Optional.empty());

        OtpException ex = assertThrows(OtpException.class, () -> service.authenticateWithApple("tok", null));
        assertEquals("APPLE_EMAIL_UNRECOVERABLE", ex.getCode());
    }

    @Test
    void appleAuth_noEmailClaim_expiredPending_throwsUnrecoverable() {
        VerifiedProviderIdentity noEmail = new VerifiedProviderIdentity("APPLE", "apple-sub-3", null, false, null, null);
        when(appleIdTokenVerifier.verify("tok")).thenReturn(noEmail);

        MobilePendingSocialRegistration expired = new MobilePendingSocialRegistration();
        expired.setEmailAtProvider("someone@example.com");
        expired.setExpiresAt(java.time.LocalDateTime.now().minusMinutes(1));
        when(pendingRepository.findByProviderAndProviderUserId("APPLE", "apple-sub-3"))
                .thenReturn(Optional.of(expired));

        assertThrows(OtpException.class, () -> service.authenticateWithApple("tok", null));
    }

    // ── completeRegistration ─────────────────────────────────────────────────

    private MobilePendingSocialRegistration freshPending() {
        MobilePendingSocialRegistration pending = new MobilePendingSocialRegistration();
        pending.setId(1L);
        pending.setProvider("GOOGLE");
        pending.setProviderUserId("google-sub-1");
        pending.setEmailAtProvider("jane@example.com");
        pending.setFullNameAtProvider("Jane Doe");
        pending.setStatus(MobilePendingSocialRegistration.STATUS_PENDING);
        pending.setExpiresAt(java.time.LocalDateTime.now().plusHours(1));
        return pending;
    }

    @Test
    void completeRegistration_happyPath_createsUserAndIdentityRow_marksConsumed() {
        MobilePendingSocialRegistration pending = freshPending();
        when(pendingRepository.findByPendingTokenHashForUpdate(anyString())).thenReturn(Optional.of(pending));
        when(userRepository.existsByUsername("janedoe")).thenReturn(false);
        when(userRepository.existsByEmail("jane@example.com")).thenReturn(false);

        User createdUser = new User("janedoe", "jane@example.com", "placeholder");
        createdUser.setId(99L);
        when(mobileAuthService.createVerifiedMember(anyString(), eq("janedoe"), eq("jane@example.com"), anyString()))
                .thenReturn(createdUser);
        AuthResponseDTO session = AuthResponseDTO.builder().token("jwt").build();
        when(mobileJwtIssuer.issueForNewSocialMember(eq(createdUser), anyString())).thenReturn(session);

        AuthResponseDTO result = service.completeRegistration("GOOGLE", "raw-token", "janedoe", null);

        assertSame(session, result);
        verify(identityProviderRepository).save(argThat(row ->
                row.getUserId().equals(99L) && row.getProvider().equals("GOOGLE") && row.getProviderUserId().equals("google-sub-1")));
        assertEquals(MobilePendingSocialRegistration.STATUS_CONSUMED, pending.getStatus());
        assertEquals(99L, pending.getLinkedUserId());

        // Placeholder password must be unusable: never matches any guessable value.
        ArgumentCaptor<String> hashCaptor = ArgumentCaptor.forClass(String.class);
        verify(mobileAuthService).createVerifiedMember(anyString(), anyString(), anyString(), hashCaptor.capture());
        String placeholderHash = hashCaptor.getValue();
        for (String guess : new String[]{"password", "", "janedoe", "jane@example.com", "123456"}) {
            assertFalse(passwordEncoder.matches(guess, placeholderHash), "placeholder hash must not match guessable value: " + guess);
        }
    }

    @Test
    void completeRegistration_consumedToken_throwsAlreadyVerified() {
        MobilePendingSocialRegistration pending = freshPending();
        pending.setStatus(MobilePendingSocialRegistration.STATUS_CONSUMED);
        when(pendingRepository.findByPendingTokenHashForUpdate(anyString())).thenReturn(Optional.of(pending));

        OtpException ex = assertThrows(OtpException.class,
                () -> service.completeRegistration("GOOGLE", "raw-token", "janedoe", null));
        assertEquals("ALREADY_VERIFIED", ex.getCode());
    }

    @Test
    void completeRegistration_expiredToken_throwsExpired() {
        MobilePendingSocialRegistration pending = freshPending();
        pending.setExpiresAt(java.time.LocalDateTime.now().minusMinutes(1));
        when(pendingRepository.findByPendingTokenHashForUpdate(anyString())).thenReturn(Optional.of(pending));

        OtpException ex = assertThrows(OtpException.class,
                () -> service.completeRegistration("GOOGLE", "raw-token", "janedoe", null));
        assertEquals("REGISTRATION_EXPIRED", ex.getCode());
    }

    @Test
    void completeRegistration_unknownToken_throwsNotFound() {
        when(pendingRepository.findByPendingTokenHashForUpdate(anyString())).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class,
                () -> service.completeRegistration("GOOGLE", "raw-token", "janedoe", null));
    }

    @Test
    void completeRegistration_usernameTaken_throwsBusinessRuleViolation() {
        MobilePendingSocialRegistration pending = freshPending();
        when(pendingRepository.findByPendingTokenHashForUpdate(anyString())).thenReturn(Optional.of(pending));
        when(userRepository.existsByUsername("janedoe")).thenReturn(true);

        assertThrows(BusinessRuleViolationException.class,
                () -> service.completeRegistration("GOOGLE", "raw-token", "janedoe", null));
        verify(mobileAuthService, never()).createVerifiedMember(any(), any(), any(), any());
    }

    @Test
    void completeRegistration_invalidUsername_throwsIllegalArgument() {
        MobilePendingSocialRegistration pending = freshPending();
        when(pendingRepository.findByPendingTokenHashForUpdate(anyString())).thenReturn(Optional.of(pending));

        assertThrows(IllegalArgumentException.class,
                () -> service.completeRegistration("GOOGLE", "raw-token", "jane doe!", null));
    }

    // ── linkProvider ─────────────────────────────────────────────────────────

    @Test
    void linkProvider_freshBearer_newIdentity_insertsRow() {
        when(jwtService.extractClaim(eq("bearer-jwt"), any())).thenReturn(Date.from(Instant.now().minus(1, ChronoUnit.MINUTES)));
        when(googleIdTokenVerifier.verify("provider-tok")).thenReturn(googleIdentity("jane@example.com", true));
        when(identityProviderRepository.findByProviderAndProviderUserId("GOOGLE", "google-sub-1"))
                .thenReturn(Optional.empty());

        MobileLinkProviderResponseDTO result = service.linkProvider(42L, "GOOGLE", "provider-tok", "bearer-jwt");

        assertEquals(MobileLinkProviderResponseDTO.STATUS_LINKED, result.getStatus());
        verify(identityProviderRepository).save(argThat(row -> row.getUserId().equals(42L)));
    }

    @Test
    void linkProvider_staleBearer_throwsReauthRequired() {
        when(jwtService.extractClaim(eq("bearer-jwt"), any())).thenReturn(Date.from(Instant.now().minus(10, ChronoUnit.MINUTES)));

        OtpException ex = assertThrows(OtpException.class,
                () -> service.linkProvider(42L, "GOOGLE", "provider-tok", "bearer-jwt"));
        assertEquals("REAUTH_REQUIRED", ex.getCode());
        verifyNoInteractions(googleIdTokenVerifier, identityProviderRepository);
    }

    @Test
    void linkProvider_alreadyLinkedToDifferentUser_throwsConflict() {
        when(jwtService.extractClaim(eq("bearer-jwt"), any())).thenReturn(Date.from(Instant.now()));
        when(googleIdTokenVerifier.verify("provider-tok")).thenReturn(googleIdentity("jane@example.com", true));
        UserIdentityProvider existing = new UserIdentityProvider();
        existing.setUserId(999L);
        when(identityProviderRepository.findByProviderAndProviderUserId("GOOGLE", "google-sub-1"))
                .thenReturn(Optional.of(existing));

        OtpException ex = assertThrows(OtpException.class,
                () -> service.linkProvider(42L, "GOOGLE", "provider-tok", "bearer-jwt"));
        assertEquals("PROVIDER_ALREADY_LINKED", ex.getCode());
    }

    @Test
    void linkProvider_alreadyLinkedToSameUser_isIdempotent_noNewRow() {
        when(jwtService.extractClaim(eq("bearer-jwt"), any())).thenReturn(Date.from(Instant.now()));
        when(googleIdTokenVerifier.verify("provider-tok")).thenReturn(googleIdentity("jane@example.com", true));
        UserIdentityProvider existing = new UserIdentityProvider();
        existing.setUserId(42L);
        when(identityProviderRepository.findByProviderAndProviderUserId("GOOGLE", "google-sub-1"))
                .thenReturn(Optional.of(existing));

        MobileLinkProviderResponseDTO result = service.linkProvider(42L, "GOOGLE", "provider-tok", "bearer-jwt");

        assertEquals(MobileLinkProviderResponseDTO.STATUS_LINKED, result.getStatus());
        verify(identityProviderRepository, never()).save(any());
    }
}
