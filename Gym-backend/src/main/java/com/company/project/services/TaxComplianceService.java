package com.company.project.services;

import com.company.project.dto.TaxComplianceRequestDTO;
import com.company.project.dto.TaxComplianceResponseDTO;
import com.company.project.entities.TaxCompliance;
import com.company.project.repositories.TaxComplianceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@Transactional
public class TaxComplianceService {

    private final TaxComplianceRepository taxComplianceRepository;

    public TaxComplianceService(TaxComplianceRepository taxComplianceRepository) {
        this.taxComplianceRepository = taxComplianceRepository;
    }

    /**
     * Read-only: PENDING items past their due date are no longer flipped to
     * OVERDUE here. A GET request causing a write violated REST semantics — see
     * TaxComplianceOverdueScheduler, which now runs that transition on a schedule
     * instead (docs/gymbios-financial-roadmap.html — M4).
     */
    @Transactional(readOnly = true)
    public List<TaxComplianceResponseDTO> getAll(String taxType, String status) {
        List<TaxCompliance> all;
        if (taxType != null && !taxType.isBlank()) {
            all = taxComplianceRepository.findByTaxTypeOrderByDueDateDesc(
                    taxType.toUpperCase(Locale.ROOT));
        } else if (status != null && !status.isBlank()) {
            all = taxComplianceRepository.findByStatusOrderByDueDateDesc(
                    status.toUpperCase(Locale.ROOT));
        } else {
            all = taxComplianceRepository.findAllByOrderByDueDateDesc();
        }
        return all.stream().map(TaxComplianceResponseDTO::fromEntity).collect(Collectors.toList());
    }

    public TaxComplianceResponseDTO create(TaxComplianceRequestDTO req) {
        TaxCompliance t = new TaxCompliance();
        mapFromRequest(t, req);
        if (t.getStatus() == null) t.setStatus("PENDING");
        return TaxComplianceResponseDTO.fromEntity(taxComplianceRepository.save(t));
    }

    public TaxComplianceResponseDTO update(Long id, TaxComplianceRequestDTO req) {
        TaxCompliance t = taxComplianceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tax compliance not found: " + id));
        mapFromRequest(t, req);
        return TaxComplianceResponseDTO.fromEntity(taxComplianceRepository.save(t));
    }

    public TaxComplianceResponseDTO markFiled(Long id, LocalDate filedDate, java.math.BigDecimal amount, String reference) {
        TaxCompliance t = taxComplianceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tax compliance not found: " + id));
        t.setStatus("FILED");
        t.setFiledDate(filedDate != null ? filedDate : LocalDate.now());
        if (amount != null) t.setFilingAmount(amount);
        if (reference != null) t.setFilingReference(reference);
        return TaxComplianceResponseDTO.fromEntity(taxComplianceRepository.save(t));
    }

    public void delete(Long id) {
        TaxCompliance t = taxComplianceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tax compliance not found: " + id));
        taxComplianceRepository.delete(t);
    }

    private void mapFromRequest(TaxCompliance t, TaxComplianceRequestDTO req) {
        t.setTaxType(req.getTaxType() != null ? req.getTaxType().toUpperCase(Locale.ROOT) : null);
        t.setTaxPeriod(req.getTaxPeriod());
        t.setDueDate(req.getDueDate());
        t.setFilingAmount(req.getFilingAmount());
        t.setStatus(req.getStatus() != null ? req.getStatus().toUpperCase(Locale.ROOT) : null);
        t.setNotes(req.getNotes());
        t.setDocumentUrl(req.getDocumentUrl());
    }
}
