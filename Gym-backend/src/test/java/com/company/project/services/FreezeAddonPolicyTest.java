package com.company.project.services;

import com.company.project.automation.AutomationExecutorService;
import com.company.project.controlplane.repositories.UserDirectoryRepository;
import com.company.project.dto.FreezeRequestDTO;
import com.company.project.entities.Branch;
import com.company.project.entities.Member;
import com.company.project.entities.MemberAddon;
import com.company.project.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/** Branch rule for what a freeze does to add-ons and facility access, through MemberService freeze / unfreeze. */
class FreezeAddonPolicyTest {

    @Mock private MemberRepository memberRepository;
    @Mock private MembershipPlanRepository planRepository;
    @Mock private ReceiptService receiptService;
    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private UserRoleRepository userRoleRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private NotificationService notificationService;
    @Mock private AutomationExecutorService automationExecutorService;
    @Mock private ReceiptVoucherService receiptVoucherService;
    @Mock private FinancialEventService financialEventService;
    @Mock private BranchService branchService;
    @Mock private UserBranchRepository userBranchRepository;
    @Mock private UserDirectoryRepository userDirectoryRepository;
    @Mock private RewardRedemptionService rewardRedemptionService;
    @Mock private DiscountCodeService discountCodeService;
    @Mock private MemberAddonRepository memberAddonRepository;
    @Mock private BranchRepository branchRepository;

    private MemberService service;
    private Member member;
    private Branch branch;
    private MemberAddon training;
    private MemberAddon pool;
    private final LocalDateTime addonEnd = LocalDateTime.now().plusDays(20).withNano(0);

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new MemberService(memberRepository, planRepository, receiptService, userRepository,
                roleRepository, userRoleRepository, passwordEncoder, notificationService,
                automationExecutorService, receiptVoucherService, financialEventService, branchService,
                userBranchRepository, userDirectoryRepository, rewardRedemptionService, discountCodeService, null, null, null, null);
        service.setMemberAddonRepository(memberAddonRepository);
        service.setFreezeAddonPolicy(new FreezeAddonPolicy(branchRepository));

        branch = new Branch();
        branch.setId(3L);
        when(branchRepository.findById(3L)).thenReturn(Optional.of(branch));

        member = new Member();
        member.setId(10L);
        member.setName("Sam");
        member.setBranchId(3L);
        member.setMembershipStatus("active");
        member.setExpiryDate(LocalDateTime.now().plusDays(60));
        when(memberRepository.findById(10L)).thenReturn(Optional.of(member));
        when(memberRepository.save(any(Member.class))).thenAnswer(inv -> inv.getArgument(0));

        training = addon("Personal Training", "Training", null);
        pool = addon("Swimming Pool · Per Month", "Facility", 7L);
        when(memberAddonRepository.findByMemberDbIdOrderByPurchaseDateAsc(10L)).thenReturn(List.of(training, pool));
    }

    private MemberAddon addon(String name, String category, Long facilityId) {
        MemberAddon a = new MemberAddon();
        a.setAddonName(name);
        a.setCategory(category);
        a.setFacilityId(facilityId);
        a.setStatus("Active");
        a.setExpiryDate(addonEnd);
        return a;
    }

    /** Freeze now under the branch's current rule, then unfreeze 5 days later. */
    private void freezeFiveDays() {
        FreezeRequestDTO request = new FreezeRequestDTO();
        request.setFreezeUntil(LocalDateTime.now().plusDays(10).toString());
        service.freezeMember(10L, request);
        member.setFreezeStartDate(member.getFreezeStartDate().minusDays(5));   // as if 5 days went by
        service.unfreezeMember(10L, member.getFreezeStartDate().plusDays(5));
    }

    @Test
    void byDefaultBothPauseAndGetTheFrozenDaysBack() {
        freezeFiveDays();
        assertEquals(addonEnd.plusDays(5), training.getExpiryDate());
        assertEquals(addonEnd.plusDays(5), pool.getExpiryDate());
    }

    @Test
    void addOnsPauseWhileFacilityAccessKeepsRunning() {
        branch.setFreezePausesFacilities(false);
        freezeFiveDays();
        assertEquals(addonEnd.plusDays(5), training.getExpiryDate());
        assertEquals(addonEnd, pool.getExpiryDate());
    }

    @Test
    void neitherPausesWhenTheBranchKeepsBothRunning() {
        branch.setFreezePausesAddons(false);
        branch.setFreezePausesFacilities(false);
        freezeFiveDays();
        assertEquals(addonEnd, training.getExpiryDate());
        assertEquals(addonEnd, pool.getExpiryDate());
        assertNull(member.getFreezePausesAddons(), "the recorded rule is cleared on unfreeze");
    }

    @Test
    void aFreezeKeepsTheRuleItStartedUnderWhenTheSettingChanges() {
        branch.setFreezePausesAddons(false);   // facility access pauses, add-ons don't
        FreezeRequestDTO request = new FreezeRequestDTO();
        request.setFreezeUntil(LocalDateTime.now().plusDays(10).toString());
        service.freezeMember(10L, request);
        assertFalse(member.getFreezePausesAddons());
        assertTrue(member.getFreezePausesFacilities());
        assertFalse(FreezeAddonPolicy.isPaused(member, training));
        assertTrue(FreezeAddonPolicy.isPaused(member, pool));

        branch.setFreezePausesAddons(true);   // changed mid-freeze
        branch.setFreezePausesFacilities(false);
        member.setFreezeStartDate(member.getFreezeStartDate().minusDays(5));
        service.unfreezeMember(10L, member.getFreezeStartDate().plusDays(5));
        assertEquals(addonEnd, training.getExpiryDate());
        assertEquals(addonEnd.plusDays(5), pool.getExpiryDate());
    }

    @Test
    void memberWithoutABranchUsesTheDefaultBranch() {
        member.setBranchId(null);
        Branch main = new Branch();
        main.setFreezePausesAddons(false);
        when(branchRepository.findByIsDefaultTrue()).thenReturn(Optional.of(main));
        freezeFiveDays();
        assertEquals(addonEnd, training.getExpiryDate());
        assertEquals(addonEnd.plusDays(5), pool.getExpiryDate());
    }
}
