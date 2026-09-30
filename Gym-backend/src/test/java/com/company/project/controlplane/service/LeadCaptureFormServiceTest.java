package com.company.project.controlplane.service;

import com.company.project.controlplane.entities.LeadCaptureForm;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.LeadCaptureFormRepository;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.dto.LeadCaptureFormRequestDTO;
import com.company.project.dto.LeadCaptureFormResponseDTO;
import com.company.project.entities.Branch;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.BranchRepository;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.TenantContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class LeadCaptureFormServiceTest {

    @Mock private LeadCaptureFormRepository formRepository;
    @Mock private TenantRepository tenantRepository;
    @Mock private BranchRepository branchRepository;

    private LeadCaptureFormService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new LeadCaptureFormService(formRepository, tenantRepository, branchRepository);
        TenantContextHolder.setCurrentTenant("test-gym");
        for (long id : new long[]{1L, 2L}) {
            Branch b = new Branch();
            b.setId(id);
            b.setBranchName("Branch " + id);
            when(branchRepository.findById(id)).thenReturn(Optional.of(b));
        }
        when(formRepository.existsByFormKey(anyString())).thenReturn(false);
        when(formRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        TenantContextHolder.clear();
        BranchContextHolder.clear();
    }

    private LeadCaptureFormRequestDTO request(String name) {
        LeadCaptureFormRequestDTO req = new LeadCaptureFormRequestDTO();
        req.setName(name);
        return req;
    }

    @Test
    void createInBranchModeUsesActiveBranchNotRequestedOne() {
        BranchContextHolder.setActiveBranchId(1L);
        LeadCaptureFormRequestDTO req = request("Insta");
        req.setBranchId(2L);

        LeadCaptureFormResponseDTO dto = service.create(req);

        assertEquals(1L, dto.getBranchId());
        assertEquals(12, dto.getFormKey().length());
        assertTrue(dto.getFormKey().matches("[A-Za-z0-9]+"));
    }

    @Test
    void createInAllBranchesModeRequiresBranch() {
        assertThrows(IllegalArgumentException.class, () -> service.create(request("Insta")));
    }

    @Test
    void createWithoutTenantIsRejected() {
        TenantContextHolder.clear();
        BranchContextHolder.setActiveBranchId(1L);
        assertThrows(IllegalStateException.class, () -> service.create(request("Insta")));
    }

    @Test
    void validatesNameSourceAndPrivacyUrl() {
        BranchContextHolder.setActiveBranchId(1L);
        assertThrows(IllegalArgumentException.class, () -> service.create(request("  ")));

        LeadCaptureFormRequestDTO badSource = request("Insta");
        badSource.setSource("tiktok-spam");
        assertThrows(IllegalArgumentException.class, () -> service.create(badSource));

        LeadCaptureFormRequestDTO badUrl = request("Insta");
        badUrl.setPrivacyPolicyUrl("javascript:alert(1)");
        assertThrows(IllegalArgumentException.class, () -> service.create(badUrl));

        LeadCaptureFormRequestDTO goodUrl = request("Insta");
        goodUrl.setPrivacyPolicyUrl("https://mygym.com/privacy");
        assertEquals("https://mygym.com/privacy", service.create(goodUrl).getPrivacyPolicyUrl());
    }

    @Test
    void requiredEmailIsAlwaysShown() {
        BranchContextHolder.setActiveBranchId(1L);
        LeadCaptureFormRequestDTO req = request("Insta");
        req.setShowEmail(false);
        req.setRequireEmail(true);
        assertTrue(service.create(req).isShowEmail());
    }

    @Test
    void cannotEditAnotherTenantsOrBranchsForm() {
        when(formRepository.findByIdAndTenantSlug(9L, "test-gym")).thenReturn(Optional.empty());
        assertThrows(EntityNotFoundException.class, () -> service.update(9L, request("x")));

        LeadCaptureForm otherBranch = new LeadCaptureForm();
        otherBranch.setId(10L);
        otherBranch.setBranchId(2L);
        when(formRepository.findByIdAndTenantSlug(10L, "test-gym")).thenReturn(Optional.of(otherBranch));
        BranchContextHolder.setActiveBranchId(1L);
        assertThrows(EntityNotFoundException.class, () -> service.delete(10L));
        verify(formRepository, never()).delete(any());
    }

    @Test
    void publicLookupHidesPausedFormsAndInactiveGyms() {
        LeadCaptureForm form = new LeadCaptureForm();
        form.setFormKey("k");
        form.setTenantSlug("test-gym");
        when(formRepository.findByFormKey("k")).thenReturn(Optional.of(form));
        Tenant tenant = new Tenant("Test Gym", "test-gym");
        when(tenantRepository.findBySlug("test-gym")).thenReturn(Optional.of(tenant));

        assertSame(form, service.getActiveForm("k"));

        tenant.setStatus("SUSPENDED");
        assertThrows(EntityNotFoundException.class, () -> service.getActiveForm("k"));

        tenant.setStatus("ACTIVE");
        form.setActive(false);
        assertThrows(EntityNotFoundException.class, () -> service.getActiveForm("k"));
        assertThrows(EntityNotFoundException.class, () -> service.getActiveForm("missing"));
    }
}
