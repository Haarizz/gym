package com.company.project.services.mobile.dashboard.admin;

import com.company.project.dto.mobile.dashboard.admin.AdminDashboardPaymentMixItemDTO;
import com.company.project.repositories.ReceiptRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Payment-method breakdown for money actually collected in the selected window,
 * reusing {@code ReceiptRepository.getPaymentMethodBreakdown} — the same
 * existing query already used for the collections ledger, so this always
 * reconciles with the Total Collections KPI (same underlying rows, same
 * cash-basis paidAmount field).
 */
@Service
public class AdminDashboardPaymentMixService {

    private final ReceiptRepository receiptRepository;

    public AdminDashboardPaymentMixService(ReceiptRepository receiptRepository) {
        this.receiptRepository = receiptRepository;
    }

    public List<AdminDashboardPaymentMixItemDTO> getPaymentMix(AdminDashboardFilterContext ctx) {
        List<Object[]> rows = receiptRepository.getPaymentMethodBreakdown(
                ctx.getDateRange().getStart(), ctx.getDateRange().getEnd());

        BigDecimal total = rows.stream()
                .map(r -> (BigDecimal) r[2])
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<AdminDashboardPaymentMixItemDTO> mix = new ArrayList<>();
        for (Object[] row : rows) {
            String mode = row[0] != null ? (String) row[0] : "Unspecified";
            BigDecimal amount = (BigDecimal) row[2];
            double percentage = total.compareTo(BigDecimal.ZERO) == 0
                    ? 0.0
                    : amount.multiply(BigDecimal.valueOf(100)).divide(total, 2, RoundingMode.HALF_UP).doubleValue();
            mix.add(new AdminDashboardPaymentMixItemDTO(mode, amount, percentage));
        }
        mix.sort((a, b) -> b.getAmount().compareTo(a.getAmount()));
        return mix;
    }
}
