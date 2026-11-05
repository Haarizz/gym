package com.company.project.services;

import com.company.project.dto.ReceiptAddonItemDTO;
import com.company.project.dto.RegistrationAddonDTO;
import com.company.project.entities.AddonPlan;
import com.company.project.entities.Facility;
import com.company.project.entities.FacilityRate;
import com.company.project.entities.Receipt;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.AddonPlanRepository;
import com.company.project.repositories.FacilityRepository;
import com.company.project.repositories.MemberAddonRepository;
import com.company.project.repositories.ReceiptRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RegistrationAddonServiceTest {

    private final AddonPlanRepository plans = mock(AddonPlanRepository.class);
    private final FacilityRepository facilities = mock(FacilityRepository.class);
    private final RegistrationAddonService service =
            new RegistrationAddonService(plans, facilities, mock(MemberAddonRepository.class));

    private static RegistrationAddonDTO plan(long id) {
        RegistrationAddonDTO r = new RegistrationAddonDTO();
        r.setAddonPlanId(id);
        return r;
    }

    private static RegistrationAddonDTO facility(long id, String rate, Integer qty) {
        RegistrationAddonDTO r = new RegistrationAddonDTO();
        r.setFacilityId(id);
        r.setRateType(rate);
        r.setQuantity(qty);
        return r;
    }

    @Test
    void pricesComeFromTheCatalogueNotTheClient() {
        AddonPlan pt = new AddonPlan();
        pt.setId(1L);
        pt.setName("Personal Training");
        pt.setPrice(new BigDecimal("300"));
        pt.setValidity(30);
        pt.setIsActive(true);
        when(plans.findById(1L)).thenReturn(Optional.of(pt));

        Facility pool = new Facility();
        pool.setId(5L);
        pool.setName("Pool");
        pool.setStatus("Active");
        pool.setRates(List.of(new FacilityRate(pool, "Per Hour", new BigDecimal("20")),
                new FacilityRate(pool, "Per Month", new BigDecimal("150"))));
        when(facilities.findById(5L)).thenReturn(Optional.of(pool));

        List<RegistrationAddonService.Line> lines = service.price(List.of(plan(1), facility(5, null, 3)));

        assertEquals(new BigDecimal("300.00"), lines.get(0).amount());
        assertEquals(30, lines.get(0).days());
        // No rate given → the monthly rate; 3 months = 3 × 150, valid 90 days.
        assertEquals("Pool · Per Month × 3", lines.get(1).name());
        assertEquals(new BigDecimal("450.00"), lines.get(1).amount());
        assertEquals(90, lines.get(1).days());
        assertEquals(RegistrationAddonService.FACILITY_CATEGORY, lines.get(1).category());
        assertEquals(new BigDecimal("750.00"), RegistrationAddonService.total(lines));
    }

    @Test
    void inactiveAddonIsRefused() {
        AddonPlan old = new AddonPlan();
        old.setId(2L);
        old.setName("Old Sauna Pass");
        old.setPrice(BigDecimal.TEN);
        old.setIsActive(false);
        when(plans.findById(2L)).thenReturn(Optional.of(old));
        assertThrows(BusinessRuleViolationException.class, () -> service.price(List.of(plan(2))));
    }

    @Test
    void theSameAddonOrFacilityTwiceIsRefused() {
        AddonPlan pt = new AddonPlan();
        pt.setId(1L);
        pt.setName("PT");
        pt.setPrice(new BigDecimal("20"));
        pt.setIsActive(true);
        when(plans.findById(1L)).thenReturn(Optional.of(pt));
        Facility pool = new Facility();
        pool.setId(5L);
        pool.setName("Pool");
        pool.setStatus("Active");
        pool.setRates(List.of(new FacilityRate(pool, "Per Hour", new BigDecimal("10"))));
        when(facilities.findById(5L)).thenReturn(Optional.of(pool));

        assertThrows(BusinessRuleViolationException.class, () -> service.price(List.of(plan(1), plan(1))));
        assertThrows(BusinessRuleViolationException.class,
                () -> service.price(List.of(facility(5, "Per Hour", 1), facility(5, "Per Hour", 2))));
        assertEquals(2, service.price(List.of(plan(1), facility(5, "Per Hour", 1))).size());
    }

    @Test
    void facilityValidityByRate() {
        assertEquals(60, RegistrationAddonService.daysFor("Per Month", 2));
        assertEquals(3, RegistrationAddonService.daysFor("Per Full Day", 3));
        assertEquals(1, RegistrationAddonService.daysFor("Per Hour", 4));
    }

    @Test
    void ledgerSplitsTheAddonShareOfACombinedReceiptAndItsSettlements() {
        Receipt bill = new Receipt();
        bill.setId(9L);
        bill.setTransactionType("New");
        bill.setAmount(new BigDecimal("400"));   // 300 membership + 100 add-on
        bill.setAddonItems(List.of(new ReceiptAddonItemDTO(1L, "Locker", "Add-on", new BigDecimal("100"), null, null)));

        FinancialEventService fes = Mockito.mock(FinancialEventService.class, Mockito.CALLS_REAL_METHODS);
        ReceiptRepository receipts = mock(ReceiptRepository.class);
        when(receipts.findById(9L)).thenReturn(Optional.of(bill));
        fes.setReceiptRepository(receipts);

        assertEquals(0, new BigDecimal("0.25").compareTo(fes.addonShareOf(bill)));

        Receipt settlement = new Receipt();
        settlement.setTransactionType("Payment");
        settlement.setLinkedBillId(9L);
        assertEquals(0, new BigDecimal("0.25").compareTo(fes.addonShareOf(settlement)));

        // A cancelled line no longer counts.
        bill.getAddonItems().get(0).setCancelled(true);
        assertEquals(0, BigDecimal.ZERO.compareTo(fes.addonShareOf(bill)));

        Receipt plain = new Receipt();
        plain.setAmount(new BigDecimal("200"));
        assertEquals(0, BigDecimal.ZERO.compareTo(fes.addonShareOf(plain)));
    }
}
