package com.company.project.services;

import com.company.project.dto.CatalogDisplaySectionRequestDTO;
import com.company.project.dto.CatalogDisplaySectionResponseDTO;
import com.company.project.entities.CatalogDisplaySection;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.CatalogDisplaySectionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Backs GymOS's Plans & Services Catalog Configuration card: which sections
 * show in the walk-in inquiry catalog, replacing gymos.tsx's local-only
 * catalogOptions mock.
 */
@Service
@Transactional
public class CatalogDisplaySectionService {

    private final CatalogDisplaySectionRepository sectionRepository;

    public CatalogDisplaySectionService(CatalogDisplaySectionRepository sectionRepository) {
        this.sectionRepository = sectionRepository;
    }

    @Transactional(readOnly = true)
    public List<CatalogDisplaySectionResponseDTO> getAll() {
        return sectionRepository.findAllByOrderBySortOrderAsc().stream()
                .map(CatalogDisplaySectionResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public CatalogDisplaySectionResponseDTO create(CatalogDisplaySectionRequestDTO req) {
        if (!StringUtils.hasText(req.getSectionKey())) {
            throw new IllegalArgumentException("sectionKey is required");
        }
        if (!StringUtils.hasText(req.getTitle())) {
            throw new IllegalArgumentException("title is required");
        }
        if (sectionRepository.existsBySectionKeyIgnoreCase(req.getSectionKey())) {
            throw new BusinessRuleViolationException("A catalog section '" + req.getSectionKey() + "' already exists");
        }
        CatalogDisplaySection section = new CatalogDisplaySection();
        section.setSectionKey(req.getSectionKey().trim());
        applyRequest(section, req);
        section.setSortOrder(req.getSortOrder() != null ? req.getSortOrder() : sectionRepository.findAllByOrderBySortOrderAsc().size());
        return CatalogDisplaySectionResponseDTO.fromEntity(sectionRepository.save(section));
    }

    public CatalogDisplaySectionResponseDTO update(Long id, CatalogDisplaySectionRequestDTO req) {
        CatalogDisplaySection section = findOrThrow(id);
        applyRequest(section, req);
        if (req.getSortOrder() != null) section.setSortOrder(req.getSortOrder());
        return CatalogDisplaySectionResponseDTO.fromEntity(sectionRepository.save(section));
    }

    public CatalogDisplaySectionResponseDTO toggleEnabled(Long id) {
        CatalogDisplaySection section = findOrThrow(id);
        section.setEnabled(!section.isEnabled());
        return CatalogDisplaySectionResponseDTO.fromEntity(sectionRepository.save(section));
    }

    public void delete(Long id) {
        if (!sectionRepository.existsById(id)) {
            throw new EntityNotFoundException("Catalog section not found: " + id);
        }
        sectionRepository.deleteById(id);
    }

    private CatalogDisplaySection findOrThrow(Long id) {
        return sectionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Catalog section not found: " + id));
    }

    private void applyRequest(CatalogDisplaySection section, CatalogDisplaySectionRequestDTO req) {
        if (StringUtils.hasText(req.getTitle())) section.setTitle(req.getTitle());
        if (req.getDescription() != null) section.setDescription(req.getDescription());
        if (req.getEnabled() != null) section.setEnabled(req.getEnabled());
    }
}
