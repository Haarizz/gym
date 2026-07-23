package com.company.project.services;

import com.company.project.dto.CostCenterRequestDTO;
import com.company.project.dto.CostCenterResponseDTO;
import com.company.project.entities.CostCenter;
import com.company.project.repositories.AccountHeadRepository;
import com.company.project.repositories.CostCenterRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.UUID;

@Service
@Transactional
public class CostCenterService {

    private final CostCenterRepository costCenterRepository;
    private final AccountHeadRepository accountHeadRepository;

    public CostCenterService(CostCenterRepository costCenterRepository,
                             AccountHeadRepository accountHeadRepository) {
        this.costCenterRepository = costCenterRepository;
        this.accountHeadRepository = accountHeadRepository;
    }

    @Transactional(readOnly = true)
    public List<CostCenterResponseDTO> getAll(String branch, Boolean isActive, String search) {
        List<CostCenter> all;
        if (branch != null && !branch.isBlank()) {
            all = costCenterRepository.findByBranchOrderByCodeAsc(branch);
        } else if (Boolean.TRUE.equals(isActive)) {
            all = costCenterRepository.findByIsActiveTrueOrderByCodeAsc();
        } else {
            all = costCenterRepository.findAllByOrderByCodeAsc();
        }
        return all.stream()
                .filter(c -> {
                    if (search == null || search.isBlank()) return true;
                    String s = search.toLowerCase(Locale.ROOT);
                    return (c.getCode() != null && c.getCode().toLowerCase(Locale.ROOT).contains(s))
                            || (c.getName() != null && c.getName().toLowerCase(Locale.ROOT).contains(s));
                })
                .map(c -> CostCenterResponseDTO.fromEntity(c, accountHeadRepository.countByCostCenter(c.getCode())))
                .collect(Collectors.toList());
    }

    public CostCenterResponseDTO create(CostCenterRequestDTO req) {
        // Auto-generate code if not provided
        if (req.getCode() == null || req.getCode().isBlank()) {
            String base = req.getName() != null
                    ? req.getName().replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT)
                    : "CC";
            if (base.length() > 6) base = base.substring(0, 6);
            String candidate = base + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase(Locale.ROOT);
            req.setCode(candidate);
        }
        if (costCenterRepository.findByCode(req.getCode()).isPresent()) {
            throw new IllegalArgumentException("Cost center code already exists: " + req.getCode());
        }
        CostCenter c = new CostCenter();
        mapFromRequest(c, req);
        if (c.getIsActive() == null) c.setIsActive(true);
        CostCenter saved = costCenterRepository.save(c);
        return CostCenterResponseDTO.fromEntity(saved, accountHeadRepository.countByCostCenter(saved.getCode()));
    }

    public CostCenterResponseDTO update(Long id, CostCenterRequestDTO req) {
        CostCenter c = costCenterRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cost center not found: " + id));
        if (req.getCode() != null && !req.getCode().equals(c.getCode())
                && costCenterRepository.findByCode(req.getCode()).isPresent()) {
            throw new IllegalArgumentException("Cost center code already exists: " + req.getCode());
        }
        mapFromRequest(c, req);
        CostCenter saved = costCenterRepository.save(c);
        return CostCenterResponseDTO.fromEntity(saved, accountHeadRepository.countByCostCenter(saved.getCode()));
    }

    public CostCenterResponseDTO toggleActive(Long id) {
        CostCenter c = costCenterRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cost center not found: " + id));
        c.setIsActive(!Boolean.TRUE.equals(c.getIsActive()));
        CostCenter saved = costCenterRepository.save(c);
        return CostCenterResponseDTO.fromEntity(saved, accountHeadRepository.countByCostCenter(saved.getCode()));
    }

    public void delete(Long id) {
        CostCenter c = costCenterRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Cost center not found: " + id));
        costCenterRepository.delete(c);
    }

    private void mapFromRequest(CostCenter c, CostCenterRequestDTO req) {
        if (req.getCode() != null) c.setCode(req.getCode());
        c.setName(req.getName());
        c.setBranch(req.getBranch());
        c.setManager(req.getManager());
        c.setDescription(req.getDescription());
        c.setBudget(req.getBudget());
        if (req.getIsActive() != null) c.setIsActive(req.getIsActive());
    }
}
