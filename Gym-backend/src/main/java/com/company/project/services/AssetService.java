package com.company.project.services;

import com.company.project.dto.*;
import com.company.project.entities.Asset;
import com.company.project.entities.AssetMaintenance;
import com.company.project.entities.AssetTransfer;
import com.company.project.repositories.AssetRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class AssetService {

    private final AssetRepository assetRepository;

    public AssetService(AssetRepository assetRepository) {
        this.assetRepository = assetRepository;
    }

    @Transactional(readOnly = true)
    public AssetsPageResponseDTO getAssets(String search,
                                           String branch,
                                           String category,
                                           String status,
                                           LocalDate fromDate,
                                           LocalDate toDate,
                                           int page,
                                           int size) {
        Specification<Asset> spec = buildSpec(search, branch, category, status, fromDate, toDate);
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Asset> assetPage = assetRepository.findAll(spec, pageable);

        List<AssetResponseDTO> assets = assetPage.getContent().stream()
                .map(AssetResponseDTO::fromEntity)
                .collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO(
                page, size,
                assetPage.getTotalElements(),
                assetPage.getTotalPages()
        );

        return new AssetsPageResponseDTO(assets, pagination);
    }

    @Transactional(readOnly = true)
    public AssetResponseDTO getAssetById(Long id) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Asset not found with id: " + id));
        return AssetResponseDTO.fromEntity(asset);
    }

    public AssetResponseDTO createAsset(AssetRequestDTO req) {
        Asset asset = new Asset();
        mapRequestToAsset(req, asset);
        asset = assetRepository.save(asset);

        if (asset.getCode() == null || asset.getCode().isBlank()) {
            asset.setCode(generateAssetCode(asset.getId()));
            asset = assetRepository.save(asset);
        }

        return AssetResponseDTO.fromEntity(asset);
    }

    public AssetResponseDTO updateAsset(Long id, AssetRequestDTO req) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Asset not found with id: " + id));
        mapRequestToAsset(req, asset);
        return AssetResponseDTO.fromEntity(assetRepository.save(asset));
    }

    public void deleteAsset(Long id) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Asset not found with id: " + id));
        assetRepository.delete(asset);
    }

    @Transactional(readOnly = true)
    public AssetStatsDTO getStats() {
        List<Asset> assets = assetRepository.findAll();
        BigDecimal totalValue = BigDecimal.ZERO;
        long activeCount = 0;
        long maintenanceDue = 0;
        long disposalCount = 0;

        LocalDate dueDateLimit = LocalDate.now().plusDays(30);

        for (Asset asset : assets) {
            BigDecimal currentValue = asset.getCurrentValue() != null ? asset.getCurrentValue() : BigDecimal.ZERO;
            totalValue = totalValue.add(currentValue);

            String status = asset.getStatus() != null ? asset.getStatus() : "";
            if ("In Use".equalsIgnoreCase(status) || "Active".equalsIgnoreCase(status)) {
                activeCount++;
            }

            if (asset.getNextMaintenanceDate() != null &&
                !asset.getNextMaintenanceDate().isAfter(dueDateLimit)) {
                maintenanceDue++;
            }

            String condition = asset.getCondition() != null ? asset.getCondition() : "";
            if ("Poor".equalsIgnoreCase(condition) ||
                "Out of Service".equalsIgnoreCase(status) ||
                "Disposed".equalsIgnoreCase(status)) {
                disposalCount++;
            }
        }

        return new AssetStatsDTO(totalValue, activeCount, maintenanceDue, disposalCount, (long) assets.size());
    }

    @Transactional(readOnly = true)
    public List<AssetEventDTO> getAssetEvents(Long assetId) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new RuntimeException("Asset not found with id: " + assetId));

        List<AssetEventDTO> events = new ArrayList<>();

        if (asset.getPurchaseDate() != null) {
            AssetEventDTO purchase = new AssetEventDTO();
            purchase.setId("purchase-" + asset.getId());
            purchase.setType("purchase");
            purchase.setTitle("Asset Purchased");
            purchase.setDescription(asset.getName() + " acquired");
            purchase.setDate(asset.getPurchaseDate());
            purchase.setAmount(asset.getPurchasePrice());
            purchase.setLocation(asset.getLocation());
            purchase.setStatus("completed");
            Map<String, Object> details = new HashMap<>();
            details.put("vendor", asset.getVendor());
            details.put("code", asset.getCode());
            purchase.setDetails(details);
            events.add(purchase);
        }

        if (asset.getTransferHistory() != null) {
            for (AssetTransfer transfer : asset.getTransferHistory()) {
                AssetEventDTO evt = new AssetEventDTO();
                evt.setId("transfer-" + transfer.getId());
                evt.setType("transfer");
                evt.setTitle("Asset Transfer");
                evt.setDescription(transfer.getReason() != null ? transfer.getReason() : "Asset transferred");
                evt.setDate(transfer.getTransferDate());
                evt.setAmount(BigDecimal.ZERO);
                evt.setLocation(transfer.getToLocation());
                evt.setStatus("completed");
                Map<String, Object> details = new HashMap<>();
                details.put("fromLocation", transfer.getFromLocation());
                details.put("toLocation", transfer.getToLocation());
                evt.setDetails(details);
                events.add(evt);
            }
        }

        if (asset.getMaintenanceHistory() != null) {
            for (AssetMaintenance maintenance : asset.getMaintenanceHistory()) {
                AssetEventDTO evt = new AssetEventDTO();
                evt.setId("maintenance-" + maintenance.getId());
                evt.setType("maintenance");
                evt.setTitle(maintenance.getType() != null ? maintenance.getType() : "Maintenance");
                evt.setDescription(maintenance.getNotes());
                evt.setDate(maintenance.getMaintenanceDate());
                evt.setAmount(maintenance.getCost());
                evt.setLocation(asset.getLocation());
                evt.setStatus("completed");
                events.add(evt);
            }
        }

        if (asset.getDisposalDate() != null) {
            AssetEventDTO disposal = new AssetEventDTO();
            disposal.setId("disposal-" + asset.getId());
            disposal.setType("disposal");
            disposal.setTitle("Asset Disposal");
            disposal.setDescription(asset.getDisposalReason());
            disposal.setDate(asset.getDisposalDate());
            disposal.setAmount(BigDecimal.ZERO);
            disposal.setLocation(asset.getLocation());
            disposal.setStatus("completed");
            events.add(disposal);
        }

        events.sort(Comparator.comparing(AssetEventDTO::getDate, Comparator.nullsLast(Comparator.naturalOrder())));
        return events;
    }

    private void mapRequestToAsset(AssetRequestDTO req, Asset asset) {
        if (req.getCode() != null) asset.setCode(req.getCode());
        if (req.getName() != null) asset.setName(req.getName());
        if (req.getModel() != null) asset.setModel(req.getModel());
        if (req.getCategory() != null) asset.setCategory(req.getCategory());
        if (req.getSubcategory() != null) asset.setSubcategory(req.getSubcategory());
        if (req.getPurchaseDate() != null) asset.setPurchaseDate(req.getPurchaseDate());
        if (req.getPurchasePrice() != null) asset.setPurchasePrice(req.getPurchasePrice());
        if (req.getCurrentValue() != null) asset.setCurrentValue(req.getCurrentValue());
        if (req.getDepreciationRate() != null) asset.setDepreciationRate(req.getDepreciationRate());
        if (req.getLocation() != null) asset.setLocation(req.getLocation());
        if (req.getBranch() != null) asset.setBranch(req.getBranch());
        if (req.getVendor() != null) asset.setVendor(req.getVendor());
        if (req.getStatus() != null) asset.setStatus(req.getStatus());
        if (req.getCondition() != null) asset.setCondition(req.getCondition());
        if (req.getWarrantyExpiry() != null) asset.setWarrantyExpiry(req.getWarrantyExpiry());
        if (req.getSerialNumber() != null) asset.setSerialNumber(req.getSerialNumber());
        if (req.getImageUrl() != null) asset.setImageUrl(req.getImageUrl());
        if (req.getNextMaintenanceDate() != null) asset.setNextMaintenanceDate(req.getNextMaintenanceDate());
        if (req.getUtilizationRate() != null) asset.setUtilizationRate(req.getUtilizationRate());
        if (req.getDisposalDate() != null) asset.setDisposalDate(req.getDisposalDate());
        if (req.getDisposalReason() != null) asset.setDisposalReason(req.getDisposalReason());
    }

    private String generateAssetCode(Long id) {
        return "AST-" + String.format("%04d", id);
    }

    private Specification<Asset> buildSpec(String search,
                                           String branch,
                                           String category,
                                           String status,
                                           LocalDate fromDate,
                                           LocalDate toDate) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("code")), pattern),
                        cb.like(cb.lower(root.get("model")), pattern)
                ));
            }

            if (branch != null && !branch.isBlank()) {
                predicates.add(cb.equal(root.get("branch"), branch));
            }

            if (category != null && !category.isBlank()) {
                predicates.add(cb.equal(root.get("category"), category));
            }

            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (fromDate != null && toDate != null) {
                predicates.add(cb.between(root.get("purchaseDate"), fromDate, toDate));
            } else if (fromDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("purchaseDate"), fromDate));
            } else if (toDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("purchaseDate"), toDate));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
