package com.company.project.services;

import com.company.project.dto.IntegrationRequestDTO;
import com.company.project.dto.IntegrationResponseDTO;
import com.company.project.entities.Integration;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.IntegrationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Backs GymOS's "API Integration" widget: real, admin-managed integration
 * records (see Integration.java for why status isn't live-probed).
 */
@Service
@Transactional
public class IntegrationService {

    private final IntegrationRepository integrationRepository;
    private final EmailService emailService;

    public IntegrationService(IntegrationRepository integrationRepository, EmailService emailService) {
        this.integrationRepository = integrationRepository;
        this.emailService = emailService;
    }

    @Transactional(readOnly = true)
    public List<IntegrationResponseDTO> getAll() {
        return integrationRepository.findAll().stream()
                .sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName()))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public IntegrationResponseDTO create(IntegrationRequestDTO req) {
        if (!StringUtils.hasText(req.getIntegrationKey())) {
            throw new IllegalArgumentException("integrationKey is required");
        }
        if (!StringUtils.hasText(req.getName())) {
            throw new IllegalArgumentException("name is required");
        }
        if (integrationRepository.existsByIntegrationKeyIgnoreCase(req.getIntegrationKey())) {
            throw new BusinessRuleViolationException("An integration with key '" + req.getIntegrationKey() + "' already exists");
        }

        Integration integration = new Integration();
        integration.setIntegrationKey(req.getIntegrationKey().trim().toUpperCase());
        applyRequest(integration, req);
        return toDTO(integrationRepository.save(integration));
    }

    public IntegrationResponseDTO update(Long id, IntegrationRequestDTO req) {
        Integration integration = findOrThrow(id);
        applyRequest(integration, req);
        return toDTO(integrationRepository.save(integration));
    }

    public void delete(Long id) {
        if (!integrationRepository.existsById(id)) {
            throw new EntityNotFoundException("Integration not found: " + id);
        }
        integrationRepository.deleteById(id);
    }

    public IntegrationResponseDTO setStatus(Long id, String status) {
        if (!Integration.STATUS_CONNECTED.equals(status)
                && !Integration.STATUS_ERROR.equals(status)
                && !Integration.STATUS_DISCONNECTED.equals(status)) {
            throw new BusinessRuleViolationException("Unknown integration status: " + status);
        }
        Integration integration = findOrThrow(id);
        integration.setStatus(status);
        integration.setLastSyncAt(LocalDateTime.now());
        return toDTO(integrationRepository.save(integration));
    }

    private Integration findOrThrow(Long id) {
        return integrationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Integration not found: " + id));
    }

    private void applyRequest(Integration integration, IntegrationRequestDTO req) {
        if (StringUtils.hasText(req.getName())) integration.setName(req.getName());
        if (StringUtils.hasText(req.getCategory())) integration.setCategory(req.getCategory());
        if (StringUtils.hasText(req.getStatus())) integration.setStatus(req.getStatus());
        if (req.getSuccessRate() != null) integration.setSuccessRate(req.getSuccessRate());
        if (req.getNotes() != null) integration.setNotes(req.getNotes());
    }

    private IntegrationResponseDTO toDTO(Integration integration) {
        // EMAIL's status reflects EmailService's live SMTP config rather than a
        // stored value that would silently drift from application.properties.
        if ("EMAIL".equalsIgnoreCase(integration.getIntegrationKey()) && emailService.isConfigured()
                && !Integration.STATUS_CONNECTED.equals(integration.getStatus())) {
            integration.setStatus(Integration.STATUS_CONNECTED);
            integrationRepository.save(integration);
        }
        return IntegrationResponseDTO.fromEntity(integration);
    }
}
