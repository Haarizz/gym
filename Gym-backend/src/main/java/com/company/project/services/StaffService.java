package com.company.project.services;

import com.company.project.dto.StaffPageResponseDTO;
import com.company.project.dto.StaffRequestDTO;
import com.company.project.dto.StaffResponseDTO;
import com.company.project.dto.PaginationDTO;
import com.company.project.entities.Staff;
import com.company.project.entities.StaffCertification;
import com.company.project.entities.StaffScheduleSlot;
import com.company.project.repositories.StaffRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class StaffService {

    private final StaffRepository staffRepository;

    public StaffService(StaffRepository staffRepository) {
        this.staffRepository = staffRepository;
    }

    @Transactional(readOnly = true)
    public StaffPageResponseDTO getStaff(String search, String role, String department,
                                          String status, String branch, int page, int limit) {
        Specification<Staff> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.isBlank()) {
                String like = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), like),
                        cb.like(cb.lower(root.get("email")), like),
                        cb.like(cb.lower(root.get("role")), like),
                        cb.like(cb.lower(root.get("department")), like)
                ));
            }
            if (role != null && !role.isBlank()) predicates.add(cb.equal(root.get("role"), role));
            if (department != null && !department.isBlank()) predicates.add(cb.equal(root.get("department"), department));
            if (status != null && !status.isBlank()) predicates.add(cb.equal(root.get("status"), status));
            if (branch != null && !branch.isBlank()) predicates.add(cb.equal(root.get("branch"), branch));
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Pageable pageable = PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Staff> staffPage = staffRepository.findAll(spec, pageable);

        List<StaffResponseDTO> dtos = staffPage.getContent().stream()
                .map(StaffResponseDTO::fromEntity)
                .collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO(page, limit, staffPage.getTotalElements(), staffPage.getTotalPages());
        return new StaffPageResponseDTO(dtos, pagination);
    }

    @Transactional(readOnly = true)
    public StaffResponseDTO getStaffById(Long id) {
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Staff not found: " + id));
        return StaffResponseDTO.fromEntity(staff);
    }

    public StaffResponseDTO createStaff(StaffRequestDTO req) {
        Staff staff = new Staff();
        applyRequest(req, staff);
        staff.setStatus(staff.getStatus() != null ? staff.getStatus() : "active");
        staff.setJoinDate(staff.getJoinDate() != null ? staff.getJoinDate() : LocalDate.now());
        Staff saved = staffRepository.save(staff);

        // Generate EMP-XXXXXXXXXX id
        saved.setStaffId("EMP-" + String.format("%010d", saved.getId()));
        saved = staffRepository.save(saved);
        return StaffResponseDTO.fromEntity(saved);
    }

    public StaffResponseDTO updateStaff(Long id, StaffRequestDTO req) {
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Staff not found: " + id));

        // Clear and re-add certifications and schedule
        staff.getCertifications().clear();
        staff.getScheduleSlots().clear();

        applyRequest(req, staff);
        return StaffResponseDTO.fromEntity(staffRepository.save(staff));
    }

    public void deleteStaff(Long id) {
        if (!staffRepository.existsById(id)) throw new RuntimeException("Staff not found: " + id);
        staffRepository.deleteById(id);
    }

    private void applyRequest(StaffRequestDTO req, Staff staff) {
        if (req.getName() != null)         staff.setName(req.getName());
        if (req.getEmail() != null)        staff.setEmail(req.getEmail());
        if (req.getPhone() != null)        staff.setPhone(req.getPhone());
        if (req.getRole() != null)         staff.setRole(req.getRole());
        if (req.getDepartment() != null)   staff.setDepartment(req.getDepartment());
        if (req.getBranch() != null)       staff.setBranch(req.getBranch());
        if (req.getMonthlyTarget() != null) staff.setMonthlyTarget(req.getMonthlyTarget());
        if (req.getStatus() != null)       staff.setStatus(req.getStatus());
        if (req.getAddress() != null)      staff.setAddress(req.getAddress());
        if (req.getPhotoUrl() != null)     staff.setPhotoUrl(req.getPhotoUrl());
        if (req.getJoinDate() != null && !req.getJoinDate().isBlank()) {
            staff.setJoinDate(LocalDate.parse(req.getJoinDate()));
        }

        // certifications
        if (req.getCertifications() != null) {
            List<StaffCertification> certs = new ArrayList<>();
            for (StaffRequestDTO.CertificationInput ci : req.getCertifications()) {
                StaffCertification cert = new StaffCertification();
                cert.setStaff(staff);
                cert.setCertName(ci.getCertName());
                cert.setIssuer(ci.getIssuer());
                if (ci.getIssueDate() != null && !ci.getIssueDate().isBlank())
                    cert.setIssueDate(LocalDate.parse(ci.getIssueDate()));
                if (ci.getExpiryDate() != null && !ci.getExpiryDate().isBlank())
                    cert.setExpiryDate(LocalDate.parse(ci.getExpiryDate()));
                cert.setDocumentUrl(ci.getDocumentUrl());
                certs.add(cert);
            }
            staff.getCertifications().addAll(certs);
        }

        // schedule slots
        if (req.getSchedule() != null) {
            List<StaffScheduleSlot> slots = new ArrayList<>();
            for (Map.Entry<String, List<String>> entry : req.getSchedule().entrySet()) {
                for (String slotName : entry.getValue()) {
                    StaffScheduleSlot slot = new StaffScheduleSlot();
                    slot.setStaff(staff);
                    slot.setDay(entry.getKey());
                    slot.setSlot(slotName);
                    slots.add(slot);
                }
            }
            staff.getScheduleSlots().addAll(slots);
        }
    }
}
