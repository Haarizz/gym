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
import com.company.project.repositories.StaffAttendanceRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.StaffTargetRepository;
import com.company.project.repositories.TrainingSessionRepository;
import com.company.project.repositories.TrainingStreamRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.repositories.UserRoleRepository;
import com.company.project.controlplane.entities.UserDirectoryEntry;
import com.company.project.controlplane.repositories.UserDirectoryRepository;
import com.company.project.security.TenantContextHolder;
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
    private final UserDirectoryRepository userDirectoryRepository;
    private final StaffAttendanceRepository staffAttendanceRepository;
    private final StaffTargetRepository staffTargetRepository;
    private final TrainingSessionRepository trainingSessionRepository;
    private final TrainingStreamRepository trainingStreamRepository;

    public StaffService(StaffRepository staffRepository,
                        UserRepository userRepository,
                        RoleRepository roleRepository,
                        UserRoleRepository userRoleRepository,
                        PasswordEncoder passwordEncoder,
                        com.company.project.repositories.StaffBranchRepository staffBranchRepository,
                        BranchService branchService,
                        UserDirectoryRepository userDirectoryRepository,
                        StaffAttendanceRepository staffAttendanceRepository,
                        StaffTargetRepository staffTargetRepository,
                        TrainingSessionRepository trainingSessionRepository,
                        TrainingStreamRepository trainingStreamRepository) {
        this.staffRepository       = staffRepository;
        this.userRepository        = userRepository;
        this.roleRepository        = roleRepository;
        this.userRoleRepository    = userRoleRepository;
        this.passwordEncoder       = passwordEncoder;
        this.staffBranchRepository = staffBranchRepository;
        this.branchService         = branchService;
        this.userDirectoryRepository = userDirectoryRepository;
        this.staffAttendanceRepository = staffAttendanceRepository;
        this.staffTargetRepository = staffTargetRepository;
        this.trainingSessionRepository = trainingSessionRepository;
        this.trainingStreamRepository = trainingStreamRepository;
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
            // Case-insensitive: web stores "Trainer", mobile stores the security role name "TRAINER".
            if (role != null && !role.isBlank()) predicates.add(cb.equal(cb.lower(root.get("role")), role.trim().toLowerCase()));
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

    /**
     * Self-service contact update from the mobile profile screen. Only phone and
     * address are staff-editable — everything else (name, email, role, salary,
     * certifications, schedule…) stays admin-managed via the Staffs & Trainers page.
     */
    public StaffResponseDTO updateMyContact(Long userId, String phone, String address) {
        Staff staff = staffRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("No staff record linked to this account"));
        if (phone != null) staff.setPhone(phone.trim());
        if (address != null) staff.setAddress(address.trim());
        return StaffResponseDTO.fromEntity(staffRepository.save(staff));
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
            claimLoginIdentity(req.getAppUsername(), staff.getEmail());
            User user = new User();
            user.setUsername(req.getAppUsername());
            user.setEmail(staff.getEmail());
            user.setPasswordHash(passwordEncoder.encode(req.getAppPassword()));
            user.setEnabled(true);
            user.setUserRoles(new java.util.HashSet<>());
            user = userRepository.save(user);
            userRoleRepository.save(new UserRole(null, user, securityRole));

            if (TenantContextHolder.getCurrentTenant() != null) {
                userDirectoryRepository.save(new UserDirectoryEntry(user.getUsername(), user.getEmail(), TenantContextHolder.getCurrentTenant()));
            }

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
                claimLoginIdentity(req.getAppUsername(), null);
                if (TenantContextHolder.getCurrentTenant() != null) {
                    userDirectoryRepository.findByUsernameOrEmail(user.getUsername(), user.getUsername())
                            .ifPresent(entry -> {
                                entry.setUsername(req.getAppUsername());
                                userDirectoryRepository.save(entry);
                            });
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

    /**
     * Makes sure a new staff login can use this username and email. Deleting a staff
     * member only disables their login (other records may reference it), which used to
     * leave its username and email taken forever: re-adding the person failed with the
     * database's vague "duplicate value" error. Such a leftover login (disabled, no staff
     * record, not a member's or owner's) is released here; anything else gets a clear error.
     */
    private void claimLoginIdentity(String username, String email) {
        if (username != null && !username.isBlank()) {
            userRepository.findByUsername(username.trim()).ifPresent(holder -> {
                if (!releaseIfLeftover(holder)) {
                    throw new com.company.project.exceptions.BusinessRuleViolationException(
                            "The username '" + username.trim() + "' is already taken. Choose another one.");
                }
            });
        }
        if (email != null && !email.isBlank()) {
            userRepository.findByEmail(email.trim()).ifPresent(holder -> {
                if (!releaseIfLeftover(holder)) {
                    throw new com.company.project.exceptions.BusinessRuleViolationException(
                            "The email " + email.trim() + " is already used by another login (username: "
                                    + holder.getUsername() + "). Use a different email.");
                }
            });
        }
        // Logins are found across every gym by username or email, so they must be unique platform-wide.
        if (TenantContextHolder.getCurrentTenant() != null) {
            for (String value : new String[] { username, email }) {
                if (value == null || value.isBlank()) continue;
                userDirectoryRepository.findByUsernameOrEmail(value.trim(), value.trim()).ifPresent(entry -> {
                    throw new com.company.project.exceptions.BusinessRuleViolationException(
                            "'" + value.trim() + "' is already used by a login at "
                                    + (TenantContextHolder.getCurrentTenant().equals(entry.getTenantSlug()) ? "this gym" : "another gym")
                                    + ". Use a different one.");
                });
            }
        }
    }

    /** Renames a deleted staff member's leftover login so its username/email can be reused. */
    private boolean releaseIfLeftover(User user) {
        if (user.isEnabled() || staffRepository.findByUserId(user.getId()).isPresent()) return false;
        boolean protectedAccount = userRoleRepository.findByUserId(user.getId()).stream()
                .map(ur -> ur.getRole().getRoleName().toUpperCase())
                .anyMatch(name -> name.equals("MEMBER") || name.equals(RoleService.OWNER_ROLE_NAME)
                        || name.equals(RoleService.ADMIN_ROLE_NAME));
        if (protectedAccount) return false;
        releaseLogin(user);
        return true;
    }

    private void releaseLogin(User user) {
        String oldUsername = user.getUsername();
        String oldEmail = user.getEmail();
        String prefix = "deleted-" + user.getId() + "-";
        if (oldUsername != null && !oldUsername.startsWith(prefix)) user.setUsername(prefix + oldUsername);
        if (oldEmail != null && !oldEmail.startsWith(prefix)) user.setEmail(prefix + oldEmail);
        user.setEnabled(false);
        userRepository.saveAndFlush(user);
        // A disabled login needs no routing entry; drop it so the name is free platform-wide.
        String tenant = TenantContextHolder.getCurrentTenant();
        if (tenant != null && oldUsername != null) {
            userDirectoryRepository.findByUsernameOrEmail(oldUsername, oldEmail != null ? oldEmail : oldUsername)
                    .filter(entry -> tenant.equals(entry.getTenantSlug()))
                    .ifPresent(userDirectoryRepository::delete);
        }
    }

    /** Matches the Administration → Staff role dropdown value to a security Role, falling back to STAFF. */
    private Role resolveSecurityRole(String staffRoleText) {
        if (staffRoleText != null && !staffRoleText.isBlank()) {
            Role match = roleRepository.findByRoleNameIgnoreCase(staffRoleText.trim()).orElse(null);
            if (match != null) {
                RoleService.assertAssignable(match);
                return match;
            }
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
            claimLoginIdentity(appUsername, staff.getEmail());
            User user = new User();
            user.setUsername(appUsername);
            user.setEmail(staff.getEmail());
            user.setPasswordHash(passwordEncoder.encode(appPassword));
            user.setEnabled(true);
            user.setUserRoles(new java.util.HashSet<>());
            user = userRepository.save(user);

            Role securityRole = resolveSecurityRole(appRole);
            userRoleRepository.save(new UserRole(null, user, securityRole));

            if (TenantContextHolder.getCurrentTenant() != null) {
                userDirectoryRepository.save(new UserDirectoryEntry(user.getUsername(), user.getEmail(), TenantContextHolder.getCurrentTenant()));
            }

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
        } else {
            syncAccountRole(saved);
        }

        return StaffResponseDTO.fromEntity(saved);
    }

    /**
     * The edit form's Role "also controls app access", but an HR-only save never reached
     * syncAppLogin, so the login kept whatever role it was created with (often the STAFF
     * fallback) and a role's permissions never applied to that person (BG_87). Re-points
     * the account at the security role matching the staff role — unless that text names
     * no role, so free-text designations never downgrade an account to STAFF.
     */
    private void syncAccountRole(Staff staff) {
        if (staff.getUserId() == null || staff.getRole() == null || staff.getRole().isBlank()) return;
        Role securityRole = roleRepository.findByRoleNameIgnoreCase(staff.getRole().trim()).orElse(null);
        if (securityRole == null || securityRole.getRoleName().equalsIgnoreCase(RoleService.ADMIN_ROLE_NAME)) return;
        User user = userRepository.findById(staff.getUserId()).orElse(null);
        if (user == null) return;

        List<UserRole> current = userRoleRepository.findByUserId(user.getId());
        if (current.size() == 1 && current.get(0).getRole().getId().equals(securityRole.getId())) return;
        RoleService.assertAssignable(securityRole);
        current.forEach(userRoleRepository::delete);
        userRoleRepository.save(new UserRole(null, user, securityRole));
    }

    public void deleteStaff(Long id) {
        Staff staff = staffRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Staff not found: " + id));

        // These rows hold FKs to staff.id, so Postgres rejects the delete while they exist.
        // Attendance/targets belong to the staff member and go with them; classes and streams
        // outlive their trainer, so just unassign them.
        staffAttendanceRepository.deleteByStaffId(id);
        staffTargetRepository.deleteByStaffId(id);
        trainingSessionRepository.clearTrainer(id);
        trainingStreamRepository.clearInstructor(id);
        staffBranchRepository.deleteByStaffId(id);

        // Revoke the linked app login rather than deleting the user, which other records may
        // reference, and free its username/email so the person can be added again later.
        if (staff.getUserId() != null) {
            userRepository.findById(staff.getUserId()).ifPresent(this::releaseLogin);
        }

        staffRepository.delete(staff);
    }

    private void applyRequest(StaffRequestDTO req, Staff staff) {
        // The platform-owner role is never a staff role, not even as a job title.
        for (String roleText : new String[] { req.getRole(), req.getAppRole() }) {
            if (roleText != null && roleText.trim().equalsIgnoreCase(RoleService.ADMIN_ROLE_NAME)) {
                throw new com.company.project.exceptions.BusinessRuleViolationException(
                        "The " + RoleService.ADMIN_ROLE_NAME + " role can't be assigned to staff");
            }
        }
        // employees.email is unique: say who has it instead of the generic duplicate error.
        if (req.getEmail() != null && !req.getEmail().isBlank()) {
            staffRepository.findByEmail(req.getEmail().trim())
                    .filter(other -> !other.getId().equals(staff.getId()))
                    .ifPresent(other -> {
                        throw new com.company.project.exceptions.BusinessRuleViolationException(
                                "Another staff member (" + other.getName() + ") already uses the email "
                                        + req.getEmail().trim() + ".");
                    });
        }
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
