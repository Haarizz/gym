package com.company.project.services;

import com.company.project.dto.ReceiptAddonItemDTO;
import com.company.project.dto.RegistrationAddonDTO;
import com.company.project.entities.AddonPlan;
import com.company.project.entities.Facility;
import com.company.project.entities.FacilityRate;
import com.company.project.entities.Member;
import com.company.project.entities.MemberAddon;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.AddonPlanRepository;
import com.company.project.repositories.FacilityRepository;
import com.company.project.repositories.MemberAddonRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Add-ons and facility access sold at New Member Registration, on the membership's own
 * receipt (one combined receipt — user choice, 2026-11-05). Prices always come from the
 * catalogue: an add-on plan's price, or a facility rate × quantity. Each line becomes a
 * regular MemberAddon (category "Facility" for facility access), so it expires, pauses with a
 * freeze, shows in the member's add-ons and can be cancelled on its own.
 */
@Service
public class RegistrationAddonService {

    public static final String FACILITY_CATEGORY = "Facility";

    private final AddonPlanRepository addonPlanRepository;
    private final FacilityRepository facilityRepository;
    private final MemberAddonRepository memberAddonRepository;

    public RegistrationAddonService(AddonPlanRepository addonPlanRepository,
                                    FacilityRepository facilityRepository,
                                    MemberAddonRepository memberAddonRepository) {
        this.addonPlanRepository = addonPlanRepository;
        this.facilityRepository = facilityRepository;
        this.memberAddonRepository = memberAddonRepository;
    }

    /** A priced line, before anything is saved. */
    public record Line(String name, String description, String category, BigDecimal amount, int days,
                       Long addonPlanId, Long facilityId) {}

    /** Validates and prices the chosen items; throws for an unknown/inactive item. */
    public List<Line> price(List<RegistrationAddonDTO> requests) {
        List<Line> lines = new ArrayList<>();
        if (requests == null) return lines;
        // Each add-on / facility goes on a registration once (the pickers drop chosen ones).
        java.util.Set<Long> seenPlans = new java.util.HashSet<>();
        java.util.Set<Long> seenFacilities = new java.util.HashSet<>();
        for (RegistrationAddonDTO r : requests) {
            if (r == null) continue;
            if (r.getAddonPlanId() != null) {
                AddonPlan plan = addonPlanRepository.findById(r.getAddonPlanId())
                        .orElseThrow(() -> new BusinessRuleViolationException("Add-on not found: " + r.getAddonPlanId()));
                if (!seenPlans.add(plan.getId())) {
                    throw new BusinessRuleViolationException("The add-on \"" + plan.getName() + "\" is added twice — add it once.");
                }
                if (!Boolean.TRUE.equals(plan.getIsActive())) {
                    throw new BusinessRuleViolationException("The add-on \"" + plan.getName() + "\" is no longer available.");
                }
                int days = plan.getValidity() != null && plan.getValidity() > 0 ? plan.getValidity() : 30;
                lines.add(new Line(plan.getName(), plan.getDescription(),
                        plan.getCategory() != null && !plan.getCategory().isBlank() ? plan.getCategory() : "Add-on",
                        money(plan.getPrice()), days, plan.getId(), null));
            } else if (r.getFacilityId() != null) {
                Facility facility = facilityRepository.findById(r.getFacilityId())
                        .orElseThrow(() -> new BusinessRuleViolationException("Facility not found: " + r.getFacilityId()));
                if (!seenFacilities.add(facility.getId())) {
                    throw new BusinessRuleViolationException("The facility \"" + facility.getName() + "\" is added twice — add it once with the quantity you need.");
                }
                if (facility.getStatus() != null && !"active".equalsIgnoreCase(facility.getStatus())) {
                    throw new BusinessRuleViolationException("The facility \"" + facility.getName() + "\" is not active.");
                }
                FacilityRate rate = pickRate(facility, r.getRateType());
                int qty = r.getQuantity() != null && r.getQuantity() > 0 ? r.getQuantity() : 1;
                lines.add(new Line(facility.getName() + " · " + rate.getRateType() + (qty > 1 ? " × " + qty : ""),
                        facility.getDescription(), FACILITY_CATEGORY,
                        money(rate.getRate()).multiply(BigDecimal.valueOf(qty)), daysFor(rate.getRateType(), qty),
                        null, facility.getId()));
            } else {
                throw new BusinessRuleViolationException("Choose an add-on or a facility for each extra.");
            }
        }
        return lines;
    }

    public static BigDecimal total(List<Line> lines) {
        return lines.stream().map(Line::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Saves one MemberAddon per line for the new member, starting with their membership, and
     * returns the receipt lines (ids filled in). {@code status} is "Active", or "Pending
     * Approval" when the registration's payment awaits reception approval.
     */
    public List<ReceiptAddonItemDTO> create(Member member, List<Line> lines, LocalDateTime start, String paymentMode, String status) {
        List<ReceiptAddonItemDTO> items = new ArrayList<>();
        LocalDateTime from = start != null ? start : LocalDateTime.now();
        for (Line l : lines) {
            MemberAddon a = new MemberAddon();
            a.setMemberDbId(member.getId());
            a.setMemberId(member.getMemberId());
            a.setMemberName(member.getName());
            a.setAddonName(l.name());
            a.setAddonDescription(l.description());
            a.setCategory(l.category());
            a.setAmount(l.amount());
            a.setPaymentMode(paymentMode);
            a.setPurchaseDate(LocalDateTime.now());
            a.setStartDate(from);
            a.setExpiryDate(from.plusDays(l.days()));
            a.setStatus(status);
            a.setAddonPlanId(l.addonPlanId());
            a.setFacilityId(l.facilityId());
            a.setNotes("Sold with the membership at registration");
            MemberAddon saved = memberAddonRepository.save(a);
            saved.setTransactionId("TXN-" + String.format("%010d", saved.getId()));
            saved = memberAddonRepository.save(saved);
            items.add(new ReceiptAddonItemDTO(saved.getId(), l.name(), l.category(), l.amount(),
                    from.toLocalDate().toString(), from.plusDays(l.days()).toLocalDate().toString()));
        }
        return items;
    }

    /** Points each add-on created at registration at the combined receipt. */
    public void linkReceipt(List<ReceiptAddonItemDTO> items, Long receiptId) {
        for (ReceiptAddonItemDTO item : items) {
            if (item.getMemberAddonId() == null) continue;
            memberAddonRepository.findById(item.getMemberAddonId()).ifPresent(a -> {
                a.setReceiptId(receiptId);
                memberAddonRepository.save(a);
            });
        }
    }

    private static FacilityRate pickRate(Facility facility, String rateType) {
        List<FacilityRate> rates = facility.getRates() == null ? List.of() : facility.getRates();
        if (rates.isEmpty()) throw new BusinessRuleViolationException("The facility \"" + facility.getName() + "\" has no rates.");
        if (rateType == null || rateType.isBlank()) {
            // Default to the monthly rate when there is one — the usual facility add-on.
            return rates.stream().filter(r -> "per month".equalsIgnoreCase(r.getRateType())).findFirst().orElse(rates.get(0));
        }
        return rates.stream().filter(r -> rateType.trim().equalsIgnoreCase(r.getRateType())).findFirst()
                .orElseThrow(() -> new BusinessRuleViolationException(
                        "The facility \"" + facility.getName() + "\" has no \"" + rateType + "\" rate."));
    }

    /** Validity of facility access: a month is 30 days; day and hour rates are good for the day. */
    static int daysFor(String rateType, int qty) {
        String t = rateType == null ? "" : rateType.toLowerCase(Locale.ROOT);
        if (t.contains("month")) return 30 * qty;
        if (t.contains("day")) return qty;
        return 1;
    }

    private static BigDecimal money(BigDecimal v) {
        return (v == null ? BigDecimal.ZERO : v).setScale(2, RoundingMode.HALF_UP);
    }
}
