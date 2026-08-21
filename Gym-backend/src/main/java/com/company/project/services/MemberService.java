package com.company.project.services;

import com.company.project.automation.AutomationExecutorService;
import com.company.project.dto.FamilyGroupResponseDTO;
import com.company.project.dto.FamilyMemberDTO;
import com.company.project.dto.FamilyRenewalRequestDTO;
import com.company.project.dto.FreezeRequestDTO;
import com.company.project.dto.MemberRequestDTO;
import com.company.project.dto.MemberResponseDTO;
import com.company.project.dto.MembersPageResponseDTO;
import com.company.project.dto.MinorRenewalRequestDTO;
import com.company.project.dto.PaginationDTO;
import com.company.project.dto.PaymentSplitDTO;
import com.company.project.dto.RenewalRequestDTO;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.services.NotificationService;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipPlan;
import com.company.project.entities.Role;
import com.company.project.entities.User;
import com.company.project.entities.UserRole;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.repositories.RoleRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.repositories.UserRoleRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class MemberService {

    private final MemberRepository memberRepository;
    private final MembershipPlanRepository planRepository;
    private final ReceiptService receiptService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;
    private final AutomationExecutorService automationExecutorService;
    private final ReceiptVoucherService receiptVoucherService;
    private final FinancialEventService financialEventService;

    public MemberService(MemberRepository memberRepository,
                         MembershipPlanRepository planRepository,
                         @Lazy ReceiptService receiptService,
                         UserRepository userRepository,
                         RoleRepository roleRepository,
                         UserRoleRepository userRoleRepository,
                         PasswordEncoder passwordEncoder,
                         NotificationService notificationService,
                         AutomationExecutorService automationExecutorService,
                         ReceiptVoucherService receiptVoucherService,
                         FinancialEventService financialEventService) {
        this.memberRepository          = memberRepository;
        this.planRepository            = planRepository;
        this.receiptService            = receiptService;
        this.userRepository            = userRepository;
        this.roleRepository            = roleRepository;
        this.userRoleRepository        = userRoleRepository;
        this.passwordEncoder           = passwordEncoder;
        this.notificationService       = notificationService;
        this.automationExecutorService = automationExecutorService;
        this.receiptVoucherService     = receiptVoucherService;
        this.financialEventService     = financialEventService;
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public MembersPageResponseDTO getMembers(String search, String status,
                                             String membershipType, String paymentStatus,
                                             int page, int limit) {
        Specification<Member> spec = buildSpec(search, status, membershipType, paymentStatus);
        Pageable pageable = PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Member> memberPage = memberRepository.findAll(spec, pageable);

        List<MemberResponseDTO> dtos = memberPage.getContent().stream()
                .map(MemberResponseDTO::fromEntity)
                .collect(Collectors.toList());

        resolveFamilyHeadNames(dtos);

        PaginationDTO pagination = new PaginationDTO(
                page, limit,
                memberPage.getTotalElements(),
                memberPage.getTotalPages()
        );

        return new MembersPageResponseDTO(dtos, pagination);
    }

    @Transactional(readOnly = true)
    public MemberResponseDTO getMemberByUserId(Long userId) {
        Member member = memberRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found for userId: " + userId));
        return MemberResponseDTO.fromEntity(member);
    }

    @Transactional(readOnly = true)
    public MemberResponseDTO getMemberById(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + id));
        MemberResponseDTO dto = MemberResponseDTO.fromEntity(member);
        if (member.getFamilyHeadId() != null) {
            memberRepository.findByMemberId(member.getFamilyHeadId())
                    .ifPresent(head -> dto.setFamilyHeadName(head.getName()));
        }
        return dto;
    }

    // ── Write ───────────────────────────────────────────────────────────────

    public MemberResponseDTO createMember(MemberRequestDTO request) {
        Member member = new Member();
        applyRequest(request, member);
        if (member.getTotalVisits() == null) member.setTotalVisits(0);

        // Determine family head flag
        boolean hasFamily = request.getFamilyMembers() != null && !request.getFamilyMembers().isEmpty();
        // "Couple" is a constrained Family registration (exactly one connected adult,
        // no minors) — it reuses the exact same head/adult linking + independent
        // billing logic as Family, just capped to one dependent by the frontend.
        boolean isFamilyType = "Family".equalsIgnoreCase(member.getMembershipType())
                || "Couple".equalsIgnoreCase(member.getMembershipType());
        if (isFamilyType && hasFamily) {
            member.setIsFamilyHead(true);
        } else if (request.getIsFamilyHead() != null) {
            member.setIsFamilyHead(request.getIsFamilyHead());
        }

        // Enforce the Couple constraint server-side too — exactly one connected
        // adult, never a minor — so it can't be bypassed by calling the API directly.
        if ("Couple".equalsIgnoreCase(member.getMembershipType()) && hasFamily) {
            if (request.getFamilyMembers().size() > 1) {
                throw new IllegalArgumentException("Couple membership allows only one connected member.");
            }
            if (Boolean.TRUE.equals(request.getFamilyMembers().get(0).getIsMinor())) {
                throw new IllegalArgumentException("Couple membership only supports an adult connected member.");
            }
        }

        // Resolve the plan up front — needed both for expiry (below) and to decide
        // how a Family plan bills its members (see familyHeadBillingMode).
        MembershipPlan resolvedPlan = member.getMembershipPlan() != null
                ? planRepository.findByName(member.getMembershipPlan()).orElse(null)
                : null;

        // "family_head" billing mode: EVERY family/couple member (adult or minor)
        // folds into ONE invoice on the head — nobody but the head ever carries
        // their own outstandingBalance/receipt. "individual" (default — every
        // existing Family/Couple plan) keeps today's behavior: adults bill
        // independently, only minors fold into the head's bill.
        boolean familyHeadBillingMode = isFamilyType
                && hasFamily && resolvedPlan != null
                && "family_head".equalsIgnoreCase(resolvedPlan.getFamilyBillingMode());

        if (isFamilyType && hasFamily && resolvedPlan != null) {
            List<FamilyMemberDTO> validRows = request.getFamilyMembers().stream()
                    .filter(fm -> fm.getName() != null && !fm.getName().isBlank())
                    .collect(Collectors.toList());
            long adultCount = 1 + validRows.stream().filter(fm -> !Boolean.TRUE.equals(fm.getIsMinor())).count();
            long childCount = validRows.stream().filter(fm -> Boolean.TRUE.equals(fm.getIsMinor())).count();
            enforceFamilyMemberCaps(resolvedPlan, adultCount, childCount);
        }

        // Split family members into independently-billed adults and guardian-billed
        // dependents. Under family_head billing mode EVERY member (adult or minor)
        // is guardian-billed — reusing the exact same "billed to head" mechanism
        // minors have always used, just no longer gated on isMinor.
        List<FamilyMemberDTO> adultFamilyMembers = new ArrayList<>();
        List<FamilyMemberDTO> minorFamilyMembers = new ArrayList<>();
        if (isFamilyType && hasFamily) {
            for (FamilyMemberDTO fm : request.getFamilyMembers()) {
                if (fm.getName() == null || fm.getName().isBlank()) continue;
                if (familyHeadBillingMode || Boolean.TRUE.equals(fm.getIsMinor())) {
                    minorFamilyMembers.add(fm);
                } else {
                    adultFamilyMembers.add(fm);
                }
            }
        }
        // Dependents billed to the head. Two different models depending on the
        // plan's billing mode:
        //  - "individual" (existing Family/Couple behavior): each minor's own fee/
        //    payment is captured on their own row and folded onto the head's due.
        //  - "family_head": nobody but the head ever makes a payment — the head's
        //    own fee IS the whole family's invoice (price-per-member × headcount,
        //    or the plan's flat price as a fallback), and dependents carry no fee/
        //    payment of their own at all, not even a folded "unpaid share".
        BigDecimal minorFeeTotal = BigDecimal.ZERO;
        BigDecimal minorPaidTotal = BigDecimal.ZERO;
        List<PaymentSplitDTO> minorPaidLegs = new ArrayList<>();
        // Fee attributed to each dependent — informational only under family_head
        // mode (their share of the one combined invoice, for display/itemization);
        // the real amount owed under "individual" mode (folded onto the head's due
        // below).
        Map<FamilyMemberDTO, BigDecimal> billedFeeByMember = new java.util.IdentityHashMap<>();

        if (familyHeadBillingMode) {
            int totalMembers = 1 + minorFamilyMembers.size();
            boolean autoCalc = !Boolean.FALSE.equals(resolvedPlan.getAutoCalculateTotal())
                    && resolvedPlan.getPricePerMember() != null;
            BigDecimal combinedHeadFee;
            if (autoCalc) {
                combinedHeadFee = BigDecimal.ZERO;
                for (int i = 0; i < totalMembers; i++) {
                    combinedHeadFee = combinedHeadFee.add(memberPriceForIndex(resolvedPlan, i));
                }
                int idx = 1;
                for (FamilyMemberDTO fm : minorFamilyMembers) {
                    billedFeeByMember.put(fm, memberPriceForIndex(resolvedPlan, idx++));
                }
            } else {
                // Auto-calculate is off (or no price-per-member configured) — fall
                // back to the plan's own flat price as the whole family's invoice.
                combinedHeadFee = resolvedPlan.getPrice() != null ? resolvedPlan.getPrice() : BigDecimal.ZERO;
                for (FamilyMemberDTO fm : minorFamilyMembers) {
                    billedFeeByMember.put(fm, BigDecimal.ZERO);
                }
            }
            member.setMembershipFee(combinedHeadFee);
        } else {
            for (FamilyMemberDTO fm : minorFamilyMembers) {
                BigDecimal fee = fm.getMinorFee() != null ? fm.getMinorFee() : BigDecimal.ZERO;
                billedFeeByMember.put(fm, fee);
                minorFeeTotal = minorFeeTotal.add(fee);
                BigDecimal paidAmt = fm.getMinorPaidAmount() != null ? fm.getMinorPaidAmount() : BigDecimal.ZERO;
                if (paidAmt.compareTo(fee) > 0) paidAmt = fee; // clamp — can't pay more than the fee
                if (paidAmt.compareTo(BigDecimal.ZERO) > 0) {
                    minorPaidTotal = minorPaidTotal.add(paidAmt);
                    if (fm.getMinorPaymentBreakdown() != null && !fm.getMinorPaymentBreakdown().isEmpty()) {
                        minorPaidLegs.addAll(fm.getMinorPaymentBreakdown());
                    } else if (fm.getMinorPaymentMethod() != null) {
                        minorPaidLegs.add(new PaymentSplitDTO(fm.getMinorPaymentMethod(), paidAmt, null));
                    }
                }
            }
        }
        BigDecimal minorUnpaidTotal = minorFeeTotal.subtract(minorPaidTotal);

        // Calculate expiry date from plan duration (overrides any frontend-sent value),
        // except when the frontend explicitly set a due date tied to a real outstanding
        // balance — e.g. a credit payment's due date — which is unrelated to the
        // membership's renewal cycle and must not be clobbered by the expiry date.
        boolean hasExplicitCreditDueDate = request.getNextPaymentDate() != null
                && request.getOutstandingBalance() != null
                && request.getOutstandingBalance().compareTo(BigDecimal.ZERO) > 0;
        // Default a blank Start Date to today rather than silently skipping expiry
        // computation — otherwise leaving that field empty on the form means the
        // member's expiry/next-payment-date never gets set at all, matching the
        // fallback already applied to linked family/couple members below.
        if (member.getMembershipStartDate() == null) {
            member.setMembershipStartDate(LocalDateTime.now());
        }
        if (resolvedPlan != null) {
            LocalDateTime expiry = computeExpiry(member.getMembershipStartDate(), resolvedPlan);
            member.setMembershipEndDate(expiry);
            member.setExpiryDate(expiry);
            if (!hasExplicitCreditDueDate) {
                member.setNextPaymentDate(expiry);
            }
        }

        // Set last payment date when payment is made at registration
        if (member.getLastPaymentDate() == null && "paid".equalsIgnoreCase(member.getPaymentStatus())) {
            member.setLastPaymentDate(LocalDateTime.now());
        }

        // Recalculate outstanding balance: fee - paid amount
        if (member.getOutstandingBalance() == null && member.getMembershipFee() != null) {
            String ps = member.getPaymentStatus();
            if ("paid".equalsIgnoreCase(ps)) {
                member.setOutstandingBalance(BigDecimal.ZERO);
            } else {
                member.setOutstandingBalance(member.getMembershipFee());
            }
        }

        // Fold minors' UNPAID fees on top of the head's own outstanding balance — a
        // minor's fee only sits as the head's due when it wasn't marked paid above;
        // any minor paid at registration is excluded, so it never shows as due.
        // Not applicable under family_head mode — there the combined fee already IS
        // the whole family's invoice, with nothing left to fold on top.
        if (!familyHeadBillingMode && minorFeeTotal.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal ownOutstanding = member.getOutstandingBalance() != null ? member.getOutstandingBalance() : BigDecimal.ZERO;
            member.setOutstandingBalance(ownOutstanding.add(minorUnpaidTotal));
            if (minorUnpaidTotal.compareTo(BigDecimal.ZERO) > 0 && "paid".equalsIgnoreCase(member.getPaymentStatus())) {
                member.setPaymentStatus("partial");
            }
        }

        // First save to get the auto-generated DB id
        Member saved = memberRepository.save(member);

        // Generate the business member ID: MBR-XXXXXXXXXX (zero-padded sequential)
        saved.setMemberId("MBR-" + String.format("%010d", saved.getId()));
        saved = memberRepository.save(saved);

        // Auto-create a receipt for the new member — its amount covers the head's own
        // fee plus any minors billed to them, itemized via minorCharges. paidAmount is
        // derived from (combinedFee - outstandingBalance), which now correctly nets out
        // to the head's own paid amount plus any minors' fees paid at registration.
        BigDecimal ownFee = saved.getMembershipFee() != null ? saved.getMembershipFee() : BigDecimal.ZERO;
        BigDecimal combinedFee = ownFee.add(minorFeeTotal);
        // Under family_head mode there's no independent per-dependent payment to
        // check — every member is "paid" together, exactly when the head's own
        // combined invoice ended up fully covered.
        boolean familyPaidInFull = saved.getOutstandingBalance() == null
                || saved.getOutstandingBalance().compareTo(BigDecimal.ZERO) <= 0;
        List<com.company.project.dto.MinorChargeDTO> minorCharges = minorFamilyMembers.isEmpty() ? null
                : minorFamilyMembers.stream()
                        .map(fm -> {
                            BigDecimal fee = billedFeeByMember.get(fm);
                            boolean paidFlag;
                            if (familyHeadBillingMode) {
                                paidFlag = familyPaidInFull;
                            } else {
                                BigDecimal paidAmt = fm.getMinorPaidAmount() != null ? fm.getMinorPaidAmount() : BigDecimal.ZERO;
                                paidFlag = fee.compareTo(BigDecimal.ZERO) > 0 && paidAmt.compareTo(fee) >= 0;
                            }
                            return new com.company.project.dto.MinorChargeDTO(null, null, fm.getName(), fee, paidFlag);
                        })
                        .collect(Collectors.toList());
        List<PaymentSplitDTO> combinedBreakdown = new ArrayList<>();
        if (request.getPaymentBreakdown() != null) combinedBreakdown.addAll(request.getPaymentBreakdown());
        combinedBreakdown.addAll(minorPaidLegs);
        com.company.project.entities.Receipt receipt = receiptService.createReceiptForMember(
                saved, "New", saved.getPaymentStatus(), combinedBreakdown.isEmpty() ? null : combinedBreakdown,
                request.getBankAccountCode(), request.getBankAccountName(), combinedFee, minorCharges);

        // Post to General Ledger for whatever amount was actually received — a partial/
        // credit payment (e.g. AED 5 received against a AED 45 invoice) must still post
        // the AED 5 through the real payment method; it is NOT skipped just because the
        // member's overall status is "pending" rather than "paid".
        if (receipt.getPaidAmount() != null && receipt.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
            financialEventService.onMemberPaymentReceived(receipt);
            receiptVoucherService.createVoucherFromModule(
                    "Member Registration – " + saved.getName(),
                    "Membership",
                    saved.getName(),
                    saved.getId(),
                    receipt.getPaidAmount(),
                    saved.getPaymentMethodUsed(),
                    saved.getMemberId(),
                    null,
                    "New member: " + saved.getMembershipPlan()
                            + (request.getBankAccountName() != null && !request.getBankAccountName().isBlank()
                                    ? " | Bank: " + request.getBankAccountName() : ""),
                    request.getPaymentBreakdown()
            );
        }

        // Create linked family member records: independently-billed adults get a
        // fully independent membership (own plan/fee/receipt/ledger post); billed-
        // to-head members (all minors, plus adults under family_head billing mode)
        // were already billed into the head's receipt above and just need an
        // identification record.
        for (FamilyMemberDTO fm : adultFamilyMembers) {
            registerFamilyAdult(fm, saved);
        }
        for (FamilyMemberDTO fm : minorFamilyMembers) {
            createBilledToHeadRecord(fm, saved, billedFeeByMember.get(fm));
        }

        // Auto-create app login account if credentials were provided
        if (request.getAppUsername() != null && !request.getAppUsername().isBlank()
                && request.getAppPassword() != null && !request.getAppPassword().isBlank()) {
            if (userRepository.existsByUsername(request.getAppUsername())) {
                throw new BusinessRuleViolationException("Username already taken: " + request.getAppUsername());
            }
            User user = new User();
            user.setUsername(request.getAppUsername());
            user.setEmail(saved.getEmail());
            user.setPasswordHash(passwordEncoder.encode(request.getAppPassword()));
            user.setEnabled(true);
            user.setUserRoles(new java.util.HashSet<>());
            user = userRepository.save(user);

            Role memberRole = roleRepository.findByRoleName("MEMBER")
                    .orElseThrow(() -> new EntityNotFoundException("MEMBER role not found"));
            userRoleRepository.save(new UserRole(null, user, memberRole));

            saved.setUserId(user.getId());
            saved.setAppUsername(request.getAppUsername());
            saved.setAppAccessEnabled(true);
            saved = memberRepository.save(saved);
        }

        notificationService.notifyRoles(
                List.of("ADMIN", "MANAGER"),
                "New Member Joined",
                saved.getName() + " has joined as a new member.",
                "SUCCESS", "MEDIUM", "MEMBERS",
                saved.getId(), "/members",
                "MEMBER_CREATED_" + saved.getId()
        );

        // Fire new_signup automation workflows (event-driven, non-blocking)
        automationExecutorService.handleEvent("new_signup", saved);

        return MemberResponseDTO.fromEntity(saved);
    }

    public MemberResponseDTO setMemberCredentials(Long id, String appUsername, String appPassword) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Member not found: " + id));

        if (member.getUserId() != null) {
            // Already has an account — just update the password
            User user = userRepository.findById(member.getUserId())
                    .orElseThrow(() -> new EntityNotFoundException("Linked user account not found"));
            user.setPasswordHash(passwordEncoder.encode(appPassword));
            userRepository.save(user);
        } else {
            // No account yet — create one
            if (userRepository.existsByUsername(appUsername)) {
                throw new BusinessRuleViolationException("Username already taken: " + appUsername);
            }
            User user = new User();
            user.setUsername(appUsername);
            user.setEmail(member.getEmail());
            user.setPasswordHash(passwordEncoder.encode(appPassword));
            user.setEnabled(true);
            user.setUserRoles(new java.util.HashSet<>());
            user = userRepository.save(user);

            Role memberRole = roleRepository.findByRoleName("MEMBER")
                    .orElseThrow(() -> new EntityNotFoundException("MEMBER role not found"));
            userRoleRepository.save(new UserRole(null, user, memberRole));

            member.setUserId(user.getId());
            member.setAppUsername(appUsername);
            member.setAppAccessEnabled(true);
            memberRepository.save(member);
        }

        return MemberResponseDTO.fromEntity(memberRepository.findById(id).orElseThrow());
    }

    public MemberResponseDTO toggleMemberAccess(Long id, boolean enabled) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Member not found: " + id));
        if (member.getUserId() == null) {
            throw new EntityNotFoundException("This member has no linked app account");
        }
        User user = userRepository.findById(member.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("Linked user account not found"));
        user.setEnabled(enabled);
        userRepository.save(user);
        member.setAppAccessEnabled(enabled);
        return MemberResponseDTO.fromEntity(memberRepository.save(member));
    }

    /**
     * Generates a unique placeholder email so the NOT NULL / UNIQUE constraint on
     * Member.email is satisfied for a family member who wasn't given a real one.
     */
    private String syntheticFamilyEmail(String headMemberId, String name) {
        return "family_" + headMemberId + "_"
                + name.trim().toLowerCase().replaceAll("[^a-z0-9]", "_")
                + "_" + System.currentTimeMillis() + "@family.local";
    }

    /**
     * Per-member price under family_head auto-calculate billing: the plan's
     * pricePerMember for members within maxFamilyMembers, additionalMemberPrice
     * (falling back to pricePerMember) for every member beyond that cap. index is
     * 0-based across the whole family, head included (head is always index 0).
     */
    private BigDecimal memberPriceForIndex(MembershipPlan plan, int index) {
        BigDecimal base = plan.getPricePerMember() != null ? plan.getPricePerMember() : BigDecimal.ZERO;
        Integer max = plan.getMaxFamilyMembers();
        if (max == null || max <= 0 || index < max) return base;
        BigDecimal extra = plan.getAdditionalMemberPrice();
        return extra != null ? extra : base;
    }

    /**
     * Server-side enforcement of a Family plan's member-count limits — mirrors the
     * Couple constraint in createMember() so caps can't be bypassed by calling the
     * API directly. adultCount includes the head.
     */
    private void enforceFamilyMemberCaps(MembershipPlan plan, long adultCount, long childCount) {
        long totalCount = adultCount + childCount;
        boolean allowExtra = !Boolean.FALSE.equals(plan.getAllowAdditionalMembers());
        Integer maxAdults = plan.getMaxAdultMembers();
        Integer maxChildren = plan.getMaxChildMembers();
        Integer maxTotal = plan.getMaxFamilyMembers();
        if (maxAdults != null && maxAdults > 0 && adultCount > maxAdults) {
            throw new IllegalArgumentException("This family plan allows a maximum of " + maxAdults + " adult member(s).");
        }
        if (maxChildren != null && maxChildren > 0 && childCount > maxChildren) {
            throw new IllegalArgumentException("This family plan allows a maximum of " + maxChildren + " child member(s).");
        }
        if (maxTotal != null && maxTotal > 0 && totalCount > maxTotal && !allowExtra) {
            throw new IllegalArgumentException("This family plan allows a maximum of " + maxTotal + " member(s).");
        }
    }

    /**
     * Registers an adult family member as a completely independent membership —
     * own plan, fee, receipt, and ledger post — linked to the head only for
     * relationship/reporting grouping via familyHeadId. Renewing/freezing this
     * member later never touches any other family member.
     */
    private void registerFamilyAdult(FamilyMemberDTO fm, Member head) {
        Member dep = new Member();
        dep.setName(fm.getName());
        dep.setEmail(fm.getEmail() != null && !fm.getEmail().isBlank()
                ? fm.getEmail() : syntheticFamilyEmail(head.getMemberId(), fm.getName()));
        dep.setPhone(fm.getPhone());
        dep.setMembershipType(head.getMembershipType());
        dep.setMembershipStatus("active");
        dep.setMembershipPlan(fm.getMembershipPlan() != null && !fm.getMembershipPlan().isBlank()
                ? fm.getMembershipPlan() : head.getMembershipPlan());
        dep.setMembershipStartDate(head.getMembershipStartDate() != null
                ? head.getMembershipStartDate() : LocalDateTime.now());
        dep.setJoinDate(dep.getMembershipStartDate());
        dep.setMembershipFee(fm.getMembershipFee());
        dep.setPaymentStatus(fm.getPaymentStatus() != null ? fm.getPaymentStatus() : "pending");
        dep.setPaymentMethodUsed(fm.getPaymentMethod());
        dep.setTotalVisits(0);
        dep.setIsFamilyHead(false);
        dep.setFamilyHeadId(head.getMemberId());
        dep.setRelationshipToHead(fm.getRelationship());
        dep.setIsMinor(false);
        dep.setBilledToHead(false);

        if (dep.getMembershipPlan() != null) {
            planRepository.findByName(dep.getMembershipPlan()).ifPresent(plan -> {
                LocalDateTime expiry = computeExpiry(dep.getMembershipStartDate(), plan);
                dep.setMembershipEndDate(expiry);
                dep.setExpiryDate(expiry);
                dep.setNextPaymentDate(expiry);
            });
        }

        if (fm.getOutstandingBalance() != null) {
            dep.setOutstandingBalance(fm.getOutstandingBalance());
        } else if (dep.getMembershipFee() != null) {
            dep.setOutstandingBalance("paid".equalsIgnoreCase(dep.getPaymentStatus())
                    ? BigDecimal.ZERO : dep.getMembershipFee());
        }
        if ("paid".equalsIgnoreCase(dep.getPaymentStatus())) {
            dep.setLastPaymentDate(LocalDateTime.now());
        }

        Member savedDep = memberRepository.save(dep);
        savedDep.setMemberId("MBR-" + String.format("%010d", savedDep.getId()));
        savedDep = memberRepository.save(savedDep);

        com.company.project.entities.Receipt receipt = receiptService.createReceiptForMember(
                savedDep, "New", savedDep.getPaymentStatus(), fm.getPaymentBreakdown(),
                fm.getBankAccountCode(), fm.getBankAccountName());

        if (receipt.getPaidAmount() != null && receipt.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
            financialEventService.onMemberPaymentReceived(receipt);
            receiptVoucherService.createVoucherFromModule(
                    "Family Member Registration – " + savedDep.getName(),
                    "Membership",
                    savedDep.getName(),
                    savedDep.getId(),
                    receipt.getPaidAmount(),
                    savedDep.getPaymentMethodUsed(),
                    savedDep.getMemberId(),
                    null,
                    "New family member (" + fm.getRelationship() + ") of " + head.getName()
                            + ": " + savedDep.getMembershipPlan(),
                    fm.getPaymentBreakdown()
            );
        }
    }

    /**
     * Creates an identification-only record for a family member whose charges are
     * billed to the head's account instead of carrying their own: no plan pricing
     * of their own, no outstandingBalance, no receipt/ledger post (see createMember /
     * renewFamilyMinor). Always used for a minor; also used for an ADULT dependent
     * under a family_head-billing-mode Family plan (see Member.billedToHead).
     * billedFee is display-only here (informational on the dependent's own record) —
     * the authoritative amount actually invoiced lives on the head's Receipt.
     */
    private void createBilledToHeadRecord(FamilyMemberDTO fm, Member head, BigDecimal billedFee) {
        Member dep = new Member();
        dep.setName(fm.getName());
        dep.setEmail(fm.getEmail() != null && !fm.getEmail().isBlank()
                ? fm.getEmail() : syntheticFamilyEmail(head.getMemberId(), fm.getName()));
        dep.setPhone(fm.getPhone());
        dep.setMembershipType(head.getMembershipType());
        dep.setMembershipStatus(head.getMembershipStatus());
        dep.setMembershipPlan(fm.getMembershipPlan() != null && !fm.getMembershipPlan().isBlank()
                ? fm.getMembershipPlan() : head.getMembershipPlan());
        dep.setMembershipStartDate(head.getMembershipStartDate());
        dep.setMembershipEndDate(head.getMembershipEndDate());
        dep.setExpiryDate(head.getExpiryDate());
        dep.setJoinDate(head.getJoinDate());
        dep.setMembershipFee(billedFee);
        dep.setPaymentStatus(null);
        dep.setOutstandingBalance(null);
        dep.setTotalVisits(0);
        dep.setIsFamilyHead(false);
        dep.setFamilyHeadId(head.getMemberId());
        dep.setRelationshipToHead(fm.getRelationship());
        dep.setIsMinor(Boolean.TRUE.equals(fm.getIsMinor()));
        dep.setBilledToHead(true);
        if (fm.getDateOfBirth() != null) dep.setDateOfBirth(parseDate(fm.getDateOfBirth()));

        Member savedDep = memberRepository.save(dep);
        savedDep.setMemberId("MBR-" + String.format("%010d", savedDep.getId()));
        memberRepository.save(savedDep);
    }

    public MemberResponseDTO updateMember(Long id, MemberRequestDTO request) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + id));
        applyRequest(request, member);
        return MemberResponseDTO.fromEntity(memberRepository.save(member));
    }

    public void deleteMember(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + id));
        if (Boolean.TRUE.equals(member.getIsFamilyHead()) && member.getMemberId() != null) {
            List<Member> dependents = memberRepository.findByFamilyHeadId(member.getMemberId());
            if (!dependents.isEmpty()) {
                throw new BusinessRuleViolationException("Cannot delete " + member.getName()
                        + " — reassign or remove their " + dependents.size()
                        + " linked family member(s) first.");
            }
        }
        memberRepository.deleteById(id);
    }

    public MemberResponseDTO renewMember(Long id, RenewalRequestDTO request) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + id));
        if (member.isEffectivelyBilledToHead()) {
            throw new BusinessRuleViolationException("This member's charges are billed to their family head — "
                    + "use the family member renewal endpoint instead.");
        }
        if (request.getPlanName()        != null) member.setMembershipPlan(request.getPlanName());
        if (request.getMembershipFee()   != null) member.setMembershipFee(request.getMembershipFee());
        if (request.getMembershipType()  != null) member.setMembershipType(request.getMembershipType());
        if (request.getMembershipStatus() != null) member.setMembershipStatus(request.getMembershipStatus());

        // Compute new expiry from plan duration, extending from current expiry (or today)
        if (member.getMembershipPlan() != null) {
            Optional<MembershipPlan> planOpt = planRepository.findByName(member.getMembershipPlan());
            if (planOpt.isPresent()) {
                LocalDateTime base = member.getExpiryDate() != null
                        ? member.getExpiryDate() : LocalDateTime.now();
                LocalDateTime newExpiry = computeExpiry(base, planOpt.get());
                member.setMembershipEndDate(newExpiry);
                member.setExpiryDate(newExpiry);
                member.setNextPaymentDate(newExpiry);
            }
        } else if (request.getMembershipEndDate() != null) {
            // Fallback: use frontend-supplied date if no plan name
            LocalDateTime endDate = parseDateTime(request.getMembershipEndDate());
            member.setMembershipEndDate(endDate);
            member.setExpiryDate(endDate);
            member.setNextPaymentDate(endDate);
        }

        // How much is actually being collected now — may be a genuine partial amount
        // (a "Credit" renewal with something received via a real method), not just a
        // binary paid/pending flag. Falls back to the old binary paymentStatus when
        // the caller doesn't send amountReceived, so existing callers keep working.
        BigDecimal fee = member.getMembershipFee() != null ? member.getMembershipFee() : BigDecimal.ZERO;
        BigDecimal amountReceived = request.getAmountReceived() != null
                ? request.getAmountReceived().max(BigDecimal.ZERO).min(fee)
                : ("paid".equalsIgnoreCase(request.getPaymentStatus()) ? fee : BigDecimal.ZERO);
        BigDecimal outstanding = fee.subtract(amountReceived).max(BigDecimal.ZERO);

        member.setOutstandingBalance(outstanding);
        if (outstanding.compareTo(BigDecimal.ZERO) <= 0) {
            member.setPaymentStatus("paid");
            member.setLastPaymentDate(LocalDateTime.now());
        } else if (amountReceived.compareTo(BigDecimal.ZERO) > 0) {
            member.setPaymentStatus("partial");
            member.setLastPaymentDate(LocalDateTime.now());
        } else {
            member.setPaymentStatus("pending");
        }
        // "Credit" is only ever the stored method label when nothing was actually
        // received yet — any real money always carries its real method, consistent
        // with the Add Member credit flow (see gymbios-credit-payment-fix).
        member.setPaymentMethodUsed(amountReceived.compareTo(BigDecimal.ZERO) > 0
                ? request.getPaymentMethod() : "Credit");

        Member saved = memberRepository.save(member);

        // Auto-create a receipt for the renewal, reflecting whatever was actually
        // received now (paidAmount is derived from fee − outstandingBalance).
        com.company.project.entities.Receipt receipt = receiptService.createReceiptForMember(
                saved, "Renewal", saved.getPaymentStatus(), request.getPaymentBreakdown(),
                request.getBankAccountCode(), request.getBankAccountName());

        // Post to General Ledger for whatever amount was actually received — a partial/
        // credit renewal must still post the real amount through the real method; it
        // is not skipped just because the member's overall status isn't "paid".
        if (receipt.getPaidAmount() != null && receipt.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
            financialEventService.onMemberPaymentReceived(receipt);
            receiptVoucherService.createVoucherFromModule(
                    "Membership Renewal – " + saved.getName(),
                    "Membership",
                    saved.getName(),
                    saved.getId(),
                    receipt.getPaidAmount(),
                    saved.getPaymentMethodUsed(),
                    saved.getMemberId(),
                    null,
                    "Renewal: " + saved.getMembershipPlan(),
                    null
            );
        }

        return MemberResponseDTO.fromEntity(saved);
    }

    /**
     * Renews a single family member whose charges are billed to their head (any
     * minor, or an adult under family_head billing mode). Their own
     * membershipEndDate/expiryDate are updated for record-keeping, but the charge
     * is billed onto the head's account (a new receipt under the head's name,
     * added to the head's outstandingBalance) rather than creating an independent
     * balance for this member. The head's own membership/expiry is left untouched
     * — for renewing the WHOLE family together in one invoice, see renewFamily().
     */
    public MemberResponseDTO renewFamilyMinor(Long minorId, MinorRenewalRequestDTO request) {
        Member minor = memberRepository.findById(minorId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + minorId));
        if (!minor.isEffectivelyBilledToHead()) {
            throw new BusinessRuleViolationException("This member is not billed to a family head — use the standard renew endpoint.");
        }
        if (minor.getFamilyHeadId() == null) {
            throw new BusinessRuleViolationException("This minor has no assigned guardian.");
        }
        Member guardian = memberRepository.findByMemberId(minor.getFamilyHeadId())
                .orElseThrow(() -> new EntityNotFoundException("Guardian not found for this minor."));

        if (request.getPlanName() != null) minor.setMembershipPlan(request.getPlanName());
        BigDecimal fee = request.getFee() != null ? request.getFee() : minor.getMembershipFee();
        minor.setMembershipFee(fee);
        BigDecimal feeAmount = fee != null ? fee : BigDecimal.ZERO;
        // A genuine partial paidAmount takes precedence; fall back to the older
        // binary paymentStatus (paid = full fee, anything else = nothing collected)
        // for backward compatibility with callers that don't send paidAmount.
        BigDecimal paidAmount = request.getPaidAmount() != null
                ? request.getPaidAmount().max(BigDecimal.ZERO).min(feeAmount)
                : ("paid".equalsIgnoreCase(request.getPaymentStatus()) ? feeAmount : BigDecimal.ZERO);
        boolean fullyPaid = paidAmount.compareTo(feeAmount) >= 0 && feeAmount.compareTo(BigDecimal.ZERO) > 0;

        if (minor.getMembershipPlan() != null) {
            planRepository.findByName(minor.getMembershipPlan()).ifPresent(plan -> {
                LocalDateTime base = minor.getExpiryDate() != null ? minor.getExpiryDate() : LocalDateTime.now();
                LocalDateTime newExpiry = computeExpiry(base, plan);
                minor.setMembershipEndDate(newExpiry);
                minor.setExpiryDate(newExpiry);
            });
        }
        Member savedMinor = memberRepository.save(minor);

        BigDecimal guardianOutstanding = guardian.getOutstandingBalance() != null
                ? guardian.getOutstandingBalance() : BigDecimal.ZERO;
        BigDecimal unpaid = feeAmount.subtract(paidAmount);
        if (unpaid.compareTo(BigDecimal.ZERO) > 0) {
            guardian.setOutstandingBalance(guardianOutstanding.add(unpaid));
        }
        if (paidAmount.compareTo(BigDecimal.ZERO) > 0) {
            guardian.setLastPaymentDate(LocalDateTime.now());
            if (request.getPaymentMethod() != null) guardian.setPaymentMethodUsed(request.getPaymentMethod());
        }
        Member savedGuardian = memberRepository.save(guardian);

        com.company.project.entities.Receipt receipt = receiptService.createMinorChargeReceipt(
                savedGuardian, savedMinor, feeAmount, paidAmount, "Renewal", null,
                request.getPaymentBreakdown(), request.getBankAccountCode(), request.getBankAccountName());

        if (paidAmount.compareTo(BigDecimal.ZERO) > 0) {
            financialEventService.onMemberPaymentReceived(receipt);
            receiptVoucherService.createVoucherFromModule(
                    "Family Member Renewal – " + savedMinor.getName(),
                    "Membership",
                    savedGuardian.getName(),
                    savedGuardian.getId(),
                    receipt.getPaidAmount(),
                    request.getPaymentMethod() != null ? request.getPaymentMethod() : savedGuardian.getPaymentMethodUsed(),
                    savedGuardian.getMemberId(),
                    null,
                    "Renewal for family member " + savedMinor.getName()
                            + " (billed to " + savedGuardian.getName() + ")"
                            + (fullyPaid ? "" : " — partial payment"),
                    null
            );
        }

        return MemberResponseDTO.fromEntity(savedMinor);
    }

    /**
     * Renews an entire family together in ONE invoice under family_head billing
     * mode: counts every current family member (head + dependents), recalculates
     * pricePerMember × headcount (same tiered pricing as createMember's auto-
     * calculate), extends everyone's membership dates together, and posts a
     * single receipt/ledger entry to the head. Adding or removing a family member
     * before the next renewal is exactly what changes this recalculated total.
     */
    public MemberResponseDTO renewFamily(Long headId, FamilyRenewalRequestDTO request) {
        Member head = memberRepository.findById(headId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + headId));
        if (!Boolean.TRUE.equals(head.getIsFamilyHead())) {
            throw new BusinessRuleViolationException("This member is not a family head.");
        }

        String planName = request.getPlanName() != null ? request.getPlanName() : head.getMembershipPlan();
        MembershipPlan plan = planName != null ? planRepository.findByName(planName).orElse(null) : null;
        if (plan == null || !"family_head".equalsIgnoreCase(plan.getFamilyBillingMode())) {
            throw new BusinessRuleViolationException("This family's plan is not billed as a single family invoice — "
                    + "renew each member individually instead.");
        }
        if (request.getPlanName() != null) head.setMembershipPlan(request.getPlanName());
        if (request.getPaymentStatus() != null) head.setPaymentStatus(request.getPaymentStatus());
        if (request.getPaymentMethod() != null) head.setPaymentMethodUsed(request.getPaymentMethod());

        List<Member> dependents = memberRepository.findByFamilyHeadId(head.getMemberId());
        int totalMembers = 1 + dependents.size();
        BigDecimal totalFee = BigDecimal.ZERO;
        for (int i = 0; i < totalMembers; i++) {
            totalFee = totalFee.add(memberPriceForIndex(plan, i));
        }
        head.setMembershipFee(totalFee);

        // Extend expiry together for the head and every dependent from the head's
        // current expiry (or today) — same base date, same duration, so the whole
        // family stays in sync.
        LocalDateTime base = head.getExpiryDate() != null ? head.getExpiryDate() : LocalDateTime.now();
        LocalDateTime newExpiry = computeExpiry(base, plan);
        head.setMembershipEndDate(newExpiry);
        head.setExpiryDate(newExpiry);
        head.setNextPaymentDate(newExpiry);

        boolean renewalPaid = "paid".equalsIgnoreCase(head.getPaymentStatus());
        if (renewalPaid) {
            head.setLastPaymentDate(LocalDateTime.now());
            head.setOutstandingBalance(BigDecimal.ZERO);
        } else {
            head.setOutstandingBalance(totalFee);
        }

        for (Member dep : dependents) {
            dep.setMembershipEndDate(newExpiry);
            dep.setExpiryDate(newExpiry);
        }
        memberRepository.saveAll(dependents);
        Member savedHead = memberRepository.save(head);

        List<com.company.project.dto.MinorChargeDTO> memberCharges = new ArrayList<>();
        for (int i = 0; i < dependents.size(); i++) {
            Member dep = dependents.get(i);
            memberCharges.add(new com.company.project.dto.MinorChargeDTO(
                    dep.getMemberId(), dep.getId(), dep.getName(), memberPriceForIndex(plan, i + 1), renewalPaid));
        }

        com.company.project.entities.Receipt receipt = receiptService.createReceiptForMember(
                savedHead, "Renewal", savedHead.getPaymentStatus(), request.getPaymentBreakdown(),
                request.getBankAccountCode(), request.getBankAccountName(), totalFee,
                memberCharges.isEmpty() ? null : memberCharges);

        if (renewalPaid) {
            financialEventService.onMemberPaymentReceived(receipt);
            receiptVoucherService.createVoucherFromModule(
                    "Family Renewal – " + savedHead.getName(),
                    "Membership",
                    savedHead.getName(),
                    savedHead.getId(),
                    receipt.getPaidAmount(),
                    savedHead.getPaymentMethodUsed(),
                    savedHead.getMemberId(),
                    null,
                    "Family renewal (" + totalMembers + " member(s)): " + savedHead.getMembershipPlan(),
                    request.getPaymentBreakdown()
            );
        }

        return MemberResponseDTO.fromEntity(savedHead);
    }

    /**
     * Returns the family head plus every linked family member (adults + minors)
     * for the family that the given member belongs to — resolving through the
     * head whether the given id IS the head or one of their dependents.
     */
    @Transactional(readOnly = true)
    public FamilyGroupResponseDTO getFamilyGroup(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + id));
        String headMemberId = Boolean.TRUE.equals(member.getIsFamilyHead())
                ? member.getMemberId() : member.getFamilyHeadId();
        if (headMemberId == null) {
            throw new BusinessRuleViolationException("This member does not belong to a family group.");
        }
        Member head = memberRepository.findByMemberId(headMemberId)
                .orElseThrow(() -> new EntityNotFoundException("Family head not found."));
        List<MemberResponseDTO> members = memberRepository.findByFamilyHeadId(headMemberId).stream()
                .map(MemberResponseDTO::fromEntity)
                .collect(Collectors.toList());
        return new FamilyGroupResponseDTO(MemberResponseDTO.fromEntity(head), members);
    }

    /**
     * Adds a new adult or minor family member to an existing family head after
     * initial registration — dispatches to the same registration logic used at
     * signup time (independent billing for adults, guardian-billed for minors —
     * unless the head's plan is family_head billing mode, in which case every
     * new member is guardian-billed regardless of isMinor). No receipt is created
     * here — the added member is picked up by the next family renewal invoice
     * (see renewFamily), matching how adding a minor has always worked.
     */
    public MemberResponseDTO addFamilyMember(Long headId, FamilyMemberDTO fm) {
        Member head = memberRepository.findById(headId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + headId));
        if (fm.getName() == null || fm.getName().isBlank()) {
            throw new IllegalArgumentException("Family member name is required.");
        }
        if (!Boolean.TRUE.equals(head.getIsFamilyHead())) {
            head.setIsFamilyHead(true);
            head = memberRepository.save(head);
        }

        MembershipPlan headPlan = head.getMembershipPlan() != null
                ? planRepository.findByName(head.getMembershipPlan()).orElse(null) : null;
        boolean familyHeadBillingMode = headPlan != null
                && "family_head".equalsIgnoreCase(headPlan.getFamilyBillingMode());
        List<Member> existingDependents = memberRepository.findByFamilyHeadId(head.getMemberId());

        // Same Couple constraint enforced in createMember() (exactly one connected
        // adult, never a minor) — Couple plans never configure maxAdultMembers/
        // maxFamilyMembers (that UI is Family-only), so enforceFamilyMemberCaps
        // below is a no-op for Couple and this is the only thing stopping a second
        // member being added to a couple via this endpoint.
        if ("Couple".equalsIgnoreCase(head.getMembershipType())) {
            if (!existingDependents.isEmpty()) {
                throw new IllegalArgumentException("Couple membership allows only one connected member.");
            }
            if (Boolean.TRUE.equals(fm.getIsMinor())) {
                throw new IllegalArgumentException("Couple membership only supports an adult connected member.");
            }
        }

        if (headPlan != null) {
            boolean newIsMinor = Boolean.TRUE.equals(fm.getIsMinor());
            long adultCount = 1 + existingDependents.stream().filter(m -> !Boolean.TRUE.equals(m.getIsMinor())).count()
                    + (newIsMinor ? 0 : 1);
            long childCount = existingDependents.stream().filter(m -> Boolean.TRUE.equals(m.getIsMinor())).count()
                    + (newIsMinor ? 1 : 0);
            enforceFamilyMemberCaps(headPlan, adultCount, childCount);
        }

        if (familyHeadBillingMode || Boolean.TRUE.equals(fm.getIsMinor())) {
            // Fee here is informational only (their share of the one combined family
            // invoice, shown on their own record) — nothing is billed at this point;
            // the real amount is recalculated fresh at the next renewFamily() call.
            BigDecimal informationalFee = familyHeadBillingMode
                    ? memberPriceForIndex(headPlan, existingDependents.size() + 1)
                    : fm.getMinorFee();
            createBilledToHeadRecord(fm, head, informationalFee);
        } else {
            registerFamilyAdult(fm, head);
        }
        List<Member> dependents = memberRepository.findByFamilyHeadId(head.getMemberId());
        Member added = dependents.stream()
                .max((a, b) -> a.getId().compareTo(b.getId()))
                .orElseThrow(() -> new EntityNotFoundException("Failed to create family member"));
        return MemberResponseDTO.fromEntity(added);
    }

    public MemberResponseDTO freezeMember(Long id, FreezeRequestDTO request) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + id));
        LocalDateTime freezeUntil = parseDateTime(request.getFreezeUntil());
        member.setMembershipStatus("frozen");
        member.setFreezeStartDate(LocalDateTime.now());
        member.setFreezeEndDate(freezeUntil);
        if (request.getReason() != null) member.setFreezeReason(request.getReason());
        Member saved = memberRepository.save(member);
        cascadeFreezeStateToBilledToHeadDependents(saved, "frozen", freezeUntil, request.getReason(), 0);

        notificationService.notifyRoles(
                List.of("ADMIN", "MANAGER"),
                "Membership Frozen",
                saved.getName() + "'s membership has been frozen.",
                "WARNING", "MEDIUM", "MEMBERS",
                saved.getId(), "/members",
                "MEMBER_FROZEN_" + saved.getId()
        );
        if (saved.getUserId() != null) {
            notificationService.notifyUser(
                    saved.getUserId(),
                    "Your Membership is Frozen",
                    "Your membership has been temporarily frozen" +
                    (request.getReason() != null ? ": " + request.getReason() : "."),
                    "WARNING", "MEDIUM", "MEMBERS",
                    saved.getId(), "/member-hub",
                    "MEMBER_FROZEN_USER_" + saved.getId()
            );
        }
        return MemberResponseDTO.fromEntity(saved);
    }

    public MemberResponseDTO unfreezeMember(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + id));

        long daysFrozen = 0;
        if ("frozen".equalsIgnoreCase(member.getMembershipStatus()) && member.getFreezeStartDate() != null) {
            daysFrozen = java.time.temporal.ChronoUnit.DAYS.between(member.getFreezeStartDate(), LocalDateTime.now());
            if (daysFrozen > 0) {
                if (member.getExpiryDate() != null) {
                    member.setExpiryDate(member.getExpiryDate().plusDays(daysFrozen));
                }
                if (member.getMembershipEndDate() != null) {
                    member.setMembershipEndDate(member.getMembershipEndDate().plusDays(daysFrozen));
                }
                if (member.getNextPaymentDate() != null) {
                    member.setNextPaymentDate(member.getNextPaymentDate().plusDays(daysFrozen));
                }
            }
        }

        member.setMembershipStatus("active");
        member.setFreezeStartDate(null);
        member.setFreezeEndDate(null);
        member.setFreezeReason(null);
        Member saved = memberRepository.save(member);
        cascadeFreezeStateToBilledToHeadDependents(saved, "active", null, null, daysFrozen);

        notificationService.notifyRoles(
                List.of("ADMIN", "MANAGER"),
                "Membership Unfrozen",
                saved.getName() + "'s membership has been reactivated.",
                "SUCCESS", "LOW", "MEMBERS",
                saved.getId(), "/members",
                "MEMBER_UNFROZEN_" + saved.getId()
        );
        if (saved.getUserId() != null) {
            notificationService.notifyUser(
                    saved.getUserId(),
                    "Your Membership is Active",
                    "Your membership has been reactivated. Welcome back!",
                    "SUCCESS", "MEDIUM", "MEMBERS",
                    saved.getId(), "/member-hub",
                    "MEMBER_UNFROZEN_USER_" + saved.getId()
            );
        }
        return MemberResponseDTO.fromEntity(saved);
    }

    /**
     * Freezing/unfreezing a family/couple HEAD used to only ever touch that one
     * Member row — a billed-to-head dependent (minor, or an adult under
     * family_head billing) has no independent membershipStatus of their own to
     * freeze, so they silently kept "active" and could keep checking in after
     * the paying head was frozen. This mirrors renewFamily(), which already
     * propagates the new expiry to dependents the same way.
     *
     * Independently-billed adult dependents (individual-mode Family/Couple) are
     * deliberately NOT touched — they manage their own membership/freeze status.
     */
    private void cascadeFreezeStateToBilledToHeadDependents(Member head, String status,
                                                             LocalDateTime freezeUntil, String reason, long daysFrozen) {
        if (!Boolean.TRUE.equals(head.getIsFamilyHead()) || head.getMemberId() == null) return;
        List<Member> dependents = memberRepository.findByFamilyHeadId(head.getMemberId());
        for (Member dep : dependents) {
            if (!dep.isEffectivelyBilledToHead()) continue;
            dep.setMembershipStatus(status);
            if ("frozen".equals(status)) {
                dep.setFreezeStartDate(LocalDateTime.now());
                dep.setFreezeEndDate(freezeUntil);
                if (reason != null) dep.setFreezeReason(reason);
            } else {
                if (daysFrozen > 0) {
                    if (dep.getExpiryDate() != null) {
                        dep.setExpiryDate(dep.getExpiryDate().plusDays(daysFrozen));
                    }
                    if (dep.getMembershipEndDate() != null) {
                        dep.setMembershipEndDate(dep.getMembershipEndDate().plusDays(daysFrozen));
                    }
                    if (dep.getNextPaymentDate() != null) {
                        dep.setNextPaymentDate(dep.getNextPaymentDate().plusDays(daysFrozen));
                    }
                }
                dep.setFreezeStartDate(null);
                dep.setFreezeEndDate(null);
                dep.setFreezeReason(null);
            }
            memberRepository.save(dep);
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Apply non-null fields from the request DTO onto the entity.
     * Null fields are skipped so partial updates (PUT) work correctly.
     */
    private void applyRequest(MemberRequestDTO r, Member m) {
        if (r.getName()                != null) m.setName(r.getName());
        if (r.getEmail()               != null) m.setEmail(r.getEmail());
        if (r.getPhone()               != null) m.setPhone(r.getPhone());
        if (r.getMembershipType()      != null) m.setMembershipType(r.getMembershipType());
        if (r.getMembershipStatus()    != null) m.setMembershipStatus(r.getMembershipStatus());
        if (r.getMembershipPlan()      != null) m.setMembershipPlan(r.getMembershipPlan());
        if (r.getJoinDate()            != null) m.setJoinDate(parseDateTime(r.getJoinDate()));
        if (r.getMembershipStartDate() != null) m.setMembershipStartDate(parseDateTime(r.getMembershipStartDate()));
        if (r.getMembershipEndDate()   != null) m.setMembershipEndDate(parseDateTime(r.getMembershipEndDate()));
        if (r.getExpiryDate()          != null) m.setExpiryDate(parseDateTime(r.getExpiryDate()));
        if (r.getMonthlyFee()          != null) m.setMonthlyFee(r.getMonthlyFee());
        if (r.getMembershipFee()       != null) m.setMembershipFee(r.getMembershipFee());
        if (r.getTotalVisits()         != null) m.setTotalVisits(r.getTotalVisits());
        if (r.getPaymentStatus()       != null) m.setPaymentStatus(r.getPaymentStatus());
        if (r.getEmergencyContact()    != null) m.setEmergencyContact(r.getEmergencyContact());
        if (r.getEmergencyPhone()      != null) m.setEmergencyPhone(r.getEmergencyPhone());
        if (r.getEmergencyContactName()!= null) m.setEmergencyContactName(r.getEmergencyContactName());
        if (r.getEmergencyContactPhone()!= null) m.setEmergencyContactPhone(r.getEmergencyContactPhone());
        if (r.getDateOfBirth()         != null) m.setDateOfBirth(parseDate(r.getDateOfBirth()));
        if (r.getBloodType()           != null) m.setBloodType(r.getBloodType());
        if (r.getMedicalConditions()   != null) m.setMedicalConditions(r.getMedicalConditions());
        if (r.getAllergies()           != null) m.setAllergies(r.getAllergies());
        if (r.getCurrentMedications()  != null) m.setCurrentMedications(r.getCurrentMedications());
        if (r.getHealthNotes()         != null) m.setHealthNotes(r.getHealthNotes());
        if (r.getGender()              != null) m.setGender(r.getGender());
        if (r.getNationality()         != null) m.setNationality(r.getNationality());
        if (r.getAddress()             != null) m.setAddress(r.getAddress());
        if (r.getPhotoUrl()            != null) m.setPhotoUrl(r.getPhotoUrl());
        if (r.getChronicIllnesses()    != null) m.setChronicIllnesses(r.getChronicIllnesses());
        if (r.getHeight()              != null) m.setHeight(r.getHeight());
        if (r.getWeight()              != null) m.setWeight(r.getWeight());
        if (r.getRegDocNumber()        != null) m.setRegDocNumber(r.getRegDocNumber());
        if (r.getRegDocDate()          != null) m.setRegDocDate(parseDateTime(r.getRegDocDate()));
        if (r.getOutstandingBalance()  != null) m.setOutstandingBalance(r.getOutstandingBalance());
        if (r.getLastPaymentDate()     != null) m.setLastPaymentDate(parseDateTime(r.getLastPaymentDate()));
        if (r.getNextPaymentDate()     != null) m.setNextPaymentDate(parseDateTime(r.getNextPaymentDate()));
        if (r.getPaymentMethodUsed()   != null) m.setPaymentMethodUsed(r.getPaymentMethodUsed());
        if (r.getDiscountApplied()     != null) m.setDiscountApplied(r.getDiscountApplied());
        if (r.getIsFamilyHead()        != null) m.setIsFamilyHead(r.getIsFamilyHead());
        if (r.getFamilyHeadId()        != null) m.setFamilyHeadId(r.getFamilyHeadId());
        if (r.getRelationshipToHead()  != null) m.setRelationshipToHead(r.getRelationshipToHead());
    }

    /**
     * Build a JPA Specification from optional filter parameters.
     * Only non-blank filters are added as predicates.
     */
    private Specification<Member> buildSpec(String search, String status,
                                            String membershipType, String paymentStatus) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("email")), pattern),
                        cb.like(cb.lower(root.get("phone")), pattern),
                        cb.like(cb.lower(root.get("memberId")), pattern)
                ));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("membershipStatus"), status));
            }
            if (membershipType != null && !membershipType.isBlank()) {
                predicates.add(cb.equal(root.get("membershipType"), membershipType));
            }
            if (paymentStatus != null && !paymentStatus.isBlank()) {
                predicates.add(cb.equal(root.get("paymentStatus"), paymentStatus));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    // ── Expiry computation ──────────────────────────────────────────────────

    private LocalDateTime computeExpiry(LocalDateTime startDate, MembershipPlan plan) {
        if (plan.getDurationValue() == null || plan.getDurationType() == null) return startDate;
        try {
            long val = Long.parseLong(plan.getDurationValue());
            switch (plan.getDurationType().toLowerCase()) {
                case "monthly":
                case "months":   return startDate.plusMonths(val);
                case "annual":
                case "annually":
                case "years":    return startDate.plusYears(val);
                case "weekly":
                case "weeks":    return startDate.plusWeeks(val);
                case "quarterly": return startDate.plusMonths(val * 3);
                default:         return startDate.plusDays(val);
            }
        } catch (NumberFormatException e) {
            return startDate;
        }
    }

    // ── Family head name resolution ─────────────────────────────────────────

    private void resolveFamilyHeadNames(List<MemberResponseDTO> dtos) {
        List<String> headIds = dtos.stream()
                .map(MemberResponseDTO::getFamilyHeadId)
                .filter(id -> id != null && !id.isBlank())
                .distinct()
                .collect(Collectors.toList());
        if (headIds.isEmpty()) return;
        Map<String, String> idToName = memberRepository.findAllByMemberIdIn(headIds).stream()
                .collect(Collectors.toMap(Member::getMemberId, Member::getName));
        dtos.forEach(dto -> {
            if (dto.getFamilyHeadId() != null) {
                dto.setFamilyHeadName(idToName.get(dto.getFamilyHeadId()));
            }
        });
    }

    // ── Date parsers ────────────────────────────────────────────────────────

    private LocalDateTime parseDateTime(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            // Remove trailing Z and parse as local date-time
            String normalized = raw.endsWith("Z") ? raw.substring(0, raw.length() - 1) : raw;
            return LocalDateTime.parse(normalized, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (DateTimeParseException e) {
            // Try date-only format "YYYY-MM-DD"
            try {
                return LocalDate.parse(raw.substring(0, 10)).atStartOfDay();
            } catch (DateTimeParseException ignored) {
                return null;
            }
        }
    }

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return LocalDate.parse(raw.substring(0, 10));
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }
}
