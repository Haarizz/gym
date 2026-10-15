package com.company.project.services;

import com.company.project.entities.CommissionRule;
import com.company.project.entities.SaleTransaction;
import com.company.project.entities.Staff;
import com.company.project.repositories.CommissionRuleRepository;
import com.company.project.repositories.LeadRepository;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.repositories.SaleTransactionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class StaffProgressCalculatorPosCommissionTest {

    private final SaleTransactionRepository sales = mock(SaleTransactionRepository.class);
    private final CommissionRuleRepository rules = mock(CommissionRuleRepository.class);
    private final StaffProgressCalculator calculator = new StaffProgressCalculator(
            mock(ReceiptRepository.class), mock(LeadRepository.class), rules, sales,
            mock(com.company.project.repositories.SaleTransactionItemRepository.class),
            mock(com.company.project.repositories.TrainingSessionRepository.class));

    private static final LocalDateTime START = LocalDateTime.of(2026, 10, 1, 0, 0);
    private static final LocalDateTime END = LocalDateTime.of(2026, 11, 1, 0, 0);

    private static SaleTransaction sale(String total, String refunded) {
        SaleTransaction s = new SaleTransaction();
        s.setTotalAmount(new BigDecimal(total));
        s.setRefundedAmount(new BigDecimal(refunded));
        return s;
    }

    private static CommissionRule rule(String pct, String perSale) {
        CommissionRule r = new CommissionRule();
        r.setRole("Cashier");
        r.setPosCommission(pct == null ? null : new BigDecimal(pct));
        r.setPosCommissionPerSale(perSale == null ? null : new BigDecimal(perSale));
        return r;
    }

    private Staff cashier() {
        Staff s = new Staff();
        s.setRole("Cashier");
        return s;
    }

    @Test
    void percentOfNetSalePlusFixedAmountPerSale() {
        // 200 sale with 50 refunded -> net 150; 2% = 3.00, plus 1.50 per sale.
        assertEquals(new BigDecimal("4.50"),
                calculator.posCommissionOn(sale("200", "50"), Optional.of(rule("2", "1.50"))));
    }

    @Test
    void percentOnly_and_fixedOnly() {
        assertEquals(new BigDecimal("10.00"), calculator.posCommissionOn(sale("500", "0"), Optional.of(rule("2", null))));
        assertEquals(new BigDecimal("5"), calculator.posCommissionOn(sale("500", "0"), Optional.of(rule(null, "5"))));
    }

    @Test
    void sumsEveryCompletedSaleOfTheCashierInTheRange() {
        when(rules.findByRoleIgnoreCase("Cashier")).thenReturn(Optional.of(rule("5", "2")));
        when(sales.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(sale("100", "0"), sale("40", "40")));
        // 100 -> 5 + 2 = 7; fully refunded-but-still-COMPLETED 40 -> 0 + 2 = 2.
        assertEquals(new BigDecimal("9.00"), calculator.computePosCommission(cashier(), "cash1", START, END));
    }

    @Test
    void noPosRatesMeansNoPosCommissionAndNoQuery() {
        when(rules.findByRoleIgnoreCase("Cashier")).thenReturn(Optional.of(rule(null, null)));
        assertEquals(BigDecimal.ZERO, calculator.computePosCommission(cashier(), "cash1", START, END));
        verify(sales, never()).findAll(any(Specification.class), any(Sort.class));
    }

    @Test
    void posSalesCountTowardTheTargetNetOfRefunds() {
        when(sales.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(sale("100", "0"), sale("40", "10")));
        // No membership receipts (mock returns none): target revenue is POS net only.
        assertEquals(new BigDecimal("130"), calculator.computeRevenue(cashier(), "cash1", START, END));
        assertEquals(BigDecimal.ZERO, calculator.computeMembershipRevenue(cashier(), "cash1", START, END));
    }

    @Test
    void posSalesEarnOnlyThePosRateNotAlsoTheBaseRate() {
        CommissionRule r = rule("2", null);
        r.setBaseCommission(new BigDecimal("5"));
        when(rules.findByRoleIgnoreCase("Cashier")).thenReturn(Optional.of(r));
        when(sales.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(sale("100", "0")));
        // 2% of 100 = 2.00; the 5% base rate applies to membership payments only.
        assertEquals(new BigDecimal("2.00"), calculator.computeCommission(cashier(), "cash1", START, END));
    }

    @Test
    void roleWithoutAnyRuleEarnsNoPosCommission() {
        when(rules.findByRoleIgnoreCase("Cashier")).thenReturn(Optional.empty());
        assertEquals(BigDecimal.ZERO, calculator.computePosCommission(cashier(), "cash1", START, END));
    }
}
