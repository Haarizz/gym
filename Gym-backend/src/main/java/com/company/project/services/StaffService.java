package com.company.project.services;

import com.company.project.dto.StaffPageResponseDTO;
import com.company.project.dto.StaffRequestDTO;
import com.company.project.dto.StaffResponseDTO;
import com.company.project.dto.PaginationDTO;
import com.company.project.entities.Role;
import com.company.project.entities.Staff;
import com.company.project.entities.StaffCertification;
import com.company.project.entities.StaffScheduleSlot;
import com.company.project.entities.User;
import com.company.project.entities.UserRole;
import com.company.project.repositories.RoleRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.repositories.UserRoleRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.company.project.repositories.StaffBranchRepository staffBranchRepository;
    private final BranchService branchService;

    public StaffService(StaffRepository staffRepository,
                        UserRepository userRepository,
                        RoleRepository roleRepository,
                        UserRoleRepository userRoleRepository,
                        PasswordEncoder passwordEncoder,
                        com.company.project.repositories.StaffBranchRepository staffBranchRepository,
                        BranchService branchService) {
        this.staffRepository       = staffRepository;
        this.userRepository        = userRepository;
        this.roleRepository        = roleRepository;
        this.userRoleRepository    = userRoleRepository;
        this.passwordEncoder       = passwordEncoder;
        this.staffBranchRepository = staffBranchRepository;
        this.branchService         = branchService;
    }

    @Transactional(readOnly = true)
    public StaffPageResponseDTO getStaff(String search, String role, String department,
                                          String status, String branch, int page, int limit) {
        
        Long activeBranchId = com.company.project.security.BranchContextHolder.getActiveBranchId();
        List<Long> allowedStaffIds = activeBranchId != null ? staffBranchRepository.findStaffIdsByBranchId(activeBranchId) : null;

        Specification<Staff> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            if (activeBranchId != null) {
                if (allowedStaffIds.isEmpty()) {
                    predicates.add(cb.disjunction()); // return none
                } else {
                    predicates.add(root.get("id").in(allowedStaffIds));
                }
            }

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

    @Transactional(readOnly = true)
    public StaffResponseDTO getStaffByUserId(Long userId) {
        Staff staff = staffRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("No staff record linked to this account"));
        return StaffResponseDTO.fromEntity(staff);
    }

    public StaffResponseDTO createStaff(StaffRequestDTO req) {
        Staff staff = new Staff();
        Long branchId = branchService.resolveBranchForCreate(null); // primary/home branch
        staff.setBranchId(branchId);
        
        applyRequest(req, staff);
        staff.setStatus(staff.getStatus() != null ? staff.getStatus() : "active");
        staff.setJoinDate(staff.getJoinDate() != null ? staff.getJoinDate() : LocalDate.now());
        Staff saved = staffRepository.save(staff);

        // Generate EMP-XXXXXXXXXX id
        saved.setStaffId("EMP-" + String.format("%010d", saved.getId()));
        saved = staffRepository.save(saved);
        
        // Auto-assign to home branch in multi-branch table
        if (branchId != null) {
            branchService.assignStaffToBranch(saved.getId(), branchId);
        }

        saved = syncAppLogin(saved, req);

        return StaffResponseDTO.fromEntity(saved);
    }

    /**
     * Creates/updates/disables the linked login account based on the request's
     * enableLogin flag (legacy callers that omit it fall back to "credentials
     * were supplied" so the older set-credentials-style behavior keeps working).
     */
    private Staff syncAppLogin(Staff staff, StaffRequestDTO req) {
        boolean hasCredentials = req.getAppUsername() != null && !req.getAppUsername().isBlank()
                && req.getAppPassword() != null && !req.getAppPassword().isBlank();
        boolean enableLogin = req.getEnableLogin() != null ? req.getEnableLogin() : hasCredentials;

        if (!enableLogin) {
            if (staff.getUserId() != null) {
                // Don't delete the account — just disable it, mirroring toggleStaffAccess.
                userRepository.findById(staff.getUserId()).ifPresent(user -> {
                    user.setEnabled(false);
                    userRepository.save(user);
                });
                staff.setAppAccessEnabled(false);
                staff = staffRepository.save(staff);
            }
            return staff;
        }

        Role securityRole = resolveSecurityRole(
                req.getAppRole() != null && !req.getAppRole().isBlank() ? req.getAppRole() : staff.getRole());

        if (staff.getUserId() == null) {
            if (!hasCredentials) {
                throw new RuntimeException("Username and password are required to enable login");
            }
            if (userRepository.existsByUsername(req.getAppUsername())) {
                throw new RuntimeException("Username already taken: " + req.getAppUsername());
            }
            User user = new User();
            user.setUsername(req.getAppUsername());
            user.setEmail(staff.getEmail());
            user.setPasswordHash(passwordEncoder.encode(req.getAppPassword()));
            user.setEnabled(true);
            user.setUserRoles(new java.util.HashSet<>());
            user = userRepository.save(user);
            userRoleRepository.save(new UserRole(null, user, securityRole));

            staff.setUserId(user.getId());
            staff.setAppUsername(req.getAppUsername());
            staff.setAppAccessEnabled(true);
            staff = staffRepository.save(staff);
            branchService.syncUserBranchesForStaff(staff.getId());
        } else {
            User user = userRepository.findById(staff.getUserId())
                    .orElseThrow(() -> new RuntimeException("Linked user account not found"));
            if (req.getAppUsername() != null && !req.getAppUsername().isBlank()
                    && !req.getAppUsername().equals(user.getUsername())) {
                if (userRepository.existsByUsername(req.getAppUsername())) {
                    throw new RuntimeException("Username already taken: " + req.getAppUsername());
                }
                user.setUsername(req.getAppUsername());
                staff.setAppUsername(req.getAppUsername());
            }
            if (req.getAppPassword() != null && !req.getAppPassword().isBlank()) {
                user.setPasswordHash(passwordEncoder.encode(req.getAppPassword()));
            }
            user.setEnabled(true);
            userRepository.save(user);

            // Keep "one user, one role" in practice: replace rather than accumulate.
            userRoleRepository.findByUserId(user.getId()).forEach(userRoleRepository::delete);
            userRoleRepository.save(new UserRole(null, user, securityRole));

            staff.setAppAccessEnabled(true);
            staff = staffRepository.save(staff);
        }

        return staff;
    }

    /** Matches the Administration → Staff role dropdown value to a security Role, falling back to STAFF. */
    private Role resolveSecurityRole(String staffRoleText) {
        if (staffRoleText != null && !staffRoleText.isBlank()) {
            Role match = roleRepository.findByRoleNameIgnoreCase(staffRoleText.trim()).orElse(null);
            if (match != null) return match;
        }
        return roleRepository.findByRoleName("STAFF")
                .orElseThrow(() -> new RuntimeException("STAFF role not found"));
    }

    public StaffResponseDTO setStaffCredentials(Long id, String appUsername, String appPassword) {
        return setStaffCredentials(id, appUsername, appPassword, null);
    }

    /**
     * @param appRole optional security role name (Admin/Receptionist/Trainer/Accountant/Manager).
     *                A new account defaults to STAFF when omitted (unchanged legacy behavior);
     *                an existing account's role is only reassigned when explicitly provided —
     *                omitting it keeps this call a pure password reset, as before.
     */
    public StaffResponseDTO setStaffCredentials(Long id, String appUsername, String appPassword, String appRole) {
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Staff not found: " + id));

        if (staff.getUserId() != null) {
            // Already has an account — update the password, and the role if one was given.
            User user = userRepository.findById(staff.getUserId())
                    .orElseThrow(() -> new RuntimeException("Linked user account not found"));
            user.setPasswordHash(passwordEncoder.encode(appPassword));
            userRepository.save(user);

            if (appRole != null && !appRole.isBlank()) {
                Role securityRole = resolveSecurityRole(appRole);
                userRoleRepository.findByUserId(user.getId()).forEach(userRoleRepository::delete);
                userRoleRepository.save(new UserRole(null, user, securityRole));
            }
        } else {
            // No account yet — create one
            if (userRepository.existsByUsername(appUsername)) {
                throw new RuntimeException("Username already taken: " + appUsername);
            }
            User user = new User();
            user.setUsername(appUsername);
            user.setEmail(staff.getEmail());
            user.setPasswordHash(passwordEncoder.encode(appPassword));
            user.setEnabled(true);
            user.setUserRoles(new java.util.HashSet<>());
            user = userRepository.save(user);

            Role securityRole = resolveSecurityRole(appRole);
            userRoleRepository.save(new UserRole(null, user, securityRole));

            staff.setUserId(user.getId());
            staff.setAppUsername(appUsername);
            staff.setAppAccessEnabled(true);
            staffRepository.save(staff);
            branchService.syncUserBranchesForStaff(staff.getId());
        }

        return StaffResponseDTO.fromEntity(staffRepository.findById(id).orElseThrow());
    }

    public StaffResponseDTO toggleStaffAccess(Long id, boolean enabled) {
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Staff not found: " + id));
        if (staff.getUserId() == null) {
            throw new RuntimeException("This staff member has no linked app account");
        }
        User user = userRepository.findById(staff.getUserId())
                .orElseThrow(() -> new RuntimeException("Linked user account not found"));
        user.setEnabled(enabled);
        userRepository.save(user);
        staff.setAppAccessEnabled(enabled);
        return StaffResponseDTO.fromEntity(staffRepository.save(staff));
    }

    public StaffResponseDTO updateStaff(Long id, StaffRequestDTO req) {
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Staff not found: " + id));

        // Clear and re-add certifications and schedule
        // Only reset certifications/schedule when the request actually carries them —
        // the new Administration → Staff form doesn't manage either and must not wipe
        // what was set via the Staffs & Trainers page just by saving basic-info edits.
        if (req.getCertifications() != null) staff.getCertifications().clear();
        if (req.getSchedule() != null) staff.getScheduleSlots().clear();

        applyRequest(req, staff);
        Staff saved = staffRepository.save(staff);

        // Only touch login state if this request actually carries login info —
        // the older "Staffs & Trainers" edit form doesn't send these fields at all,
        // and must not silently disable an existing account just by saving HR edits.
        boolean touchesLogin = req.getEnableLogin() != null
                || (req.getAppUsername() != null && !req.getAppUsername().isBlank())
                || (req.getAppPassword() != null && !req.getAppPassword().isBlank());
        if (touchesLogin) {
            saved = syncAppLogin(saved, req);
        }

        return StaffResponseDTO.fromEntity(saved);
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
        if (req.getBaseSalary() != null)   staff.setBaseSalary(req.getBaseSalary());
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
