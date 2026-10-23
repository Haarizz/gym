package com.company.project.services.accounts;

import com.company.project.community.global.identity.TenantDataSources;
import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.entities.AccountLinkRequest;
import com.company.project.controlplane.entities.UserDirectoryEntry;
import com.company.project.controlplane.entities.UserMembershipEntry;
import com.company.project.controlplane.repositories.AccountLinkRequestRepository;
import com.company.project.controlplane.repositories.TenantConnectionRepository;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.controlplane.repositories.UserDirectoryRepository;
import com.company.project.controlplane.repositories.UserMembershipRepository;
import com.company.project.entities.Member;
import com.company.project.services.accounts.GymLoginMigrationService.Candidate;
import com.company.project.services.accounts.GymLoginMigrationService.Outcome;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GymLoginMigrationServiceTest {

    @Mock private TenantRepository tenantRepository;
    @Mock private TenantConnectionRepository tenantConnectionRepository;
    @Mock private TenantDataSourceRegistry tenantDataSourceRegistry;
    @Mock private TenantDataSources tenantDataSources;
    @Mock private DataSource primaryDataSource;
    @Mock private GlobalAccountService accounts;
    @Mock private UserDirectoryRepository userDirectoryRepository;
    @Mock private UserMembershipRepository userMembershipRepository;
    @Mock private AccountLinkRequestRepository linkRequestRepository;
    @Mock private JdbcTemplate gym;

    private GymLoginMigrationService service;

    @BeforeEach
    void setUp() {
        service = new GymLoginMigrationService(tenantRepository, tenantConnectionRepository, tenantDataSourceRegistry,
                tenantDataSources, primaryDataSource, accounts, userDirectoryRepository, userMembershipRepository,
                linkRequestRepository);
    }

    private static Candidate candidate(String loginEmail, Long globalUserId, boolean staff) {
        Member identity = new Member();
        identity.setName("Grace Hopper");
        identity.setAllergies("Peanuts");
        return new Candidate(7L, "Grace Hopper", globalUserId, 70L, "grace_h", loginEmail, null,
                "$2a$10$hash", staff, identity);
    }

    @Test
    void free_username_and_email_moves_to_a_global_account_with_the_same_password() {
        when(accounts.findMigratedAccountId("grace_h")).thenReturn(Optional.empty());
        when(accounts.findByEmail("grace@example.com")).thenReturn(Optional.empty());
        when(accounts.usernameTaken("grace_h")).thenReturn(false);
        when(accounts.importGymLogin("Grace Hopper", "grace_h", "grace@example.com", "$2a$10$hash")).thenReturn(55L);
        when(gym.update(startsWith("UPDATE members SET global_user_id"), eq(55L), eq(7L))).thenReturn(1);
        UserDirectoryEntry entry = new UserDirectoryEntry("grace_h", "grace@example.com", "gym-a");
        when(userDirectoryRepository.findByUsername("grace_h")).thenReturn(Optional.of(entry));

        var row = service.handle(candidate("grace@example.com", null, false), "gym-a", "Iron Gym", gym, false);

        assertEquals(Outcome.MIGRATE, row.outcome());
        verify(accounts).writeProfile(eq(55L), argThat(v -> "Peanuts".equals(v.get(IdentityField.ALLERGIES))),
                eq(EnumSet.allOf(IdentityField.class)));
        verify(gym).update("UPDATE users SET enabled = FALSE WHERE id = ?", 70L);
        verify(gym).update("UPDATE members SET user_id = NULL WHERE id = ?", 7L);
        verify(userDirectoryRepository).delete(entry);
        verify(userMembershipRepository).save(any(UserMembershipEntry.class));
    }

    @Test
    void dry_run_reports_the_same_decision_and_writes_nothing() {
        when(accounts.findMigratedAccountId("grace_h")).thenReturn(Optional.empty());
        when(accounts.findByEmail("grace@example.com")).thenReturn(Optional.empty());
        when(accounts.usernameTaken("grace_h")).thenReturn(false);

        var row = service.handle(candidate("grace@example.com", null, false), "gym-a", "Iron Gym", gym, true);

        assertEquals(Outcome.MIGRATE, row.outcome());
        verify(accounts, never()).importGymLogin(any(), any(), any(), any());
        verifyNoInteractions(gym, userDirectoryRepository, userMembershipRepository, linkRequestRepository);
    }

    @Test
    void email_with_an_existing_account_is_never_merged_but_sent_a_link_request() {
        when(accounts.findMigratedAccountId("grace_h")).thenReturn(Optional.empty());
        when(accounts.findByEmail("grace@example.com")).thenReturn(Optional.of(
                new GlobalAccountService.Account(99L, "grace_app", "grace@example.com", true, "Grace")));
        when(linkRequestRepository.findByTenantSlugAndMemberIdAndStatus("gym-a", 7L, AccountLinkRequest.PENDING))
                .thenReturn(List.of());

        var row = service.handle(candidate("grace@example.com", null, false), "gym-a", "Iron Gym", gym, false);

        assertEquals(Outcome.LINK_REQUEST, row.outcome());
        ArgumentCaptor<AccountLinkRequest> saved = ArgumentCaptor.forClass(AccountLinkRequest.class);
        verify(linkRequestRepository).save(saved.capture());
        assertEquals(99L, saved.getValue().getGlobalUserId());
        verify(accounts, never()).importGymLogin(any(), any(), any(), any());
        verifyNoInteractions(gym);
    }

    @Test
    void an_open_request_is_not_sent_twice() {
        when(accounts.findMigratedAccountId("grace_h")).thenReturn(Optional.empty());
        when(accounts.findByEmail("grace@example.com")).thenReturn(Optional.of(
                new GlobalAccountService.Account(99L, "grace_app", "grace@example.com", true, "Grace")));
        AccountLinkRequest open = new AccountLinkRequest();
        open.setExpiresAt(LocalDateTime.now().plusDays(3));
        when(linkRequestRepository.findByTenantSlugAndMemberIdAndStatus("gym-a", 7L, AccountLinkRequest.PENDING))
                .thenReturn(List.of(open));

        var row = service.handle(candidate("grace@example.com", null, false), "gym-a", "Iron Gym", gym, false);

        assertEquals(Outcome.ALREADY_REQUESTED, row.outcome());
        verify(linkRequestRepository, never()).save(any());
    }

    @Test
    void a_username_someone_else_has_is_left_for_a_person_to_decide() {
        when(accounts.findMigratedAccountId("grace_h")).thenReturn(Optional.empty());
        when(accounts.findByEmail("grace@example.com")).thenReturn(Optional.empty());
        when(accounts.usernameTaken("grace_h")).thenReturn(true);

        var row = service.handle(candidate("grace@example.com", null, false), "gym-a", "Iron Gym", gym, false);

        assertEquals(Outcome.BLOCKED_USERNAME, row.outcome());
        verifyNoInteractions(gym);
    }

    @Test
    void an_already_linked_member_only_has_the_gym_login_retired() {
        var row = service.handle(candidate("grace@example.com", 55L, false), "gym-a", "Iron Gym", gym, false);

        assertEquals(Outcome.RETIRE_GYM_LOGIN, row.outcome());
        verify(gym).update("UPDATE users SET enabled = FALSE WHERE id = ?", 70L);
        verify(accounts, never()).importGymLogin(any(), any(), any(), any());
    }

    @Test
    void staff_logins_are_never_touched() {
        var row = service.handle(candidate("grace@example.com", null, true), "gym-a", "Iron Gym", gym, false);

        assertEquals(Outcome.SKIPPED_STAFF_LOGIN, row.outcome());
        verifyNoInteractions(gym, accounts);
    }

    @Test
    void an_interrupted_run_resumes_on_the_account_it_created() {
        when(accounts.findMigratedAccountId("grace_h")).thenReturn(Optional.of(55L));
        when(gym.update(startsWith("UPDATE members SET global_user_id"), eq(55L), eq(7L))).thenReturn(1);
        when(userDirectoryRepository.findByUsername("grace_h")).thenReturn(Optional.empty());

        var row = service.handle(candidate("grace@example.com", null, false), "gym-a", "Iron Gym", gym, false);

        assertEquals(Outcome.MIGRATE, row.outcome());
        verify(accounts, never()).importGymLogin(any(), any(), any(), any());
        verify(gym).update("UPDATE users SET enabled = FALSE WHERE id = ?", 70L);
    }
}
