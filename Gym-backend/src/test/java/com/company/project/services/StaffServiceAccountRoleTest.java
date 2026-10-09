package com.company.project.services;

import com.company.project.controlplane.repositories.UserDirectoryRepository;
import com.company.project.dto.StaffRequestDTO;
import com.company.project.entities.Role;
import com.company.project.entities.Staff;
import com.company.project.entities.User;
import com.company.project.entities.UserRole;
import com.company.project.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** BG_87: an HR-only edit of a staff member's Role must move their login account to that role. */
class StaffServiceAccountRoleTest {

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
    private Staff staff;
    private User user;
    private final Role staffRole = role(7L, "STAFF");
    private final Role trainerRole = role(9L, "TRAINER");
    private final Role platformAdmin = role(10L, "GYMBIOS_ADMIN");

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new StaffService(staffRepository, userRepository, roleRepository, userRoleRepository, passwordEncoder,
                staffBranchRepository, branchService, userDirectoryRepository, staffAttendanceRepository,
                staffTargetRepository, trainingSessionRepository, trainingStreamRepository);

        user = new User();
        user.setId(50L);
        staff = new Staff();
        staff.setId(5L);
        staff.setName("Gana");
        staff.setRole("Receptionist");
        staff.setUserId(user.getId());

        when(staffRepository.findById(5L)).thenReturn(Optional.of(staff));
        when(staffRepository.save(any(Staff.class))).thenAnswer(a -> a.getArgument(0));
        when(userRepository.findById(50L)).thenReturn(Optional.of(user));
        when(roleRepository.findByRoleNameIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(roleRepository.findByRoleNameIgnoreCase("Trainer")).thenReturn(Optional.of(trainerRole));
        when(roleRepository.findByRoleNameIgnoreCase("Gymbios_Admin")).thenReturn(Optional.of(platformAdmin));
    }

    private static Role role(Long id, String name) {
        Role r = new Role(name);
        r.setId(id);
        return r;
    }

    private void accountHas(Role... roles) {
        List<UserRole> rows = new ArrayList<>();
        for (Role r : roles) rows.add(new UserRole(null, user, r));
        when(userRoleRepository.findByUserId(50L)).thenReturn(rows);
    }

    private static StaffRequestDTO editRoleTo(String role) {
        StaffRequestDTO req = new StaffRequestDTO();
        req.setRole(role);
        return req;
    }

    @Test
    void editingRoleToTrainerMovesTheLoginOffStaff() {
        accountHas(staffRole);

        service.updateStaff(5L, editRoleTo("Trainer"));

        verify(userRoleRepository).delete(any(UserRole.class));
        ArgumentCaptor<UserRole> saved = ArgumentCaptor.forClass(UserRole.class);
        verify(userRoleRepository).save(saved.capture());
        assertEquals("TRAINER", saved.getValue().getRole().getRoleName());
    }

    @Test
    void resavingWithTheSameRoleRepairsAnAccountStuckOnStaff() {
        staff.setRole("Trainer");
        accountHas(staffRole);

        service.updateStaff(5L, new StaffRequestDTO());

        verify(userRoleRepository).save(argThat(ur -> ur.getRole() == trainerRole));
    }

    @Test
    void accountAlreadyOnTheRoleIsLeftAlone() {
        accountHas(trainerRole);

        service.updateStaff(5L, editRoleTo("Trainer"));

        verify(userRoleRepository, never()).delete(any(UserRole.class));
        verify(userRoleRepository, never()).save(any(UserRole.class));
    }

    @Test
    void roleTextNamingNoSecurityRoleNeverDowngradesTheAccount() {
        accountHas(trainerRole);

        service.updateStaff(5L, editRoleTo("Head Coach"));

        verify(userRoleRepository, never()).delete(any(UserRole.class));
        verify(userRoleRepository, never()).save(any(UserRole.class));
    }

    @Test
    void neverGrantsThePlatformAdminRole() {
        accountHas(staffRole);

        service.updateStaff(5L, editRoleTo("Gymbios_Admin"));

        verify(userRoleRepository, never()).save(any(UserRole.class));
    }

    @Test
    void staffWithoutALoginIsUnaffected() {
        staff.setUserId(null);

        service.updateStaff(5L, editRoleTo("Trainer"));

        verifyNoInteractions(userRoleRepository);
    }
}
