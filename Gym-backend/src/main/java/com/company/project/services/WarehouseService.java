package com.company.project.services;

import com.company.project.dto.WarehouseDTO;
import com.company.project.entities.Warehouse;
import com.company.project.repositories.WarehouseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class WarehouseService {

    private final WarehouseRepository warehouseRepository;

    public WarehouseService(WarehouseRepository warehouseRepository) {
        this.warehouseRepository = warehouseRepository;
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<WarehouseDTO> getAllWarehouses() {
        return warehouseRepository.findAll().stream()
                .map(WarehouseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WarehouseDTO> getActiveWarehouses() {
        return warehouseRepository.findByIsActiveTrue().stream()
                .map(WarehouseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public WarehouseDTO getById(Long id) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Warehouse not found with id: " + id));
        return WarehouseDTO.fromEntity(warehouse);
    }

    // ── Write ───────────────────────────────────────────────────────────────

    public WarehouseDTO create(WarehouseDTO dto) {
        Warehouse warehouse = new Warehouse();
        warehouse.setName(dto.getName());
        warehouse.setType(dto.getType());
        warehouse.setLocation(dto.getLocation());
        warehouse.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);
        return WarehouseDTO.fromEntity(warehouseRepository.save(warehouse));
    }

    public WarehouseDTO update(Long id, WarehouseDTO dto) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Warehouse not found with id: " + id));
        if (dto.getName() != null) warehouse.setName(dto.getName());
        if (dto.getType() != null) warehouse.setType(dto.getType());
        if (dto.getLocation() != null) warehouse.setLocation(dto.getLocation());
        if (dto.getIsActive() != null) warehouse.setIsActive(dto.getIsActive());
        return WarehouseDTO.fromEntity(warehouseRepository.save(warehouse));
    }

    public void delete(Long id) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Warehouse not found with id: " + id));
        warehouseRepository.delete(warehouse);
    }

    // ── Init ────────────────────────────────────────────────────────────────

    public void initDefaultWarehouses() {
        if (warehouseRepository.count() > 0) return;

        String[][] defaults = {
            {"Main Warehouse", "MAIN_WAREHOUSE", "Main Location"},
            {"Downtown Store",  "BRANCH",         "Downtown"},
            {"Mall Branch",     "BRANCH",         "Mall"},
            {"Marina Store",    "BRANCH",         "Marina"},
            {"Online Stock",    "ONLINE",         "Online"}
        };

        for (String[] row : defaults) {
            Warehouse w = new Warehouse();
            w.setName(row[0]);
            w.setType(row[1]);
            w.setLocation(row[2]);
            w.setIsActive(true);
            warehouseRepository.save(w);
        }
    }
}
