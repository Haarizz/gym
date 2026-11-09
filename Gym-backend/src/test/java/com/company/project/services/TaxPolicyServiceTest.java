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

    /** A policy whose branch 1 has the given TRN / VAT switch (null = never set). */
    private static TaxPolicyService policy(String trn, String vatRegistered) {
        com.company.project.repositories.FinancialSettingRepository repo =
                org.mockito.Mockito.mock(com.company.project.repositories.FinancialSettingRepository.class);
        org.mockito.Mockito.when(repo.findBySettingKeyAndBranchId(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyLong()))
                .thenReturn(java.util.Optional.empty());
        java.util.function.BiConsumer<String, String> put = (key, value) -> {
            if (value == null) return;
            com.company.project.entities.FinancialSetting s = new com.company.project.entities.FinancialSetting();
            s.setSettingKey(key); s.setSettingValue(value); s.setBranchId(1L); s.setIsActive(true);
            org.mockito.Mockito.when(repo.findBySettingKeyAndBranchId(key, 1L)).thenReturn(java.util.Optional.of(s));
        };
        put.accept(TaxPolicyService.KEY_TRN, trn);
        put.accept(TaxPolicyService.KEY_VAT_REGISTERED, vatRegistered);
        return new TaxPolicyService(repo, org.mockito.Mockito.mock(BranchSettingsResolver.class));
    }

    @Test
    void aBranchWithoutTrnIsNotVatRegistered() {
        org.junit.jupiter.api.Assertions.assertFalse(policy(null, null).vatRegistered(1L));
        org.junit.jupiter.api.Assertions.assertFalse(policy(null, "true").vatRegistered(1L));
        org.junit.jupiter.api.Assertions.assertFalse(policy("   ", "true").vatRegistered(1L));
    }

    @Test
    void aBranchWithTrnFollowsTheSwitch() {
        org.junit.jupiter.api.Assertions.assertTrue(policy("100123456700003", null).vatRegistered(1L));
        org.junit.jupiter.api.Assertions.assertTrue(policy("100123456700003", "true").vatRegistered(1L));
        org.junit.jupiter.api.Assertions.assertFalse(policy("100123456700003", "false").vatRegistered(1L));
    }

    @Test
    void withoutBranchRatesTheProductRateApplies() {
        TaxPolicyService.TaxDefaults d = registered(null, null);
        assertEquals(new BigDecimal("5.00"), TaxPolicyService.resolve(d, product("5", true), true));
    }
}
