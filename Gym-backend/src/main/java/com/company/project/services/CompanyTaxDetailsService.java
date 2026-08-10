package com.company.project.services;

import com.company.project.dto.CompanyTaxDetailsDTO;
import com.company.project.entities.CompanyTaxDetails;
import com.company.project.repositories.CompanyTaxDetailsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CompanyTaxDetailsService {

    private static final Long SINGLETON_ID = 1L;

    private final CompanyTaxDetailsRepository repository;

    public CompanyTaxDetailsService(CompanyTaxDetailsRepository repository) {
        this.repository = repository;
    }

    public CompanyTaxDetailsDTO get() {
        CompanyTaxDetails d = repository.findById(SINGLETON_ID).orElseGet(CompanyTaxDetails::new);
        return CompanyTaxDetailsDTO.fromEntity(d);
    }

    public CompanyTaxDetailsDTO update(CompanyTaxDetailsDTO req) {
        CompanyTaxDetails d = repository.findById(SINGLETON_ID).orElseGet(CompanyTaxDetails::new);
        d.setId(SINGLETON_ID);
        d.setLegalName(req.getLegalName());
        d.setGstNumber(req.getGstNumber());
        d.setVatNumber(req.getVatNumber());
        d.setTrn(req.getTrn());
        d.setAddress(req.getAddress());
        return CompanyTaxDetailsDTO.fromEntity(repository.save(d));
    }
}
