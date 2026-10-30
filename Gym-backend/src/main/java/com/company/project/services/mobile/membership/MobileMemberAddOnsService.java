package com.company.project.services.mobile.membership;

import com.company.project.dto.DiscountCodeDTO;
import com.company.project.dto.PaginationDTO;
import com.company.project.dto.mobile.membership.MobileActiveAddOnDTO;
import com.company.project.dto.mobile.membership.MobileAddOnDTO;
import com.company.project.dto.mobile.membership.MobileAddOnPurchaseRequestDTO;
import com.company.project.dto.mobile.membership.MobileAddOnsResponseDTO;
import com.company.project.entities.AddonPlan;
import com.company.project.entities.Member;
import com.company.project.entities.MemberAddon;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.AddonPlanRepository;
import com.company.project.repositories.MemberAddonRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.AddonPaymentService;
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
    private final AddonPaymentService addonPaymentService;

    public MobileMemberAddOnsService(AddonPlanRepository addonPlanRepository,
                                     MemberAddonRepository memberAddonRepository,
                                     MemberRepository memberRepository,
                                     AddonPaymentService addonPaymentService) {
        this.addonPlanRepository = addonPlanRepository;
        this.memberAddonRepository = memberAddonRepository;
        this.memberRepository = memberRepository;
        this.addonPaymentService = addonPaymentService;
    }

    public MobileAddOnsResponseDTO getAddOns(UserDetailsImpl principal, int page, int limit) {
        java.util.Optional<Member> memberOpt = findOwnMember(principal);

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
        List<MobileActiveAddOnDTO> activeDtos = new java.util.ArrayList<>();
        if (memberOpt.isPresent()) {
            Member member = memberOpt.get();
            // Pending ones too, so the member sees a Cash/Credit purchase is waiting on reception.
            Specification<MemberAddon> activeSpec = (root, query, cb) -> cb.and(
                    cb.equal(root.get("memberDbId"), member.getId()),
                    root.get("status").in(AddonPaymentService.STATUS_ACTIVE, AddonPaymentService.STATUS_PENDING_APPROVAL)
            );
            List<MemberAddon> activeAddons = memberAddonRepository.findAll(activeSpec);

            activeDtos = activeAddons.stream()
                    .map(MobileMemberAddOnsService::toActiveDTO)
                    .collect(Collectors.toList());
        }

        MobileAddOnsResponseDTO response = new MobileAddOnsResponseDTO();
        response.setAvailable(availableDtos);
        response.setPagination(pagination);
        response.setActive(activeDtos);

        return response;
    }

    /** Checks a promotion code against an add-on and prices it for the signed-in member, without spending it. */
    public DiscountCodeDTO validateCode(UserDetailsImpl principal, Long addonId, String code) {
        Member member = findOwnMember(principal)
                .orElseThrow(() -> new EntityNotFoundException("Member not found"));
        AddonPlan addonPlan = addonPlanRepository.findById(addonId)
                .orElseThrow(() -> new EntityNotFoundException("Add-on not found"));
        return addonPaymentService.previewCode(member, addonPlan, code);
    }

    @Transactional
    public MobileActiveAddOnDTO purchaseAddOn(UserDetailsImpl principal, Long addonId, MobileAddOnPurchaseRequestDTO request) {
        Member member = findOwnMember(principal)
                .orElseThrow(() -> new EntityNotFoundException("Member not found"));
        AddonPlan addonPlan = addonPlanRepository.findById(addonId)
                .orElseThrow(() -> new EntityNotFoundException("Add-on not found"));

        // The price comes from the AddonPlan, never the client; a Cash/Credit/Mixed
        // payment leaves the add-on Pending Approval until reception confirms it.
        return toActiveDTO(addonPaymentService.purchase(member, addonPlan, request));
    }

    private static MobileActiveAddOnDTO toActiveDTO(MemberAddon ma) {
        MobileActiveAddOnDTO dto = new MobileActiveAddOnDTO();
        dto.setId(ma.getId());
        dto.setAddonName(ma.getAddonName());
        dto.setCategory(ma.getCategory());
        dto.setExpiryDate(ma.getExpiryDate());
        dto.setStatus(ma.getStatus());
        return dto;
    }

    // By account, like the dashboard — a GymBios account may have no email (created at a
    // gym's desk), and an email lookup could then match an unrelated email-less member.
    private java.util.Optional<Member> findOwnMember(UserDetailsImpl principal) {
        java.util.Optional<Member> member = principal.isGlobal()
                ? memberRepository.findByGlobalUserId(principal.getId())
                : memberRepository.findByUserId(principal.getId());
        if (member.isEmpty() && principal.getEmail() != null) {
            member = memberRepository.findByEmail(principal.getEmail());
        }
        return member;
    }
}
