package com.company.project.services;

import com.company.project.controlplane.entities.LeadCaptureForm;
import com.company.project.dto.FollowUpRequestDTO;
import com.company.project.dto.LeadRequestDTO;
import com.company.project.dto.LeadResponseDTO;
import com.company.project.dto.PublicLeadSubmissionDTO;
import com.company.project.entities.Branch;
import com.company.project.entities.Lead;
import com.company.project.entities.LeadInteraction;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.GymRepository;
import com.company.project.repositories.LeadInteractionRepository;
import com.company.project.repositories.LeadRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class LeadCaptureSubmissionServiceTest {

    @Mock private LeadService leadService;
    @Mock private FollowUpService followUpService;
    @Mock private NotificationService notificationService;
    @Mock private MembershipPlanService planService;
    @Mock private LeadRepository leadRepository;
    @Mock private LeadInteractionRepository interactionRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private GymRepository gymRepository;

    private LeadCaptureSubmissionService service;
    private LeadCaptureForm form;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new LeadCaptureSubmissionService(leadService, followUpService, notificationService, planService,
                leadRepository, interactionRepository, branchRepository, gymRepository);

        form = new LeadCaptureForm();
        form.setId(7L);
        form.setFormKey("abc123def456");
        form.setTenantSlug("test-gym");
        form.setBranchId(1L);
        form.setName("Diwali Offer");
        form.setSource("instagram");
        form.setAssignedStaff("Priya");

        Branch branch = new Branch();
        branch.setId(1L);
        branch.setStatus("ACTIVE");
        when(branchRepository.findById(1L)).thenReturn(Optional.of(branch));
        when(leadRepository.findLatestByBranchAndPhoneDigits(anyLong(), anyString())).thenReturn(Optional.empty());

        LeadResponseDTO created = new LeadResponseDTO();
        created.setId(42L);
        when(leadService.createLead(any())).thenReturn(created);
        when(interactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private PublicLeadSubmissionDTO validRequest() {
        PublicLeadSubmissionDTO req = new PublicLeadSubmissionDTO();
        req.setFullName("Asha Menon");
        req.setPhone("+91 98765-43210");
        req.setEmail("asha@example.com");
        req.setPreferredContactMethod("WhatsApp");
        req.setConsent(true);
        return req;
    }

    @Test
    void newSubmissionCreatesLeadFollowUpAndOwnerNotification() {
        PublicLeadSubmissionDTO req = validRequest();
        req.setUtmSource("facebook");
        req.setUtmCampaign("diwali");

        service.submit(form, req);

        ArgumentCaptor<LeadRequestDTO> lead = ArgumentCaptor.forClass(LeadRequestDTO.class);
        verify(leadService).createLead(lead.capture());
        assertEquals("Asha", lead.getValue().getFirstName());
        assertEquals("Menon", lead.getValue().getLastName());
        assertEquals("+919876543210", lead.getValue().getPhone());
        assertEquals("facebook-ads", lead.getValue().getSource(), "utm_source overrides the form default");
        assertEquals("Priya", lead.getValue().getAssignedStaff());
        assertEquals("whatsapp", lead.getValue().getPreferredContactMethod());
        assertTrue(lead.getValue().getTags().contains("campaign:diwali"));
        assertTrue(lead.getValue().getNotes().contains("Agreed to be contacted"));

        ArgumentCaptor<FollowUpRequestDTO> followUp = ArgumentCaptor.forClass(FollowUpRequestDTO.class);
        verify(followUpService).createFollowUp(followUp.capture());
        assertEquals(42L, followUp.getValue().getLeadId());
        assertEquals("whatsapp", followUp.getValue().getType());
        assertTrue(followUp.getValue().getDueDate().isAfter(LocalDateTime.now().plusMinutes(55)));

        verify(notificationService).notifyRoles(eq(List.of("ADMIN")), anyString(), anyString(),
                anyString(), anyString(), eq("LEADS"), eq(42L), eq("/leads"), anyString());
    }

    @Test
    void duplicateCheckUsesLastTenDigitsWithinFormBranch() {
        service.submit(form, validRequest());
        verify(leadRepository).findLatestByBranchAndPhoneDigits(1L, "9876543210");
    }

    @Test
    void repeatSubmissionLogsInteractionInsteadOfCreatingDuplicate() {
        Lead existing = new Lead();
        existing.setId(5L);
        existing.setFirstName("Asha");
        existing.setStatus("lost");
        when(leadRepository.findLatestByBranchAndPhoneDigits(1L, "9876543210")).thenReturn(Optional.of(existing));

        service.submit(form, validRequest());

        verify(leadService, never()).createLead(any());
        verify(followUpService, never()).createFollowUp(any());
        ArgumentCaptor<LeadInteraction> interaction = ArgumentCaptor.forClass(LeadInteraction.class);
        verify(interactionRepository).save(interaction.capture());
        assertSame(existing, interaction.getValue().getLead());
        assertEquals("new", existing.getStatus(), "a lost lead that comes back is reopened");
        assertEquals("asha@example.com", existing.getEmail(), "missing email is filled in");
    }

    @Test
    void rejectsMissingConsent() {
        PublicLeadSubmissionDTO req = validRequest();
        req.setConsent(null);
        assertThrows(IllegalArgumentException.class, () -> service.submit(form, req));
        verify(leadService, never()).createLead(any());
    }

    @Test
    void rejectsInvalidPhone() {
        PublicLeadSubmissionDTO req = validRequest();
        req.setPhone("12-34");
        assertThrows(IllegalArgumentException.class, () -> service.submit(form, req));
    }

    @Test
    void rejectsMissingRequiredEmailAndBadEmail() {
        form.setRequireEmail(true);
        PublicLeadSubmissionDTO noEmail = validRequest();
        noEmail.setEmail(" ");
        assertThrows(IllegalArgumentException.class, () -> service.submit(form, noEmail));

        PublicLeadSubmissionDTO badEmail = validRequest();
        badEmail.setEmail("not-an-email");
        assertThrows(IllegalArgumentException.class, () -> service.submit(form, badEmail));
    }

    @Test
    void ignoresFieldsTheFormDoesNotShow() {
        form.setShowEmail(false);
        form.setShowInterest(false);
        PublicLeadSubmissionDTO req = validRequest();
        req.setInterest("Gold Plan");

        service.submit(form, req);

        ArgumentCaptor<LeadRequestDTO> lead = ArgumentCaptor.forClass(LeadRequestDTO.class);
        verify(leadService).createLead(lead.capture());
        assertNull(lead.getValue().getEmail());
        assertNull(lead.getValue().getMembershipInterest());
    }

    @Test
    void inactiveBranchHidesForm() {
        Branch closed = new Branch();
        closed.setId(1L);
        closed.setStatus("INACTIVE");
        when(branchRepository.findById(1L)).thenReturn(Optional.of(closed));
        assertThrows(EntityNotFoundException.class, () -> service.submit(form, validRequest()));
    }

    @Test
    void resolveSourceMapsKnownPlatforms() {
        assertEquals("facebook-ads", LeadCaptureSubmissionService.resolveSource("social-media", "FB"));
        assertEquals("instagram", LeadCaptureSubmissionService.resolveSource("social-media", "ig"));
        assertEquals("google-ads", LeadCaptureSubmissionService.resolveSource("social-media", "google"));
        assertEquals("instagram", LeadCaptureSubmissionService.resolveSource("instagram", "newsletter"));
        assertEquals("social-media", LeadCaptureSubmissionService.resolveSource(null, null));
    }
}
