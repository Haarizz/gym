package com.company.project.services;

import com.company.project.dto.AccessControlDeviceRequestDTO;
import com.company.project.dto.AccessControlDeviceResponseDTO;
import com.company.project.entities.AccessControlDevice;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.AccessControlDeviceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Backs GymOS's "Access Control Devices" widget: real, branch-scoped device
 * records (see AccessControlDevice.java for why status isn't live-probed).
 */
@Service
@Transactional
public class AccessControlDeviceService {

    private final AccessControlDeviceRepository deviceRepository;

    public AccessControlDeviceService(AccessControlDeviceRepository deviceRepository) {
        this.deviceRepository = deviceRepository;
    }

    @Transactional(readOnly = true)
    public List<AccessControlDeviceResponseDTO> getAll() {
        return deviceRepository.findAll().stream()
                .sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName()))
                .map(AccessControlDeviceResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public AccessControlDeviceResponseDTO create(AccessControlDeviceRequestDTO req) {
        if (!StringUtils.hasText(req.getDeviceCode())) {
            throw new IllegalArgumentException("deviceCode is required");
        }
        if (!StringUtils.hasText(req.getName())) {
            throw new IllegalArgumentException("name is required");
        }
        if (!StringUtils.hasText(req.getDeviceType())) {
            throw new IllegalArgumentException("deviceType is required");
        }
        if (deviceRepository.existsByDeviceCodeIgnoreCase(req.getDeviceCode())) {
            throw new BusinessRuleViolationException("A device with code '" + req.getDeviceCode() + "' already exists");
        }

        AccessControlDevice device = new AccessControlDevice();
        device.setDeviceCode(req.getDeviceCode().trim().toUpperCase());
        applyRequest(device, req);
        return AccessControlDeviceResponseDTO.fromEntity(deviceRepository.save(device));
    }

    public AccessControlDeviceResponseDTO update(Long id, AccessControlDeviceRequestDTO req) {
        AccessControlDevice device = findOrThrow(id);
        applyRequest(device, req);
        return AccessControlDeviceResponseDTO.fromEntity(deviceRepository.save(device));
    }

    public void delete(Long id) {
        if (!deviceRepository.existsById(id)) {
            throw new EntityNotFoundException("Device not found: " + id);
        }
        deviceRepository.deleteById(id);
    }

    public AccessControlDeviceResponseDTO setStatus(Long id, String status) {
        if (!AccessControlDevice.STATUS_ONLINE.equals(status)
                && !AccessControlDevice.STATUS_OFFLINE.equals(status)
                && !AccessControlDevice.STATUS_MAINTENANCE.equals(status)) {
            throw new BusinessRuleViolationException("Unknown device status: " + status);
        }
        AccessControlDevice device = findOrThrow(id);
        device.setStatus(status);
        device.setLastSyncAt(LocalDateTime.now());
        return AccessControlDeviceResponseDTO.fromEntity(deviceRepository.save(device));
    }

    private AccessControlDevice findOrThrow(Long id) {
        return deviceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Device not found: " + id));
    }

    private void applyRequest(AccessControlDevice device, AccessControlDeviceRequestDTO req) {
        if (StringUtils.hasText(req.getName())) device.setName(req.getName());
        if (StringUtils.hasText(req.getDeviceType())) device.setDeviceType(req.getDeviceType());
        if (req.getLocation() != null) device.setLocation(req.getLocation());
        if (StringUtils.hasText(req.getStatus())) device.setStatus(req.getStatus());
        if (req.getBranchId() != null) device.setBranchId(req.getBranchId());
    }
}
