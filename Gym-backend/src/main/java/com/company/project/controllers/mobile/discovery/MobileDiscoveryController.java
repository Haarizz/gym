package com.company.project.controllers.mobile.discovery;

import com.company.project.controlplane.entities.GlobalBranchDiscovery;
import com.company.project.controlplane.repositories.GlobalBranchDiscoveryRepository;
import com.company.project.dto.CenterDetailsDTO;
import com.company.project.dto.CenterSummaryDTO;
import com.company.project.dto.FacilityResponseDTO;
import com.company.project.dto.MembershipPlanResponseDTO;
import com.company.project.dto.StaffResponseDTO;
import com.company.project.entities.Branch;
import com.company.project.entities.Member;
import com.company.project.entities.UserProfile;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.BranchImageRepository;
import com.company.project.repositories.ReviewRepository;
import com.company.project.repositories.UserProfileRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.services.FacilityService;
import com.company.project.services.MembershipPlanService;
import com.company.project.services.mobile.referrals.MobileReferralResolutionService;
import com.company.project.services.StaffService;
import com.company.project.services.MemberService;
import com.company.project.security.TenantContextHolder;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.UserDetailsImpl;
import com.company.project.dto.mobile.discovery.MobilePurchaseRequestDTO;
import com.company.project.dto.MemberRequestDTO;
import com.company.project.dto.MemberResponseDTO;
import com.company.project.services.NotificationService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import jakarta.persistence.EntityManagerFactory;
import org.springframework.orm.jpa.EntityManagerFactoryUtils;
import org.springframework.orm.jpa.EntityManagerHolder;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.time.format.DateTimeFormatter;
import java.time.LocalDateTime;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/mobile/discovery/centers")
public class MobileDiscoveryController {

    private final GlobalBranchDiscoveryRepository globalDiscoveryRepository;
    private final BranchRepository branchRepository;
    private final BranchImageRepository branchImageRepository;
    private final ReviewRepository reviewRepository;
    private final FacilityService facilityService;
    private final StaffService staffService;
    private final MembershipPlanService planService;
    private final MemberService memberService;
    private final MemberRepository memberRepository;
    private final com.company.project.services.GlobalUserService globalUserService;
    private final EntityManagerFactory entityManagerFactory;
    private final NotificationService notificationService;
    private final MobileReferralResolutionService mobileReferralResolutionService;

    // Payment methods that require reception/admin approval before the member gets
    // app access — cash and credit need physical/manual verification that the money
    // was actually received or the credit terms are acceptable; mixed is included
    // because it always contains at least one such leg. Matched case-insensitively
    // against MobilePurchaseRequestDTO.paymentMethodUsed, which mirrors the mobile
    // PaymentBottomSheet's method titles ("Cash", "Credit", "Mixed") rather than the
    // narrower backend PaymentMethod enum (which has no CREDIT value).
    private static final java.util.Set<String> APPROVAL_REQUIRED_METHODS =
            java.util.Set.of("cash", "credit", "mixed");

    public MobileDiscoveryController(
            GlobalBranchDiscoveryRepository globalDiscoveryRepository,
            BranchRepository branchRepository,
            BranchImageRepository branchImageRepository,
            ReviewRepository reviewRepository,
            FacilityService facilityService,
            StaffService staffService,
            MembershipPlanService planService,
            MemberService memberService,
            MemberRepository memberRepository,
            com.company.project.services.GlobalUserService globalUserService,
            EntityManagerFactory entityManagerFactory,
            NotificationService notificationService,
            MobileReferralResolutionService mobileReferralResolutionService) {
        this.globalDiscoveryRepository = globalDiscoveryRepository;
        this.branchRepository = branchRepository;
        this.branchImageRepository = branchImageRepository;
        this.reviewRepository = reviewRepository;
        this.facilityService = facilityService;
        this.staffService = staffService;
        this.planService = planService;
        this.memberService = memberService;
        this.memberRepository = memberRepository;
        this.globalUserService = globalUserService;
        this.entityManagerFactory = entityManagerFactory;
        this.notificationService = notificationService;
        this.mobileReferralResolutionService = mobileReferralResolutionService;
    }

    @GetMapping
    public ResponseEntity<List<CenterSummaryDTO>> getCenters() {
        List<CenterSummaryDTO> centers = globalDiscoveryRepository.findAll().stream()
                .filter(c -> "ACTIVE".equals(c.getStatus()))
                .map(c -> {
                    CenterSummaryDTO dto = new CenterSummaryDTO();
                    dto.setTenantSlug(c.getTenantSlug());
                    dto.setBranchId(c.getBranchId());
                    dto.setCenterName(c.getGymName() + " - " + c.getBranchName());
                    dto.setAddress(c.getAddress());
                    dto.setLat(c.getLat());
                    dto.setLng(c.getLng());
                    
                    try {
                        TenantContextHolder.setCurrentTenant(c.getTenantSlug());
                        BranchContextHolder.setActiveBranchId(c.getBranchId());

                        Branch branch = branchRepository.findById(c.getBranchId()).orElse(null);
                        if (branch != null) {
                            dto.setCenterType(branch.getCenterType());
                            dto.setAccessType(branch.getAccessType());
                            if (branch.getAcceptedPaymentMethods() != null && !branch.getAcceptedPaymentMethods().isBlank()) {
                                dto.setAcceptedPaymentMethods(java.util.Arrays.stream(branch.getAcceptedPaymentMethods().split(","))
                                        .map(String::trim)
                                        .filter(s -> !s.isEmpty())
                                        .collect(Collectors.toList()));
                            }
                        }

                        branchImageRepository.findByBranchIdAndIsCoverTrue(c.getBranchId()).stream()
                                .findFirst()
                                .ifPresent(cover -> dto.setCoverImageUrl(cover.getImageUrl()));

                        long reviewCount = reviewRepository.countByBranchId(c.getBranchId());
                        dto.setReviewCount(reviewCount);
                        dto.setAvgRating(reviewCount > 0 ? reviewRepository.findAverageRatingByBranchId(c.getBranchId()) : null);

                        List<MembershipPlanResponseDTO> plans = planService.getPlans("Active");
                        BigDecimal minPrice = plans.stream()
                            .map(MembershipPlanResponseDTO::getPrice)
                            .min(BigDecimal::compareTo)
                            .orElse(null);
                        dto.setStartingPrice(minPrice);
                    } catch (Exception e) {
                         // ignore
                    } finally {
                        BranchContextHolder.clear();
                        TenantContextHolder.clear();
                    }

                    return dto;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(centers);
    }

    @GetMapping("/{tenantSlug}/{branchId}")
    public ResponseEntity<CenterDetailsDTO> getCenterDetails(
            @PathVariable String tenantSlug,
            @PathVariable Long branchId) {
            
        GlobalBranchDiscovery summary = globalDiscoveryRepository
                .findByTenantSlugAndBranchId(tenantSlug, branchId)
                .orElseThrow(() -> new RuntimeException("Center not found"));

        try {
            TenantContextHolder.setCurrentTenant(tenantSlug);
            BranchContextHolder.setActiveBranchId(branchId);

            Branch branch = branchRepository.findById(branchId)
                    .orElseThrow(() -> new RuntimeException("Branch not found in tenant DB"));

            CenterDetailsDTO dto = new CenterDetailsDTO();
            dto.setTenantSlug(tenantSlug);
            dto.setBranchId(branchId);
            dto.setCenterName(summary.getGymName() + " - " + summary.getBranchName());
            dto.setAddress(branch.getAddress());
            dto.setLat(branch.getLat());
            dto.setLng(branch.getLng());
            dto.setCenterType(branch.getCenterType());
            dto.setAccessType(branch.getAccessType());
            dto.setOperatingHours(branch.getOperatingHours());
            dto.setPhone(branch.getPhone());
            dto.setAbout(branch.getDescription());
            dto.setEstablishedYear(branch.getEstablishedYear());
            dto.setBnplEnabled(branch.isBnplEnabled());
            dto.setBnplProvider(branch.getBnplProvider());
            dto.setTaxPercentage(branch.getTaxPercentage());
            dto.setTaxInclusive(branch.isTaxInclusive());
            dto.setTermsAndPolicies(branch.getTermsAndPolicies());
            if (branch.getAcceptedPaymentMethods() != null && !branch.getAcceptedPaymentMethods().isBlank()) {
                dto.setAcceptedPaymentMethods(java.util.Arrays.stream(branch.getAcceptedPaymentMethods().split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toList()));
            }

            List<com.company.project.dto.BranchImageResponseDTO> images = branchImageRepository
                    .findByBranchIdOrderBySortOrderAsc(branchId).stream()
                    .map(img -> {
                        com.company.project.dto.BranchImageResponseDTO imgDto = new com.company.project.dto.BranchImageResponseDTO();
                        imgDto.setId(img.getId());
                        imgDto.setImageUrl(img.getImageUrl());
                        imgDto.setCover(img.isCover());
                        imgDto.setSortOrder(img.getSortOrder());
                        return imgDto;
                    })
                    .collect(Collectors.toList());
            images.stream().filter(com.company.project.dto.BranchImageResponseDTO::isCover).findFirst()
                    .or(() -> images.stream().findFirst())
                    .ifPresent(cover -> dto.setCoverImageUrl(cover.getImageUrl()));
            dto.setGalleryImageUrls(images.stream()
                    .map(com.company.project.dto.BranchImageResponseDTO::getImageUrl)
                    .collect(Collectors.toList()));

            long reviewCount = reviewRepository.countByBranchId(branchId);
            dto.setReviewCount(reviewCount);
            dto.setAvgRating(reviewCount > 0 ? reviewRepository.findAverageRatingByBranchId(branchId) : null);

            // Branch-scoped the same way getCenterPlans() already scopes plans below —
            // FacilityService/StaffService read BranchContextHolder internally.
            dto.setAmenities(facilityService.getFacilities("Active", null));
            dto.setTrainers(staffService.getStaff(null, null, null, "Active", null, 1, 100).getItems());

            return ResponseEntity.ok(dto);
        } finally {
            BranchContextHolder.clear();
            TenantContextHolder.clear();
        }
    }

    @GetMapping("/{tenantSlug}/{branchId}/plans")
    public ResponseEntity<List<MembershipPlanResponseDTO>> getCenterPlans(
            @PathVariable String tenantSlug,
            @PathVariable Long branchId) {
            
        try {
            TenantContextHolder.setCurrentTenant(tenantSlug);
            BranchContextHolder.setActiveBranchId(branchId);
            
            List<MembershipPlanResponseDTO> plans = planService.getPlans("Active");
            
            return ResponseEntity.ok(plans);
        } finally {
            BranchContextHolder.clear();
            TenantContextHolder.clear();
        }
    }

    @PostMapping("/{tenantSlug}/{branchId}/purchase")
    public ResponseEntity<MemberResponseDTO> purchaseMembership(
            @PathVariable String tenantSlug,
            @PathVariable Long branchId,
            @RequestBody MobilePurchaseRequestDTO request) {
            
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UserDetailsImpl)) {
            return ResponseEntity.status(401).build();
        }
        UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
        Long globalUserId = userDetails.getId();

        // 1. Fetch UserProfile globally (before tenant switch) in a NEW transaction
        // to prevent OSIV from binding the primary DB connection to the main request's EntityManager
        UserProfile profile = globalUserService.getUserProfileRequiresNew(globalUserId);

        // 2. Unbind OSIV EntityManager so the next JPA operation creates a NEW one with the tenant connection!
        if (TransactionSynchronizationManager.hasResource(entityManagerFactory)) {
            EntityManagerHolder emHolder = (EntityManagerHolder) TransactionSynchronizationManager.unbindResource(entityManagerFactory);
            EntityManagerFactoryUtils.closeEntityManager(emHolder.getEntityManager());
        }

        try {
            TenantContextHolder.setCurrentTenant(tenantSlug);
            BranchContextHolder.setActiveBranchId(branchId);
            
            // Verify branch
            Branch branch = branchRepository.findById(branchId)
                    .orElseThrow(() -> new RuntimeException("Branch not found in tenant DB"));

            // Check if member already exists
            if (memberRepository.existsByGlobalUserId(globalUserId) || memberRepository.existsByEmail(userDetails.getEmail())) {
                return ResponseEntity.status(409).build(); // Conflict
            }

            // Get plan (will throw if not found/active)
            MembershipPlanResponseDTO plan = planService.getPlanById(request.getPlanId());

            // Build MemberRequestDTO
            MemberRequestDTO memberRequest = new MemberRequestDTO();
            memberRequest.setName(profile.getFullName());
            memberRequest.setEmail(userDetails.getEmail()); // fixed from getUsername()
            memberRequest.setPhone(profile.getPhone());
            memberRequest.setGender(profile.getGender());
            if (profile.getDateOfBirth() != null) {
                memberRequest.setDateOfBirth(profile.getDateOfBirth().toString());
            }
            memberRequest.setBloodType(profile.getBloodType());
            memberRequest.setAddress(profile.getAddress());
            memberRequest.setHeight(profile.getHeight());
            memberRequest.setWeight(profile.getWeight());

            // Set Membership details
            memberRequest.setMembershipPlanId(request.getPlanId());
            memberRequest.setMembershipType(plan.getPlanType() != null ? plan.getPlanType() : "Standard");

            // Payment details collected by the mobile PaymentBottomSheet — previously
            // discarded (only planId was sent). Cash/Credit/Mixed require reception
            // approval before the member gets app access; other methods (Card/Cheque/
            // Bank Transfer/Online) stay auto-active exactly as before.
            String paymentMethodUsed = request.getPaymentMethodUsed();
            boolean requiresApproval = paymentMethodUsed != null
                    && APPROVAL_REQUIRED_METHODS.contains(paymentMethodUsed.trim().toLowerCase());

            // A member still awaiting reception approval must not show up as a normal
            // "Active" member in the Members directory/stat cards — the frontend's
            // getComputedStatus() (members.tsx) already special-cases this exact
            // string and renders it as "Pending Approval", excluded from the
            // Active/Inactive/Expired/Frozen/Suspended buckets.
            memberRequest.setMembershipStatus(requiresApproval ? "pending_approval" : "Active");

            if (paymentMethodUsed != null) memberRequest.setPaymentMethodUsed(paymentMethodUsed);
            if (request.getPaymentBreakdown() != null) memberRequest.setPaymentBreakdown(request.getPaymentBreakdown());
            if (request.getBankAccountCode() != null) memberRequest.setBankAccountCode(request.getBankAccountCode());
            if (request.getBankAccountName() != null) memberRequest.setBankAccountName(request.getBankAccountName());
            if (request.getPaymentDueDate() != null) memberRequest.setNextPaymentDate(request.getPaymentDueDate());
            // Fee paid so far, derived the same way ReceiptService does elsewhere
            // (invoice total − outstanding) — membershipFee/outstandingBalance are
            // what actually drives paidAmount on the created receipt.
            if (request.getPaidAmount() != null) {
                BigDecimal planPrice = plan.getPrice() != null ? plan.getPrice() : BigDecimal.ZERO;
                memberRequest.setMembershipFee(planPrice);
                BigDecimal outstanding = request.getOutstandingBalance() != null
                        ? request.getOutstandingBalance()
                        : planPrice.subtract(request.getPaidAmount()).max(BigDecimal.ZERO);
                memberRequest.setOutstandingBalance(outstanding);
                memberRequest.setPaymentStatus(outstanding.compareTo(BigDecimal.ZERO) <= 0 ? "paid"
                        : (request.getPaidAmount().compareTo(BigDecimal.ZERO) > 0 ? "partial" : "pending"));
            }
            if (requiresApproval) {
                memberRequest.setApprovalStatus("PENDING");
            }

            String todayIso = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            memberRequest.setJoinDate(todayIso);
            memberRequest.setMembershipStartDate(todayIso);

            // Execute create (generates invoice/payment)
            MemberResponseDTO createdMember = memberService.createMember(memberRequest);

            // Note: Currently, createMember doesn't take globalUserId in the DTO,
            // we should technically set it on the Member entity.
            // But since MemberService is complex, we use a service method or update it manually.
            // Wait, we need to set globalUserId!
            // We can add it to MemberRequestDTO and have MemberService.applyRequest set it,
            // or just update it after creation. For safety without altering MemberService deeply,
            // we will update it in a separate step or add it to MemberRequestDTO.
            // Actually, we must use a service that updates it, or update it directly if we have MemberRepository.
            // Since we don't have MemberRepository here, we will just call a new method on MemberService
            // or add it to MemberRequestDTO. Let's assume we can add it to MemberRequestDTO later if needed.
            memberService.linkGlobalUser(Long.valueOf(createdMember.getId()), globalUserId);

            if (requiresApproval) {
                // appAccessEnabled=false is the actual gate — TenantContextFilter 403s
                // every other member-facing mobile endpoint while it's false (see its
                // global-user authorization check). globalUserId-linked members aren't
                // covered by the legacy User.enabled/toggleMemberAccess flow, hence the
                // separate setter here instead of reusing that path.
                createdMember = memberService.setAppAccessEnabled(Long.valueOf(createdMember.getId()), false);

                notificationService.notifyRoles(
                        List.of("ADMIN", "MANAGER", "RECEPTIONIST"),
                        "Payment awaiting approval",
                        createdMember.getName() + " paid via " + paymentMethodUsed
                                + " for " + createdMember.getMembershipPlan() + " — needs reception approval.",
                        "WARNING", "HIGH", "MEMBERS",
                        Long.valueOf(createdMember.getId()), "/approvals",
                        "PAYMENT_PENDING_" + createdMember.getId()
                );
            }

            // Convert any pending mobile referral for this user now, while
            // TenantContextHolder/BranchContextHolder are still set to this purchase's
            // tenant/branch. This used to run from an @AfterReturning aspect on this
            // method, which fired AFTER the finally below had already cleared both
            // holders — every real-time conversion silently failed as a result, only
            // ever succeeding via the separate retry endpoints (which run in their own
            // fresh request with fresh context). Doing it inline here, before the
            // context is torn down, avoids needing to restore any of it.
            try {
                Member fakeMember = new Member();
                fakeMember.setMemberId(createdMember.getMemberId());
                fakeMember.setName(createdMember.getName());
                fakeMember.setEmail(createdMember.getEmail());
                fakeMember.setPhone(createdMember.getPhone());
                mobileReferralResolutionService.convertReferral(globalUserId, fakeMember);
            } catch (Exception e) {
                System.err.println("Referral conversion failed after successful purchase: " + e.getMessage());
                e.printStackTrace();
            }

            return ResponseEntity.ok(createdMember);
        } finally {
            BranchContextHolder.clear();
            TenantContextHolder.clear();
        }
    }
}
