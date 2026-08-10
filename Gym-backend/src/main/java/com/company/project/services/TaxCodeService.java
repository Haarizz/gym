package com.company.project.services;

import com.company.project.dto.TaxCodeRequestDTO;
import com.company.project.dto.TaxCodeResponseDTO;
import com.company.project.entities.TaxCode;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.TaxCodeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class TaxCodeService {

    private final TaxCodeRepository taxCodeRepository;

    public TaxCodeService(TaxCodeRepository taxCodeRepository) {
        this.taxCodeRepository = taxCodeRepository;
    }

    public List<TaxCodeResponseDTO> getAll() {
        return taxCodeRepository.findAll().stream()
                .map(TaxCodeResponseDTO::fromEntity).collect(Collectors.toList());
    }

    public TaxCodeResponseDTO create(TaxCodeRequestDTO req) {
        if (req.getCode() == null || req.getCode().isBlank()) {
            throw new BusinessRuleViolationException("Tax code is required");
        }
        if (taxCodeRepository.findByCode(req.getCode()).isPresent()) {
            throw new BusinessRuleViolationException("Tax code already exists: " + req.getCode());
        }
        TaxCode t = new TaxCode();
        applyRequest(t, req);
        return TaxCodeResponseDTO.fromEntity(taxCodeRepository.save(t));
    }

    public TaxCodeResponseDTO update(Long id, TaxCodeRequestDTO req) {
        TaxCode t = taxCodeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Tax code not found: " + id));
        applyRequest(t, req);
        return TaxCodeResponseDTO.fromEntity(taxCodeRepository.save(t));
    }

    public void delete(Long id) {
        TaxCode t = taxCodeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Tax code not found: " + id));
        taxCodeRepository.delete(t);
    }

    private void applyRequest(TaxCode t, TaxCodeRequestDTO req) {
        if (req.getCode() != null) t.setCode(req.getCode());
        t.setName(req.getName());
        t.setRate(req.getRate() != null ? req.getRate() : BigDecimal.ZERO);
        t.setSalesTaxAccountCode(req.getSalesTaxAccountCode());
        t.setPurchaseTaxAccountCode(req.getPurchaseTaxAccountCode());
        if (req.getActive() != null) t.setActive(req.getActive());
        t.setDescription(req.getDescription());
        t.setTaxType(req.getTaxType() != null && !req.getTaxType().isBlank() ? req.getTaxType() : "STANDARD");
        t.setSecondaryTaxCode(req.getSecondaryTaxCode());
    }
}
