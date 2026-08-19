package com.company.project.services;

import com.company.project.dto.BranchRequestDTO;
import com.company.project.dto.BranchResponseDTO;
import com.company.project.dto.StaffResponseDTO;
import com.company.project.entities.Branch;
import com.company.project.entities.StaffBranch;
import com.company.project.entities.UserBranch;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.StaffBranchRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.UserBranchRepository;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.UserDetailsImpl;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class BranchService {

    private final BranchRepository branchRepository;
    private final StaffBranchRepository staffBranchRepository;
    private final UserBranchRepository userBranchRepository;
    private final StaffRepository staffRepository;
    private final MemberRepository memberRepository;

    public BranchService(BranchRepository branchRepository,
                         StaffBranchRepository staffBranchRepository,
                         UserBranchRepository userBranchRepository,
                         StaffRepository staffRepository,
                         MemberRepository memberRepository) {
        this.branchRepository = branchRepository;
        this.staffBranchRepository = staffBranchRepository;
        this.userBranchRepository = userBranchRepository;
        this.staffRepository = staffRepository;
        this.memberRepository = memberRepository;
    }

    // ── Branch CRUD ─────────────────────────────────────────────────────────

    public List<BranchResponseDTO> getAllBranches() {
        return branchRepository.findAll().stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    public List<BranchResponseDTO> getActiveBranches() {
        return branchRepository.findByStatus("ACTIVE").stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    public BranchResponseDTO getBranchById(Long id) {
        Branch branch = branchRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Branch not found: " + id));
        return toResponseDTO(branch);
    }

    public BranchResponseDTO createBranch(BranchRequestDTO request) {
        if (branchRepository.existsByBranchCode(request.getBranchCode())) {
            throw new RuntimeException("Branch code already exists: " + request.getBranchCode());
        }
        Branch branch = new Branch();
        branch.setBranchName(request.getBranchName());
        branch.setBranchCode(request.getBranchCode().toUpperCase());
        branch.setAddress(request.getAddress());
        branch.setPhone(request.getPhone());
        branch.setEmail(request.getEmail());
        branch.setStatus(request.getStatus() != null ? request.getStatus() : "ACTIVE");
        branch = branchRepository.save(branch);
        return toResponseDTO(branch);
    }

    public BranchResponseDTO updateBranch(Long id, BranchRequestDTO request) {
        Branch branch = branchRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Branch not found: " + id));
        if (request.getBranchName() != null) branch.setBranchName(request.getBranchName());
        if (request.getBranchCode() != null) {
            String newCode = request.getBranchCode().toUpperCase();
            if (!newCode.equals(branch.getBranchCode()) && branchRepository.existsByBranchCode(newCode)) {
                throw new RuntimeException("Branch code already exists: " + newCode);
            }
            branch.setBranchCode(newCode);
        }
        if (request.getAddress() != null) branch.setAddress(request.getAddress());
        if (request.getPhone() != null) branch.setPhone(request.getPhone());
        if (request.getEmail() != null) branch.setEmail(request.getEmail());
        if (request.getStatus() != null) branch.setStatus(request.getStatus());
        branch = branchRepository.save(branch);
        return toResponseDTO(branch);
    }

    public BranchResponseDTO updateBranchStatus(Long id, String status) {
        Branch branch = branchRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Branch not found: " + id));
        if (branch.isDefault() && "INACTIVE".equalsIgnoreCase(status)) {
            throw new RuntimeException("Cannot deactivate the default branch");
        }
        branch.setStatus(status);
        branch = branchRepository.save(branch);
        return toResponseDTO(branch);
    }

    // ── User-accessible branches ────────────────────────────────────────────

    /**
     * Returns branches the current user can access.
     * Admin/Super Admin users get all active branches.
     * Other users get only their assigned branches.
     */
    public List<BranchResponseDTO> getMyBranches() {
        UserDetailsImpl userDetails = getCurrentUser();
        if (isAdmin(userDetails)) {
            return getActiveBranches();
        }
        List<Long> branchIds = userBranchRepository.findBranchIdsByUserId(userDetails.getId());
        return branchRepository.findByIdIn(branchIds).stream()
                .filter(b -> "ACTIVE".equals(b.getStatus()))
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Validates whether the user has access to the given branch.
     * Admin users always have access.
     */
    public boolean hasAccess(Long userId, Long branchId) {
        UserDetailsImpl userDetails = getCurrentUser();
        if (isAdmin(userDetails)) return true;
        return userBranchRepository.existsByUserIdAndBranchId(userId, branchId);
    }

    /**
     * Resolves the branch for a create operation.
     * If active branch is set, returns it (overrides any frontend-sent value).
     * If "All Branches" mode (null), requires explicit branchId in the request.
     */
    public Long resolveBranchForCreate(Long requestBranchId) {
        Long activeBranchId = BranchContextHolder.getActiveBranchId();
        if (activeBranchId != null) {
            return activeBranchId;
        }
        // All Branches mode — require explicit branch
        if (requestBranchId == null) {
            throw new RuntimeException("Branch must be specified when operating in All Branches mode");
        }
        // Validate the user has access to the requested branch
        UserDetailsImpl userDetails = getCurrentUser();
        if (!isAdmin(userDetails) && !userBranchRepository.existsByUserIdAndBranchId(userDetails.getId(), requestBranchId)) {
            throw new RuntimeException("You do not have access to the specified branch");
        }
        return requestBranchId;
    }

    /**
     * Returns the list of branch IDs the current user can access.
     * Used for filtering in "All Branches" mode for non-admin users.
     */
    public List<Long> getAccessibleBranchIds() {
        UserDetailsImpl userDetails = getCurrentUser();
        if (isAdmin(userDetails)) {
            return branchRepository.findByStatus("ACTIVE").stream()
                    .map(Branch::getId)
                    .collect(Collectors.toList());
        }
        return userBranchRepository.findBranchIdsByUserId(userDetails.getId());
    }

    // ── Staff / Trainer branch assignment ────────────────────────────────────

    public void assignStaffToBranch(Long staffId, Long branchId) {
        if (!staffBranchRepository.existsByStaffIdAndBranchId(staffId, branchId)) {
            staffBranchRepository.save(new StaffBranch(staffId, branchId));
        }
    }

    public void removeStaffFromBranch(Long staffId, Long branchId) {
        staffBranchRepository.deleteByStaffIdAndBranchId(staffId, branchId);
    }

    public void setStaffBranches(Long staffId, List<Long> branchIds) {
        staffBranchRepository.deleteByStaffId(staffId);
        for (Long branchId : branchIds) {
            staffBranchRepository.save(new StaffBranch(staffId, branchId));
        }
    }

    public List<Long> getStaffBranchIds(Long staffId) {
        return staffBranchRepository.findBranchIdsByStaffId(staffId);
    }

    public List<BranchResponseDTO> getStaffBranches(Long staffId) {
        List<Long> branchIds = staffBranchRepository.findBranchIdsByStaffId(staffId);
        return branchRepository.findByIdIn(branchIds).stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    // ── User branch assignment ──────────────────────────────────────────────

    public void assignUserToBranch(Long userId, Long branchId) {
        if (!userBranchRepository.existsByUserIdAndBranchId(userId, branchId)) {
            userBranchRepository.save(new UserBranch(userId, branchId));
        }
    }

    public void removeUserFromBranch(Long userId, Long branchId) {
        userBranchRepository.deleteByUserIdAndBranchId(userId, branchId);
    }

    public void setUserBranches(Long userId, List<Long> branchIds) {
        userBranchRepository.deleteByUserId(userId);
        for (Long branchId : branchIds) {
            userBranchRepository.save(new UserBranch(userId, branchId));
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private BranchResponseDTO toResponseDTO(Branch branch) {
        BranchResponseDTO dto = new BranchResponseDTO();
        dto.setId(branch.getId());
        dto.setBranchName(branch.getBranchName());
        dto.setBranchCode(branch.getBranchCode());
        dto.setAddress(branch.getAddress());
        dto.setPhone(branch.getPhone());
        dto.setEmail(branch.getEmail());
        dto.setStatus(branch.getStatus());
        dto.setDefault(branch.isDefault());
        dto.setCreatedAt(branch.getCreatedAt());
        dto.setUpdatedAt(branch.getUpdatedAt());
        // Counts
        dto.setStaffCount(staffBranchRepository.findByBranchId(branch.getId()).size());
        dto.setMemberCount(memberRepository.countByBranchId(branch.getId()));
        return dto;
    }

    private UserDetailsImpl getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserDetailsImpl)) {
            throw new RuntimeException("No authenticated user");
        }
        return (UserDetailsImpl) auth.getPrincipal();
    }

    private boolean isAdmin(UserDetailsImpl userDetails) {
        return userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> a.equals("ROLE_ADMIN") || a.equals("ROLE_SUPER_ADMIN"));
    }
}
