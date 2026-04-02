package com.company.project.services;

import com.company.project.dto.FacilityRequestDTO;
import com.company.project.dto.FacilityResponseDTO;
import com.company.project.entities.Facility;
import com.company.project.entities.FacilityRate;
import com.company.project.repositories.FacilityRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FacilityService {

    private final FacilityRepository facilityRepository;

    public FacilityService(FacilityRepository facilityRepository) {
        this.facilityRepository = facilityRepository;
    }

    public List<FacilityResponseDTO> getFacilities(String status, String search) {
        List<Facility> facilities;

        if (StringUtils.hasText(status)) {
            facilities = facilityRepository.findByStatus(status);
        } else {
            facilities = facilityRepository.findAll();
        }

        if (StringUtils.hasText(search)) {
            String lowered = search.toLowerCase();
            facilities = facilities.stream()
                    .filter(f -> (f.getName() != null && f.getName().toLowerCase().contains(lowered))
                            || (f.getFacilityId() != null && f.getFacilityId().toLowerCase().contains(lowered)))
                    .collect(Collectors.toList());
        }

        return facilities.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public FacilityResponseDTO createFacility(FacilityRequestDTO request) {
        validateRequest(request);

        Facility facility = new Facility();
        applyRequest(facility, request);
        facilityRepository.save(facility);

        // auto-generate facilityId: FAC-XXXXXXXXXX
        facility.setFacilityId("FAC-" + String.format("%010d", facility.getId()));
        facilityRepository.save(facility);

        return toResponse(facility);
    }

    @Transactional
    public FacilityResponseDTO updateFacility(Long id, FacilityRequestDTO request) {
        Facility facility = facilityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Facility not found"));
        applyRequest(facility, request);
        facilityRepository.save(facility);
        return toResponse(facility);
    }

    @Transactional
    public void deleteFacility(Long id) {
        if (!facilityRepository.existsById(id)) {
            throw new RuntimeException("Facility not found");
        }
        facilityRepository.deleteById(id);
    }

    @Transactional
    public FacilityResponseDTO toggleStatus(Long id) {
        Facility facility = facilityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Facility not found"));
        facility.setStatus("Active".equals(facility.getStatus()) ? "Inactive" : "Active");
        facilityRepository.save(facility);
        return toResponse(facility);
    }

    private void validateRequest(FacilityRequestDTO request) {
        if (!StringUtils.hasText(request.getName())) {
            throw new RuntimeException("Facility name is required");
        }
        if (request.getOccupancyLimit() == null || request.getOccupancyLimit() <= 0) {
            throw new RuntimeException("Valid occupancy limit is required");
        }
        if (request.getRates() == null || request.getRates().isEmpty()) {
            throw new RuntimeException("At least one rate is required");
        }
    }

    private void applyRequest(Facility facility, FacilityRequestDTO request) {
        if (StringUtils.hasText(request.getName())) {
            facility.setName(request.getName());
        }
        if (request.getOccupancyLimit() != null) {
            facility.setOccupancyLimit(request.getOccupancyLimit());
        }
        if (request.getStatus() != null) {
            facility.setStatus(request.getStatus());
        }
        if (request.getDescription() != null) {
            facility.setDescription(request.getDescription());
        }
        if (request.getIconName() != null) {
            facility.setIconName(request.getIconName());
        }

        // Replace all rates
        if (request.getRates() != null) {
            facility.getRates().clear();
            for (Map.Entry<String, BigDecimal> entry : request.getRates().entrySet()) {
                if (entry.getValue() != null && entry.getValue().compareTo(BigDecimal.ZERO) > 0) {
                    FacilityRate rate = new FacilityRate(facility, entry.getKey(), entry.getValue());
                    facility.getRates().add(rate);
                }
            }
        }
    }

    private FacilityResponseDTO toResponse(Facility facility) {
        FacilityResponseDTO dto = new FacilityResponseDTO();
        dto.setId(String.valueOf(facility.getId()));
        dto.setFacilityId(facility.getFacilityId());
        dto.setName(facility.getName());
        dto.setOccupancyLimit(facility.getOccupancyLimit());
        dto.setStatus(facility.getStatus());
        dto.setDescription(facility.getDescription());
        dto.setIconName(facility.getIconName());
        dto.setBookingsThisMonth(0); // bookings count can be wired later via BookingRepository

        Map<String, BigDecimal> ratesMap = new LinkedHashMap<>();
        if (facility.getRates() != null) {
            for (FacilityRate r : facility.getRates()) {
                ratesMap.put(r.getRateType(), r.getRate());
            }
        }
        dto.setRates(ratesMap);

        return dto;
    }
}
