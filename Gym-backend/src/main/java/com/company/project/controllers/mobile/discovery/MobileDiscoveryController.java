package com.company.project.controllers.mobile.discovery;

import com.company.project.controlplane.entities.GlobalBranchDiscovery;
import com.company.project.controlplane.repositories.GlobalBranchDiscoveryRepository;
import com.company.project.dto.CenterDetailsDTO;
import com.company.project.dto.CenterSummaryDTO;
import com.company.project.dto.FacilityResponseDTO;
import com.company.project.dto.MembershipPlanResponseDTO;
import com.company.project.dto.StaffResponseDTO;
import com.company.project.entities.Branch;
import com.company.project.entities.Gym;
import com.company.project.entities.UserProfile;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.GymRepository;
import com.company.project.repositories.UserProfileRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.services.FacilityService;
import com.company.project.services.MembershipPlanService;
import com.company.project.services.StaffService;
import com.company.project.services.MemberService;
import com.company.project.security.TenantContextHolder;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.UserDetailsImpl;
import com.company.project.dto.mobile.MobilePurchaseRequestDTO;
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
    private final GymRepository gymRepository;
    private final FacilityService facilityService;
    private final StaffService staffService;
    private final MembershipPlanService planService;
    private final MemberService memberService;
    private final MemberRepository memberRepository;
    private final com.company.project.services.GlobalUserService globalUserService;
    private final EntityManagerFactory entityManagerFactory;
    private final NotificationService notificationService;

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
            GymRepository gymRepository,
            FacilityService facilityService,
            StaffService staffService,
            MembershipPlanService planService,
            MemberService memberService,
            MemberRepository memberRepository,
            com.company.project.services.GlobalUserService globalUserService,
            EntityManagerFactory entityManagerFactory,
            NotificationService notificationService) {
        this.globalDiscoveryRepository = globalDiscoveryRepository;
        this.branchRepository = branchRepository;
        this.gymRepository = gymRepository;
        this.facilityService = facilityService;
        this.staffService = staffService;
        this.planService = planService;
        this.memberService = memberService;
        this.memberRepository = memberRepository;
        this.globalUserService = globalUserService;
        this.entityManagerFactory = entityManagerFactory;
        this.notificationService = notificationService;
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
                        Branch branch = branchRepository.findById(c.getBranchId()).orElse(null);
                        if (branch != null) {
                            dto.setCenterType(branch.getCenterType());
                        }
                        
                        BranchContextHolder.setActiveBranchId(c.getBranchId());
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

            Branch branch = branchRepository.findById(branchId)
                    .orElseThrow(() -> new RuntimeException("Branch not found in tenant DB"));

            Gym gym = gymRepository.findByIsDefaultTrue().orElse(null);

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
            dto.setAbout(gym != null ? gym.getAddress() : null); // Mocking about for now

            // Note: services must be branch aware or filter by branch
            // The existing services might not take branchId directly if they rely on user context
            // Assuming we fetch all and filter, or if FacilityService has a getByBranch
            // For audit/prototype purposes:
            // dto.setAmenities(facilityService.getActiveFacilities()); 
            
            return ResponseEntity.ok(dto);
        } finally {
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
            memberRequest.setMembershipStatus("Active");

            // Payment details collected by the mobile PaymentBottomSheet — previously
            // discarded (only planId was sent). Cash/Credit/Mixed require reception
            // approval before the member gets app access; other methods (Card/Cheque/
            // Bank Transfer/Online) stay auto-active exactly as before.
            String paymentMethodUsed = request.getPaymentMethodUsed();
            boolean requiresApproval = paymentMethodUsed != null
                    && APPROVAL_REQUIRED_METHODS.contains(paymentMethodUsed.trim().toLowerCase());

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

            return ResponseEntity.ok(createdMember);
        } finally {
            BranchContextHolder.clear();
            TenantContextHolder.clear();
        }
    }
}
