package com.company.project.services;

import com.company.project.entities.DeviceKey;
import com.company.project.repositories.DeviceKeyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class DeviceKeyService {

    private final DeviceKeyRepository deviceKeyRepository;

    public DeviceKeyService(DeviceKeyRepository deviceKeyRepository) {
        this.deviceKeyRepository = deviceKeyRepository;
    }

    /**
     * Creates a new device key for the given name.
     * Returns the raw key — it is shown ONCE and never stored in plain text.
     * The SHA-256 hash is stored in the database.
     */
    @Transactional
    public String createDeviceKey(String name) {
        if (deviceKeyRepository.existsByName(name)) {
            throw new IllegalArgumentException("A device key for '" + name + "' already exists");
        }
        String rawKey = generateRawKey();
        DeviceKey key = new DeviceKey();
        key.setName(name);
        key.setKeyHash(hash(rawKey));
        key.setActive(true);
        deviceKeyRepository.save(key);
        return rawKey;
    }

    /**
     * Deactivates a device key by device name so it can no longer authenticate.
     */
    @Transactional
    public void revokeDeviceKey(String name) {
        deviceKeyRepository.findAll().stream()
                .filter(k -> k.getName().equals(name))
                .forEach(k -> {
                    k.setActive(false);
                    deviceKeyRepository.save(k);
                });
    }

    /**
     * Returns the DeviceKey if the raw key is valid and active.
     * Used by {@link com.company.project.security.DeviceAuthFilter}.
     */
    @Transactional(readOnly = true)
    public Optional<DeviceKey> validateKey(String rawKey) {
        if (rawKey == null || rawKey.isBlank()) return Optional.empty();
        return deviceKeyRepository.findByKeyHashAndActiveTrue(hash(rawKey));
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private String generateRawKey() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return "gymbios_sk_" + HexFormat.of().formatHex(bytes);
    }

    private String hash(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
