package com.company.project.services;

import com.company.project.controlplane.repositories.UserDirectoryRepository;
import com.company.project.entities.Staff;
import com.company.project.repositories.*;
import com.company.project.security.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** A staff member or trainer registering a member is credited with the sale; admins are not. */
class StaffServiceSelfCreditTest {

    @Mock private StaffRepository staffRepository;
    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private UserRoleRepository userRoleRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private StaffBranchRepository staffBranchRepository;
    @Mock private BranchService branchService;
    @Mock private UserDirectoryRepository userDirectoryRepository;
    @Mock private StaffAttendanceRepository staffAttendanceRepository;
    @Mock private StaffTargetRepository staffTargetRepository;
    @Mock private TrainingSessionRepository trainingSessionRepository;
    @Mock private TrainingStreamRepository trainingStreamRepository;

    private StaffService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new StaffService(staffRepository, userRepository, roleRepository, userRoleRepository, passwordEncoder,
                staffBranchRepository, branchService, userDirectoryRepository, staffAttendanceRepository,
                staffTargetRepository, trainingSessionRepository, trainingStreamRepository);
        Staff staff = new Staff();
        staff.setId(42L);
        when(staffRepository.findByUserId(5L)).thenReturn(Optional.of(staff));
    }

    private static UserDetailsImpl principal(String role, boolean global) {
        return new UserDetailsImpl(5L, "user", null, "x",
                List.of(new SimpleGrantedAuthority("ROLE_" + role)), true, global);
    }

    @Test
    void trainerAndStaffAreCreditedThemselves() {
        assertEquals(42L, service.resolveSelfCreditStaffId(principal("TRAINER", false)));
        assertEquals(42L, service.resolveSelfCreditStaffId(principal("STAFF", false)));
    }

    @Test
    void adminIsNotCredited() {
        assertNull(service.resolveSelfCreditStaffId(principal("ADMIN", false)));
        verify(staffRepository, never()).findByUserId(any());
    }

    @Test
    void globalMembersAndMissingPrincipalAreNotCredited() {
        assertNull(service.resolveSelfCreditStaffId(principal("MEMBER", true)));
        assertNull(service.resolveSelfCreditStaffId(null));
    }

    @Test
    void accountWithoutStaffRecordIsNotCredited() {
        when(staffRepository.findByUserId(5L)).thenReturn(Optional.empty());
        assertNull(service.resolveSelfCreditStaffId(principal("RECEPTIONIST", false)));
    }
}
