package com.company.project.services;

import com.company.project.dto.DeactivationReasonRequestDTO;
import com.company.project.dto.DeactivationReasonResponseDTO;
import com.company.project.entities.DeactivationReason;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.DeactivationReasonRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class DeactivationReasonService {

    private final DeactivationReasonRepository reasonRepository;

    public DeactivationReasonService(DeactivationReasonRepository reasonRepository) {
        this.reasonRepository = reasonRepository;
    }

    @Transactional(readOnly = true)
    public List<DeactivationReasonResponseDTO> getAll() {
        return reasonRepository.findAllByOrderBySortOrderAsc().stream()
                .map(DeactivationReasonResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public DeactivationReasonResponseDTO create(DeactivationReasonRequestDTO req) {
        if (!StringUtils.hasText(req.getReason())) {
            throw new IllegalArgumentException("reason is required");
        }
        if (reasonRepository.existsByReasonIgnoreCase(req.getReason())) {
            throw new BusinessRuleViolationException("A deactivation reason '" + req.getReason() + "' already exists");
        }
        DeactivationReason reason = new DeactivationReason();
        reason.setReason(req.getReason().trim());
        reason.setActive(req.getActive() == null || req.getActive());
        reason.setSortOrder(req.getSortOrder() != null ? req.getSortOrder() : reasonRepository.findAllByOrderBySortOrderAsc().size());
        return DeactivationReasonResponseDTO.fromEntity(reasonRepository.save(reason));
    }

    public DeactivationReasonResponseDTO update(Long id, DeactivationReasonRequestDTO req) {
        DeactivationReason reason = findOrThrow(id);
        if (StringUtils.hasText(req.getReason())) reason.setReason(req.getReason().trim());
        if (req.getActive() != null) reason.setActive(req.getActive());
        if (req.getSortOrder() != null) reason.setSortOrder(req.getSortOrder());
        return DeactivationReasonResponseDTO.fromEntity(reasonRepository.save(reason));
    }

    public void delete(Long id) {
        if (!reasonRepository.existsById(id)) {
            throw new EntityNotFoundException("Deactivation reason not found: " + id);
        }
        reasonRepository.deleteById(id);
    }

    private DeactivationReason findOrThrow(Long id) {
        return reasonRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Deactivation reason not found: " + id));
    }
}
