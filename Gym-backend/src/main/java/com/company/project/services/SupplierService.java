package com.company.project.services;

import com.company.project.dto.SupplierRequestDTO;
import com.company.project.dto.SupplierResponseDTO;
import com.company.project.entities.Supplier;
import com.company.project.repositories.SupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public SupplierService(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SupplierResponseDTO> getAllSuppliers() {
        return supplierRepository.findAll().stream()
                .map(SupplierResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SupplierResponseDTO> getActiveSuppliers() {
        return supplierRepository.findByIsActiveTrueOrderByNameAsc().stream()
                .map(SupplierResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SupplierResponseDTO getById(Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + id));
        return SupplierResponseDTO.fromEntity(supplier);
    }

    // ── Write ────────────────────────────────────────────────────────────────

    public SupplierResponseDTO create(SupplierRequestDTO req) {
        Supplier supplier = new Supplier();
        applyRequest(supplier, req);
        supplier = supplierRepository.save(supplier);
        return SupplierResponseDTO.fromEntity(supplier);
    }

    public SupplierResponseDTO update(Long id, SupplierRequestDTO req) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + id));
        applyRequest(supplier, req);
        supplier = supplierRepository.save(supplier);
        return SupplierResponseDTO.fromEntity(supplier);
    }

    public void delete(Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + id));
        supplierRepository.delete(supplier);
    }

    public void initDefaultSuppliers() {
        if (supplierRepository.count() > 0) return;

        String[] names = {"Sports Nutrition Ltd", "Fitness Equipment Co", "General Supplies Co"};
        for (String name : names) {
            Supplier s = new Supplier();
            s.setName(name);
            s.setCountry("UAE");
            s.setIsActive(true);
            s.setPaymentTerms("NET30");
            supplierRepository.save(s);
        }
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private void applyRequest(Supplier supplier, SupplierRequestDTO req) {
        if (req.getName() != null) supplier.setName(req.getName());
        supplier.setContactPerson(req.getContactPerson());
        supplier.setEmail(req.getEmail());
        supplier.setPhone(req.getPhone());
        supplier.setAddress(req.getAddress());
        supplier.setCity(req.getCity());
        if (req.getCountry() != null) supplier.setCountry(req.getCountry());
        supplier.setTaxId(req.getTaxId());
        supplier.setPaymentTerms(req.getPaymentTerms());
        supplier.setCreditLimit(req.getCreditLimit());
        if (req.getIsActive() != null) supplier.setIsActive(req.getIsActive());
        supplier.setRating(req.getRating());
        supplier.setNotes(req.getNotes());
    }
}
