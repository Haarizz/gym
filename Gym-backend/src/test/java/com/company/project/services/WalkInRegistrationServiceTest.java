package com.company.project.services;

import com.company.project.dto.MembershipPlanResponseDTO;
import com.company.project.dto.WalkInSelfRegistrationDTOs.PublicSubmission;
import com.company.project.entities.Branch;
import com.company.project.entities.MembershipPlan;
import com.company.project.entities.WalkInRegistration;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.FinancialSettingRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.WalkInRegistrationRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class WalkInRegistrationServiceTest {

    @Mock private WalkInRegistrationRepository registrationRepository;
    @Mock private StaffRepository staffRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private MembershipPlanService planService;
    @Mock private FinancialSettingRepository financialSettingRepository;

    @InjectMocks
    private WalkInRegistrationService service;

    private Branch branch;

    @BeforeEach
    void setUp() {
        branch = new Branch();
        branch.setBranchName("Downtown");
        branch.setStatus("ACTIVE");
        branch.setWalkInSelfRegistration(true);
        when(branchRepository.findById(1L)).thenReturn(Optional.of(branch));
        MembershipPlanResponseDTO dayPass = plan(5L, "Day Pass", "Walk-In");
        MembershipPlanResponseDTO monthly = plan(6L, "Monthly", "Standard");
        when(planService.getPlans("Active")).thenReturn(List.of(dayPass, monthly));
        when(registrationRepository.findByStatusAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(eq("pending"), any()))
                .thenReturn(List.of());
    }

    private static MembershipPlanResponseDTO plan(Long id, String name, String planType) {
        MembershipPlan p = new MembershipPlan();
        p.setId(id);
        p.setName(name);
        p.setPlanType(planType);
        p.setPrice(new BigDecimal("50"));
        return MembershipPlanResponseDTO.fromEntity(p);
    }

    private WalkInRegistration saved() {
        ArgumentCaptor<WalkInRegistration> captor = ArgumentCaptor.forClass(WalkInRegistration.class);
        verify(registrationRepository).save(captor.capture());
        return captor.getValue();
    }

    @Test
    void queuesThePendingVisitorWithTheScannedStaffMember() {
        when(staffRepository.findWalkInReferrer("abc123", 1L)).thenReturn(List.<Object[]>of(new Object[]{7L, "Sara"}));

        service.submit(1L, new PublicSubmission(" Ali ", "+971 50 123 4567", null, 5L, "abc123", null));

        WalkInRegistration r = saved();
        assertEquals("Ali", r.getName());
        assertEquals("pending", r.getStatus());
        assertEquals("Day Pass", r.getPlanName());
        assertEquals(7L, r.getReferredByStaffId());
        assertEquals("Sara", r.getReferredByStaffName());
    }

    @Test
    void rescanningUpdatesTodaysPendingRowInsteadOfQueuingTwice() {
        WalkInRegistration existing = new WalkInRegistration();
        existing.setPhone("0501234567");
        when(registrationRepository.findByStatusAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(eq("pending"), any()))
                .thenReturn(List.of(existing));

        service.submit(1L, new PublicSubmission("Ali", "+971 50 123 4567", null, null, null, null));

        assertSame(existing, saved());
    }

    @Test
    void onlyWalkInPlansCanBePicked() {
        assertThrows(IllegalArgumentException.class,
                () -> service.submit(1L, new PublicSubmission("Ali", "0501234567", null, 6L, null, null)));
        verify(registrationRepository, never()).save(any());
    }

    @Test
    void anUnknownStaffCodeStillRegistersTheVisitorUncredited() {
        when(staffRepository.findWalkInReferrer(any(), any())).thenReturn(List.of());

        service.submit(1L, new PublicSubmission("Ali", "0501234567", null, null, "nope", null));

        assertNull(saved().getReferredByStaffId());
    }

    @Test
    void branchesThatHaventSwitchedItOnDontAnswer() {
        branch.setWalkInSelfRegistration(false);
        assertThrows(EntityNotFoundException.class, () -> service.describe(1L, "Gym", null));
        assertThrows(EntityNotFoundException.class,
                () -> service.submit(1L, new PublicSubmission("Ali", "0501234567", null, null, null, null)));
    }

    @Test
    void publicPageListsOnlyWalkInPlans() {
        var page = service.describe(1L, "Iron Gym", null);
        assertEquals(1, page.plans().size());
        assertEquals("Day Pass", page.plans().get(0).name());
        assertEquals("AED", page.currencyCode());
    }

    @Test
    void anAlreadyConfirmedRegistrationCannotBeClaimedAgain() {
        WalkInRegistration done = new WalkInRegistration();
        done.setName("Ali");
        done.setStatus("confirmed");
        when(registrationRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(done));
        assertThrows(IllegalArgumentException.class, () -> service.claimPending(3L));
    }
}
