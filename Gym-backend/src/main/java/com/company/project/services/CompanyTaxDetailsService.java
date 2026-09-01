package com.company.project.services;

import com.company.project.dto.CompanyTaxDetailsDTO;
import com.company.project.entities.CompanyTaxDetails;
import com.company.project.repositories.CompanyTaxDetailsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CompanyTaxDetailsService {

    private final CompanyTaxDetailsRepository repository;
    private final BranchSettingsResolver branchSettingsResolver;

    public CompanyTaxDetailsService(CompanyTaxDetailsRepository repository, BranchSettingsResolver branchSettingsResolver) {
        this.repository = repository;
        this.branchSettingsResolver = branchSettingsResolver;
    }

    public CompanyTaxDetailsDTO get() {
        Long branchId = branchSettingsResolver.resolveForRead();
        CompanyTaxDetails d = branchId != null
                ? repository.findByBranchId(branchId).orElseGet(CompanyTaxDetails::new)
                : new CompanyTaxDetails();
        return CompanyTaxDetailsDTO.fromEntity(d);
    }

    public CompanyTaxDetailsDTO update(CompanyTaxDetailsDTO req) {
        Long branchId = branchSettingsResolver.resolveForWrite();
        CompanyTaxDetails d = repository.findByBranchId(branchId).orElseGet(CompanyTaxDetails::new);
        d.setLegalName(req.getLegalName());
        d.setGstNumber(req.getGstNumber());
        d.setVatNumber(req.getVatNumber());
        d.setTrn(req.getTrn());
        d.setAddress(req.getAddress());
        return CompanyTaxDetailsDTO.fromEntity(repository.save(d));
    }
}
