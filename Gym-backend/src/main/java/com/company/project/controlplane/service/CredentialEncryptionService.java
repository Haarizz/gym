package com.company.project.controlplane.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Phase 7: AES-GCM encrypt/decrypt for the per-tenant Postgres password now stored
 * in TenantConnection.dbCredentialEnc (previously stored plaintext, since — per
 * Phase 3's own doc comment — it was generated but never actually used as a real
 * credential; Phase 7 makes it real, so it needs real protection at rest).
 *
 * Key derivation: SHA-256 of ${TENANT_CREDENTIAL_KEY} (any-length string, no JDK
 * dependency on a pre-formatted key), giving a proper 256-bit AES key from a plain
 * env var — no new dependency, javax.crypto is JDK-builtin. A fresh random 12-byte
 * GCM nonce is generated per encryption and stored alongside the ciphertext (nonce
 * || ciphertext, base64-encoded as one string) so decryption never needs a separate
 * column for it.
 */
@Service
public class CredentialEncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final int GCM_NONCE_LENGTH_BYTES = 12;

    private final SecretKeySpec keySpec;

    public CredentialEncryptionService(@Value("${tenant.credential-key}") String rawKey) {
        try {
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = sha256.digest(rawKey.getBytes(StandardCharsets.UTF_8));
            this.keySpec = new SecretKeySpec(keyBytes, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("Failed to derive tenant credential encryption key", e);
        }
    }

    public String encrypt(String plaintext) {
        try {
            byte[] nonce = new byte[GCM_NONCE_LENGTH_BYTES];
            new SecureRandom().nextBytes(nonce);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, nonce));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            byte[] combined = new byte[nonce.length + ciphertext.length];
            System.arraycopy(nonce, 0, combined, 0, nonce.length);
            System.arraycopy(ciphertext, 0, combined, nonce.length, ciphertext.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to encrypt tenant credential", e);
        }
    }

    public String decrypt(String encoded) {
        try {
            byte[] combined = Base64.getDecoder().decode(encoded);
            byte[] nonce = new byte[GCM_NONCE_LENGTH_BYTES];
            byte[] ciphertext = new byte[combined.length - GCM_NONCE_LENGTH_BYTES];
            System.arraycopy(combined, 0, nonce, 0, nonce.length);
            System.arraycopy(combined, nonce.length, ciphertext, 0, ciphertext.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, nonce));
            byte[] plaintext = cipher.doFinal(ciphertext);
            return new String(plaintext, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to decrypt tenant credential", e);
        }
    }
}
