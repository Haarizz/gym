package com.company.project.services;

import com.company.project.entities.Product;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TaxPolicyServiceTest {

    private static Product product(String rate, boolean useDefault) {
        Product p = new Product();
        p.setTaxRate(new BigDecimal(rate));
        p.setUseDefaultTax(useDefault);
        return p;
    }

    private static TaxPolicyService.TaxDefaults registered(String sales, String purchase) {
        return new TaxPolicyService.TaxDefaults(true, "100123456700003", null,
                sales == null ? null : new BigDecimal(sales), purchase == null ? null : new BigDecimal(purchase));
    }

    @Test
    void notRegisteredChargesNoTax() {
        TaxPolicyService.TaxDefaults off = new TaxPolicyService.TaxDefaults(false, null, null, new BigDecimal("5.00"), new BigDecimal("5.00"));
        assertEquals(0, BigDecimal.ZERO.compareTo(TaxPolicyService.resolve(off, product("5.00", true), true)));
        assertEquals(0, BigDecimal.ZERO.compareTo(TaxPolicyService.resolve(off, product("5.00", false), true)));
    }

    @Test
    void branchDefaultsApplyToSalesAndPurchases() {
        TaxPolicyService.TaxDefaults d = registered("5.00", "10.00");
        assertEquals(new BigDecimal("5.00"), TaxPolicyService.resolve(d, product("15.00", true), true));
        assertEquals(new BigDecimal("10.00"), TaxPolicyService.resolve(d, product("15.00", true), false));
    }

    @Test
    void aProductWithItsOwnRateOverridesTheBranch() {
        TaxPolicyService.TaxDefaults d = registered("5.00", "10.00");
        assertEquals(new BigDecimal("0.00"), TaxPolicyService.resolve(d, product("0", false), true));
        assertEquals(new BigDecimal("0.00"), TaxPolicyService.resolve(d, product("0", false), false));
    }

    @Test
    void withoutBranchRatesTheProductRateApplies() {
        TaxPolicyService.TaxDefaults d = registered(null, null);
        assertEquals(new BigDecimal("5.00"), TaxPolicyService.resolve(d, product("5", true), true));
    }
}
