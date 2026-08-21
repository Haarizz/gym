package com.company.project.services.mobile.membership;

import com.company.project.dto.PaginationDTO;
import com.company.project.dto.mobile.membership.MobileActiveAddOnDTO;
import com.company.project.dto.mobile.membership.MobileAddOnDTO;
import com.company.project.dto.mobile.membership.MobileAddOnsResponseDTO;
import com.company.project.entities.AddonPlan;
import com.company.project.entities.Member;
import com.company.project.entities.MemberAddon;
import com.company.project.repositories.AddonPlanRepository;
import com.company.project.repositories.MemberAddonRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.security.UserDetailsImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class MobileMemberAddOnsService {

    private final AddonPlanRepository addonPlanRepository;
    private final MemberAddonRepository memberAddonRepository;
    private final MemberRepository memberRepository;
    private final com.company.project.services.MemberAddonService memberAddonService;

    public MobileMemberAddOnsService(AddonPlanRepository addonPlanRepository,
                                     MemberAddonRepository memberAddonRepository,
                                     MemberRepository memberRepository,
                                     com.company.project.services.MemberAddonService memberAddonService) {
        this.addonPlanRepository = addonPlanRepository;
        this.memberAddonRepository = memberAddonRepository;
        this.memberRepository = memberRepository;
        this.memberAddonService = memberAddonService;
    }

    public MobileAddOnsResponseDTO getAddOns(UserDetailsImpl principal, int page, int limit) {
        Member member = memberRepository.findByEmail(principal.getEmail())
                .orElseThrow(() -> new RuntimeException("Member not found"));

        // 1. Available Add-ons (Paginated)
        Pageable pageable = PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.ASC, "name"));
        AddonPlan probe = new AddonPlan();
        probe.setIsActive(true);
        org.springframework.data.domain.Example<AddonPlan> example = org.springframework.data.domain.Example.of(probe);
        Page<AddonPlan> addonPlanPage = addonPlanRepository.findAll(example, pageable);

        List<MobileAddOnDTO> availableDtos = addonPlanPage.getContent().stream().map(plan -> {
            MobileAddOnDTO dto = new MobileAddOnDTO();
            dto.setId(plan.getId());
            dto.setName(plan.getName());
            dto.setDescription(plan.getDescription());
            dto.setPrice(plan.getPrice());
            dto.setValidity(plan.getValidity());
            dto.setCategory(plan.getCategory());
            dto.setCurrency("INR");
            dto.setPricingUnit(plan.getValidity() != null ? plan.getValidity() + " DAYS" : "N/A");
            return dto;
        }).collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO(
                page, limit,
                addonPlanPage.getTotalElements(),
                addonPlanPage.getTotalPages()
        );

        // 2. Active Add-ons (For current member)
        Specification<MemberAddon> activeSpec = (root, query, cb) -> cb.and(
                cb.equal(root.get("memberDbId"), member.getId()),
                cb.equal(root.get("status"), "Active")
        );
        List<MemberAddon> activeAddons = memberAddonRepository.findAll(activeSpec);

        List<MobileActiveAddOnDTO> activeDtos = activeAddons.stream().map(ma -> {
            MobileActiveAddOnDTO dto = new MobileActiveAddOnDTO();
            dto.setId(ma.getId());
            dto.setAddonName(ma.getAddonName());
            dto.setCategory(ma.getCategory());
            dto.setExpiryDate(ma.getExpiryDate());
            dto.setStatus(ma.getStatus());
            return dto;
        }).collect(Collectors.toList());

        MobileAddOnsResponseDTO response = new MobileAddOnsResponseDTO();
        response.setAvailable(availableDtos);
        response.setPagination(pagination);
        response.setActive(activeDtos);

        return response;
    }

    @Transactional
    public MobileActiveAddOnDTO purchaseAddOn(UserDetailsImpl principal, Long addonId, com.company.project.dto.mobile.membership.MobileAddOnPurchaseRequestDTO request) {
        Member member = memberRepository.findByEmail(principal.getEmail())
                .orElseThrow(() -> new RuntimeException("Member not found"));

        AddonPlan addonPlan = addonPlanRepository.findById(addonId)
                .orElseThrow(() -> new RuntimeException("Add-on not found"));

        if (!Boolean.TRUE.equals(addonPlan.getIsActive())) {
            throw new RuntimeException("This add-on is no longer available.");
        }

        // Validate the incoming payment if needed. The member is paying the full amount.
        // We enforce that the required amount comes from the AddonPlan itself, not the client.
        java.math.BigDecimal requiredAmount = addonPlan.getPrice() != null ? addonPlan.getPrice() : java.math.BigDecimal.ZERO;

        com.company.project.dto.MemberAddonRequestDTO addonRequest = new com.company.project.dto.MemberAddonRequestDTO();
        addonRequest.setMemberDbId(member.getId());
        addonRequest.setMemberId(member.getMemberId());
        addonRequest.setMemberName(member.getName());
        
        addonRequest.setAddonName(addonPlan.getName());
        addonRequest.setAddonDescription(addonPlan.getDescription());
        addonRequest.setCategory(addonPlan.getCategory());
        addonRequest.setAmount(requiredAmount);
        
        addonRequest.setPaymentMode(request.getPaymentMethodUsed());
        addonRequest.setPaymentBreakdown(request.getPaymentBreakdown());
        
        // Members self-purchasing must pay in full.
        addonRequest.setPaidAmount(requiredAmount);
        
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        addonRequest.setStartDate(now.toString());
        if (addonPlan.getValidity() != null) {
            addonRequest.setExpiryDate(now.plusDays(addonPlan.getValidity()).toString());
        }

        com.company.project.dto.MemberAddonResponseDTO created = memberAddonService.createAddon(addonRequest);

        MobileActiveAddOnDTO dto = new MobileActiveAddOnDTO();
        dto.setId(created.getId() != null ? Long.parseLong(created.getId()) : null);
        dto.setAddonName(created.getAddonName());
        dto.setCategory(created.getCategory());
        
        if (created.getExpiryDate() != null) {
            String raw = created.getExpiryDate();
            String normalized = raw.endsWith("Z") ? raw.substring(0, raw.length() - 1) : raw;
            dto.setExpiryDate(java.time.LocalDateTime.parse(normalized, java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        }
        
        dto.setStatus(created.getStatus());
        
        return dto;
    }
}
