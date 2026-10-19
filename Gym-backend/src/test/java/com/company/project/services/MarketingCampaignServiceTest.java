package com.company.project.services;

import com.company.project.controlplane.entities.LeadCaptureForm;
import com.company.project.controlplane.repositories.LeadCaptureFormRepository;
import com.company.project.dto.MarketingCampaignDTOs.Campaign;
import com.company.project.dto.MarketingCampaignDTOs.CampaignRequest;
import com.company.project.dto.MarketingCampaignDTOs.LeadFormLinkRequest;
import com.company.project.dto.MarketingCampaignDTOs.Metrics;
import com.company.project.entities.MarketingCampaign;
import com.company.project.entities.MarketingCampaignLeadForm;
import com.company.project.entities.MarketingCampaignSpend;
import com.company.project.entities.Receipt;
import com.company.project.repositories.*;
import com.company.project.security.TenantContextHolder;
import com.company.project.services.pos.PosBusinessDayService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MarketingCampaignServiceTest {

    @Mock private MarketingCampaignRepository campaignRepository;
    @Mock private MarketingCampaignSpendRepository spendRepository;
    @Mock private MarketingCampaignLeadFormRepository linkRepository;
    @Mock private LeadRepository leadRepository;
    @Mock private ReceiptRepository receiptRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private BranchService branchService;
    @Mock private LeadCaptureFormRepository formRepository;
    @Mock private PosBusinessDayService businessDayService;

    private MarketingCampaignService service;
    private MarketingCampaign campaign;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        TenantContextHolder.setCurrentTenant("test-gym");
        when(businessDayService.zone()).thenReturn(ZoneOffset.UTC);
        service = new MarketingCampaignService(campaignRepository, spendRepository, linkRepository, leadRepository,
                receiptRepository, branchRepository, branchService, formRepository, businessDayService);

        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        campaign = new MarketingCampaign();
        campaign.setId(1L);
        campaign.setName("Diwali Blast");
        campaign.setStatus("active");
        campaign.setStartDate(today.minusDays(2));
        campaign.setEndDate(today.plusDays(2));
        campaign.setBudget(new BigDecimal("10000"));
        campaign.setTargetLeads(20);
        campaign.setBranchId(1L);
        when(campaignRepository.findAllByOrderByStartDateDescIdDesc()).thenReturn(List.of(campaign));
        when(campaignRepository.findById(1L)).thenReturn(Optional.of(campaign));
    }

    @AfterEach
    void tearDown() {
        TenantContextHolder.clear();
    }

    private static Object[] lead(long id, String status, Long memberId, LocalDateTime createdAt, Long formId) {
        return new Object[]{id, 1L, status, memberId, createdAt, formId, "instagram", "Priya",
                "converted".equals(status) ? createdAt.plusDays(2) : null};
    }

    private static MarketingCampaignSpend spend(String amount, String hours) {
        MarketingCampaignSpend s = new MarketingCampaignSpend();
        s.setId(1L);
        s.setCampaignId(1L);
        s.setSpendDate(LocalDate.now(ZoneOffset.UTC));
        s.setAmount(new BigDecimal(amount));
        s.setHours(new BigDecimal(hours));
        return s;
    }

    @Test
    @SuppressWarnings("unchecked")
    void listComputesFunnelSpendAndReturnOnSpend() {
        LocalDateTime t = LocalDateTime.now().minusDays(1);
        when(leadRepository.findCampaignLeadRows(List.of(1L))).thenReturn(List.of(
                lead(1, "new", null, t, 7L),
                lead(2, "contacted", null, t, 7L),
                lead(3, "lost", null, t, 7L),
                lead(4, "converted", 100L, t, 7L)));
        when(spendRepository.findByCampaignIdIn(List.of(1L))).thenReturn(List.of(spend("3000", "4"), spend("1000", "0")));
        when(linkRepository.findByCampaignIdIn(List.of(1L))).thenReturn(List.of(new MarketingCampaignLeadForm(1L, 7L)));
        LeadCaptureForm form = new LeadCaptureForm();
        form.setId(7L);
        form.setName("Diwali IG form");
        form.setActive(true);
        when(formRepository.findByTenantSlugAndIdIn(eq("test-gym"), any())).thenReturn(List.of(form));

        Receipt before = new Receipt();
        before.setMemberDbId(100L);
        before.setStatus("Paid");
        before.setAmount(new BigDecimal("999"));
        before.setTransactionDate(t.minusDays(30)); // paid before they were this campaign's lead
        Receipt after = new Receipt();
        after.setMemberDbId(100L);
        after.setStatus("Paid");
        after.setAmount(new BigDecimal("6000"));
        after.setTransactionDate(t.plusDays(2));
        when(receiptRepository.findAll(any(Specification.class))).thenReturn(List.of(before, after));

        Campaign c = service.list().get(0);
        Metrics m = c.metrics();

        assertEquals("live", c.phase());
        assertEquals(5, c.durationDays());
        assertEquals(4, m.leads());
        assertEquals(1, m.newLeads());
        assertEquals(1, m.contacted());
        assertEquals(1, m.lost());
        assertEquals(1, m.converted());
        assertEquals(25.0, m.conversionRate());
        assertEquals(0, new BigDecimal("4000").compareTo(m.spend()));
        assertEquals(0, new BigDecimal("4").compareTo(m.hours()));
        assertEquals(0, new BigDecimal("1000.00").compareTo(m.costPerLead()));
        assertEquals(0, new BigDecimal("4000.00").compareTo(m.costPerConversion()));
        assertEquals(0, new BigDecimal("6000").compareTo(m.revenue()), "only receipts since the lead came in count");
        assertEquals(50.0, m.roi());
        assertEquals(40.0, m.budgetUsedPct());
        assertEquals(1.0, m.leadsPerHour());
        assertEquals(2.0, m.avgDaysToConvert());
        assertEquals(20.0, m.leadTargetPct());
        assertEquals(1, c.leadForms().size());
        assertEquals("Diwali IG form", c.leadForms().get(0).name());
        assertEquals(4, c.leadForms().get(0).leads());
    }

    @Test
    void phaseFollowsStatusAndDates() {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        assertEquals("live", MarketingCampaignService.phase(campaign, today));
        assertEquals("scheduled", MarketingCampaignService.phase(campaign, today.minusDays(5)));
        assertEquals("ended", MarketingCampaignService.phase(campaign, today.plusDays(5)));
        campaign.setStatus("paused");
        assertEquals("paused", MarketingCampaignService.phase(campaign, today));
    }

    @Test
    void rejectsEndBeforeStartAndUnknownPlatform() {
        when(branchService.resolveBranchForCreate(any())).thenReturn(1L);
        LocalDate d = LocalDate.of(2026, 10, 10);
        assertThrows(IllegalArgumentException.class, () -> service.create(new CampaignRequest(
                "X", null, null, null, null, d, d.minusDays(1), null, null, null, null, null, null, null, null, null)));
        assertThrows(IllegalArgumentException.class, () -> service.create(new CampaignRequest(
                "X", null, "tiktok-ish", null, null, d, d, null, null, null, null, null, null, null, null, null)));
        verify(campaignRepository, never()).save(any());
    }

    @Test
    void linkingAFormFromAnotherBranchIsRejected() {
        LeadCaptureForm other = new LeadCaptureForm();
        other.setId(9L);
        other.setName("Other branch form");
        other.setBranchId(2L);
        when(formRepository.findByTenantSlugAndIdIn(eq("test-gym"), any())).thenReturn(List.of(other));

        assertThrows(IllegalArgumentException.class,
                () -> service.linkLeadForms(1L, new LeadFormLinkRequest(List.of(9L), true)));
        verify(linkRepository, never()).save(any());
    }

    @Test
    void linkingCreditsEarlierLeadsOfNewFormsOnly() {
        LeadCaptureForm form = new LeadCaptureForm();
        form.setId(7L);
        form.setName("Diwali IG form");
        form.setBranchId(1L);
        when(formRepository.findByTenantSlugAndIdIn(eq("test-gym"), any())).thenReturn(List.of(form));
        when(linkRepository.findByCampaignId(1L)).thenReturn(List.of());

        service.linkLeadForms(1L, new LeadFormLinkRequest(List.of(7L), true));

        verify(linkRepository).save(argThat(l -> l.getLeadFormId().equals(7L) && l.getCampaignId().equals(1L)));
        verify(leadRepository).attributeFormLeads(eq(1L), eq(1L), eq(List.of(7L)), any());
        verify(leadRepository).attributeLegacyFormLeads(eq(1L), eq(7L), eq(1L), eq("%\"form:Diwali IG form\"%"), any());
    }

    @Test
    void utmTrackingCodeBeatsTheFormsLinkedCampaign() {
        when(campaignRepository.findIdsByTrackingCode(1L, "diwali")).thenReturn(List.of(5L));
        assertEquals(5L, service.resolveCampaignForSubmission(7L, 1L, " diwali "));
        verify(campaignRepository, never()).findAttributableIdsForForm(anyLong(), anyLong(), any());

        when(campaignRepository.findIdsByTrackingCode(1L, "unknown")).thenReturn(List.of());
        when(campaignRepository.findAttributableIdsForForm(eq(7L), eq(1L), any())).thenReturn(List.of(3L, 1L));
        assertEquals(3L, service.resolveCampaignForSubmission(7L, 1L, "unknown"));
    }
}
