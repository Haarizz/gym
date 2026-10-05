package com.company.project.services;

import com.company.project.dto.FamilyMemberDTO;
import com.company.project.dto.FamilyPlanChangeQuoteDTO;
import com.company.project.dto.FamilyPlanChangeRequestDTO;
import com.company.project.dto.RenewalRequestDTO;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipPlan;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.services.mobile.family.MobileFamilyPricingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** BG_75: staff Couple/Family renewals and plan-type changes. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class FamilyPlanChangeServiceTest {

    @Mock private MemberService memberService;
    @Mock private MemberRepository memberRepository;
    @Mock private MembershipPlanRepository planRepository;
    @Mock private MembershipFreezeService freezeService;
    @Mock private RewardRedemptionService rewardRedemptionService;

    private FamilyPlanChangeService service;
    private final Map<Long, Member> db = new HashMap<>();
    private Member head;

    private static BigDecimal bd(String v) { return new BigDecimal(v); }

    @BeforeEach
    void setUp() {
        MobileFamilyPricingService pricing = new MobileFamilyPricingService(planRepository, memberService);
        service = new FamilyPlanChangeService(memberService, memberRepository, planRepository, freezeService,
                pricing, rewardRedemptionService);

        // Real pricing/cap rules — they're pure functions of the plan.
        when(memberService.memberPriceForIndex(any(), anyInt())).thenCallRealMethod();
        doCallRealMethod().when(memberService).enforceFamilyMemberCaps(any(), anyLong(), anyLong());

        when(memberRepository.findById(anyLong())).thenAnswer(inv -> Optional.ofNullable(db.get(inv.<Long>getArgument(0))));
        when(memberRepository.save(any(Member.class))).thenAnswer(inv -> inv.getArgument(0));
        when(memberRepository.findByFamilyHeadId(anyString())).thenAnswer(inv -> {
            String headMemberId = inv.getArgument(0);
            List<Member> out = new ArrayList<>();
            db.values().forEach(m -> { if (headMemberId.equals(m.getFamilyHeadId())) out.add(m); });
            out.sort((a, b) -> a.getId().compareTo(b.getId()));
            return out;
        });

        plan("Solo", "Individual", "1000", null, null);
        plan("Duo", "Couple", "1600", "individual", null);
        plan("Family Gold", "Family", "1000", "individual", "300");
        MembershipPlan fh = plan("Family One Bill", "Family", "2500", "family_head", "700");
        fh.setAutoCalculateTotal(true);
        fh.setMaxFamilyMembers(4);
        fh.setAdditionalMemberPrice(bd("500"));

        head = member(1L, "Asha", null);
        head.setBranchId(1L);
    }

    private MembershipPlan plan(String name, String type, String price, String mode, String perMember) {
        MembershipPlan p = new MembershipPlan();
        p.setId((long) (name.hashCode() & 0xffff));
        p.setName(name);
        p.setPlanType(type);
        p.setStatus("Active");
        p.setPrice(bd(price));
        p.setFamilyBillingMode(mode);
        if (perMember != null) p.setPricePerMember(bd(perMember));
        when(planRepository.findByName(name)).thenReturn(Optional.of(p));
        return p;
    }

    private Member member(Long id, String name, Member familyHead) {
        Member m = new Member();
        m.setId(id);
        m.setMemberId("MBR-" + id);
        m.setName(name);
        m.setBranchId(1L);
        m.setExpiryDate(LocalDateTime.of(2026, 12, 31, 0, 0));
        if (familyHead != null) {
            m.setFamilyHeadId(familyHead.getMemberId());
            m.setRelationshipToHead("Spouse");
            familyHead.setIsFamilyHead(true);
        }
        db.put(id, m);
        return m;
    }

    private static FamilyMemberDTO person(String name, String relationship, boolean minor) {
        FamilyMemberDTO fm = new FamilyMemberDTO();
        fm.setName(name);
        fm.setRelationship(relationship);
        fm.setIsMinor(minor);
        return fm;
    }

    private static FamilyPlanChangeRequestDTO req(String planName) {
        FamilyPlanChangeRequestDTO r = new FamilyPlanChangeRequestDTO();
        r.setPlanName(planName);
        return r;
    }

    private static FamilyPlanChangeQuoteDTO.Line line(FamilyPlanChangeQuoteDTO q, String name) {
        return q.getLines().stream().filter(l -> name.equals(l.getName())).findFirst().orElseThrow();
    }

    @Test
    @DisplayName("Individual → Couple: new partner gets their own membership; payment fills the head's receipt first")
    void individualToCouple() {
        FamilyPlanChangeRequestDTO r = req("Duo");
        r.setNewMembers(List.of(person("Ravi", "Spouse", false)));
        r.setAmountReceived(bd("2000"));
        r.setPaymentMethod("Cash");

        FamilyPlanChangeQuoteDTO q = service.quote(1L, r);
        assertEquals(0, bd("3200").compareTo(q.getTotalDue()));
        assertEquals("OWN", line(q, "Ravi").getBilling());

        service.apply(1L, r);

        ArgumentCaptor<RenewalRequestDTO> headRenewal = ArgumentCaptor.forClass(RenewalRequestDTO.class);
        verify(memberService).renewMember(eq(1L), headRenewal.capture());
        assertEquals("Duo", headRenewal.getValue().getPlanName());
        assertEquals("Couple", headRenewal.getValue().getMembershipType());
        assertEquals(0, bd("1600").compareTo(headRenewal.getValue().getAmountReceived()));

        ArgumentCaptor<FamilyMemberDTO> partner = ArgumentCaptor.forClass(FamilyMemberDTO.class);
        verify(memberService).registerFamilyAdult(partner.capture(), any(), any());
        assertEquals(0, bd("1600").compareTo(partner.getValue().getMembershipFee()));
        assertEquals(0, bd("1200").compareTo(partner.getValue().getOutstandingBalance()));
        assertEquals("partial", partner.getValue().getPaymentStatus());
        assertTrue(head.getIsFamilyHead());
    }

    @Test
    @DisplayName("Couple allows exactly one adult")
    void coupleRules() {
        FamilyPlanChangeRequestDTO two = req("Duo");
        two.setNewMembers(List.of(person("A", "Spouse", false), person("B", "Sibling", false)));
        assertThrows(IllegalArgumentException.class, () -> service.quote(1L, two));

        FamilyPlanChangeRequestDTO child = req("Duo");
        child.setNewMembers(List.of(person("Kid", "Child", true)));
        assertThrows(IllegalArgumentException.class, () -> service.quote(1L, child));

        assertThrows(IllegalArgumentException.class, () -> service.quote(1L, req("Duo")));
    }

    @Test
    @DisplayName("Family → Couple: unticked members are detached and keep their paid period")
    void familyToCoupleDetaches() {
        Member spouse = member(2L, "Ravi", head);
        Member kid = member(3L, "Mira", head);
        kid.setIsMinor(true);
        kid.setBilledToHead(true);
        head.setMembershipPlan("Family Gold");

        FamilyPlanChangeRequestDTO r = req("Duo");
        r.setKeepMemberIds(List.of(2L));
        FamilyPlanChangeQuoteDTO q = service.quote(1L, r);
        assertEquals("DETACH", line(q, "Mira").getAction());
        assertEquals("NONE", line(q, "Ravi").getBilling()); // already pays for their own

        service.apply(1L, r);

        assertNull(kid.getFamilyHeadId());
        assertFalse(kid.getBilledToHead());
        assertEquals("Individual", kid.getMembershipType());
        assertEquals(LocalDateTime.of(2026, 12, 31, 0, 0), kid.getExpiryDate()); // period kept
        assertEquals("MBR-1", spouse.getFamilyHeadId());
    }

    @Test
    @DisplayName("Couple → Individual: everyone detached and the head stops being a family head")
    void coupleToIndividual() {
        Member spouse = member(2L, "Ravi", head);
        FamilyPlanChangeRequestDTO r = req("Solo");

        FamilyPlanChangeQuoteDTO q = service.quote(1L, r);
        assertEquals(0, bd("1000").compareTo(q.getTotalDue()));

        service.apply(1L, r);
        assertNull(spouse.getFamilyHeadId());
        assertFalse(head.getIsFamilyHead());
        verify(memberService).renewMember(eq(1L), argThat(x -> "Solo".equals(x.getPlanName())));
    }

    @Test
    @DisplayName("An individual plan can't carry family members")
    void individualPlanRejectsMembers() {
        FamilyPlanChangeRequestDTO r = req("Solo");
        r.setNewMembers(List.of(person("Ravi", "Spouse", false)));
        assertThrows(IllegalArgumentException.class, () -> service.quote(1L, r));
    }

    @Test
    @DisplayName("Couple → Family (one invoice): everyone on the head's bill, priced per member")
    void coupleToFamilyHeadBilling() {
        Member spouse = member(2L, "Ravi", head);
        FamilyPlanChangeRequestDTO r = req("Family One Bill");
        r.setNewMembers(List.of(person("Mira", "Child", true)));
        r.setAmountReceived(bd("2100"));
        r.setPaymentMethod("Card");

        FamilyPlanChangeQuoteDTO q = service.quote(1L, r);
        assertTrue(q.isFamilyHeadBilling());
        assertEquals(0, bd("2100").compareTo(q.getTotalDue())); // 3 × 700
        assertEquals("HEAD", line(q, "Ravi").getBilling());

        service.apply(1L, r);
        assertTrue(spouse.getBilledToHead());
        verify(memberService).renewMember(eq(1L), argThat(x -> bd("2100").compareTo(x.getMembershipFee()) == 0
                && x.getMinorCharges() != null && x.getMinorCharges().size() == 2));
        verify(memberService).createBilledToHeadRecord(argThat(fm -> "Mira".equals(fm.getName())), any(),
                argThat(fee -> bd("700").compareTo(fee) == 0), any());
        verify(memberService, never()).registerFamilyAdult(any(), any(), any());
    }

    @Test
    @DisplayName("Family caps still apply (extra members beyond the cap use the additional price)")
    void familyCapPricing() {
        FamilyPlanChangeRequestDTO r = req("Family One Bill");
        r.setNewMembers(List.of(person("A", "Child", true), person("B", "Child", true),
                person("C", "Child", true), person("D", "Child", true)));
        FamilyPlanChangeQuoteDTO q = service.quote(1L, r);
        // head + 3 within cap of 4 at 700, 5th at 500
        assertEquals(0, bd("3300").compareTo(q.getTotalDue()));
    }

    @Test
    @DisplayName("Linking an existing member: must not be in another family or owe money for the family invoice")
    void linkValidation() {
        Member other = member(9L, "Other head", null);
        Member taken = member(5L, "Taken", other);
        FamilyPlanChangeRequestDTO r = req("Duo");
        FamilyPlanChangeRequestDTO.LinkMemberDTO link = new FamilyPlanChangeRequestDTO.LinkMemberDTO();
        link.setMemberId(5L);
        link.setRelationship("Spouse");
        r.setLinkMembers(List.of(link));
        assertThrows(BusinessRuleViolationException.class, () -> service.quote(1L, r));

        taken.setFamilyHeadId(null);
        taken.setOutstandingBalance(bd("250"));
        FamilyPlanChangeRequestDTO onBill = req("Family One Bill");
        onBill.setLinkMembers(List.of(link));
        assertThrows(BusinessRuleViolationException.class, () -> service.quote(1L, onBill));

        // Individual billing: a linked adult keeps their own membership, no balance check needed.
        FamilyPlanChangeQuoteDTO q = service.quote(1L, r);
        assertEquals("NONE", line(q, "Taken").getBilling());
    }

    @Test
    @DisplayName("A family member can't be renewed as if they were the head")
    void dependentCannotBeHead() {
        member(2L, "Ravi", head);
        assertThrows(BusinessRuleViolationException.class, () -> service.quote(2L, req("Duo")));
    }
}
