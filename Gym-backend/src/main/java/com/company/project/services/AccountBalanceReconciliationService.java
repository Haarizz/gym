package com.company.project.services;

import com.company.project.entities.AccountHead;
import com.company.project.entities.JournalVoucher;
import com.company.project.entities.JournalVoucherLine;
import com.company.project.repositories.AccountHeadRepository;
import com.company.project.repositories.JournalVoucherLineRepository;
import com.company.project.repositories.JournalVoucherRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Daily safety net for AccountHead.currentBalance (see
 * docs/gymbios-financial-roadmap.html — H1).
 *
 * currentBalance is a stored, denormalized value that gets updated imperatively
 * from several call sites (JournalVoucherService.postJournalVoucher(),
 * JournalVoucherService.reverseJournalVoucher(), and every FinancialEventService
 * auto-journal). If any future code path ever posts a journal entry without
 * routing through FinancialEventService.updateAccountBalance() — the same class
 * of gap C1 closed for Receipt Vouchers — the stored balance silently drifts from
 * what the posted ledger actually says.
 *
 * This job recomputes each account's true balance directly from posted
 * journal_voucher_lines (the same source of truth FinancialReportService and
 * FinancialAnalyticsService already use) and logs a warning for any account
 * where the two disagree. It does NOT correct the drift automatically — silently
 * rewriting a financial balance is not a decision this job should make on its
 * own; a human should look at *why* it drifted first.
 */
@Component
public class AccountBalanceReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(AccountBalanceReconciliationService.class);

    /** Amounts are stored with 2 decimal places; anything smaller is rounding noise. */
    private static final BigDecimal TOLERANCE = new BigDecimal("0.01");

    private final AccountHeadRepository accountHeadRepository;
    private final JournalVoucherRepository journalVoucherRepository;
    private final JournalVoucherLineRepository journalVoucherLineRepository;

    public AccountBalanceReconciliationService(AccountHeadRepository accountHeadRepository,
                                               JournalVoucherRepository journalVoucherRepository,
                                               JournalVoucherLineRepository journalVoucherLineRepository) {
        this.accountHeadRepository = accountHeadRepository;
        this.journalVoucherRepository = journalVoucherRepository;
        this.journalVoucherLineRepository = journalVoucherLineRepository;
    }

    /** Runs nightly at 03:00 — after the 02:00 notification cleanup job. */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional(readOnly = true)
    public void reconcileNightly() {
        List<Drift> drifts = findDrifts();
        if (drifts.isEmpty()) {
            log.info("Account balance reconciliation: {} accounts checked, no drift found",
                    accountHeadRepository.count());
            return;
        }
        for (Drift d : drifts) {
            log.warn("Account balance drift detected: account {} ({}) stored={} computed={} diff={}",
                    d.code, d.name, d.stored, d.computed, d.stored.subtract(d.computed));
        }
        log.warn("Account balance reconciliation found {} account(s) with drift — see warnings above", drifts.size());
    }

    /** Exposed separately from the scheduled entry point so it can be called on demand (e.g. from a future admin endpoint or a test). */
    @Transactional(readOnly = true)
    public List<Drift> findDrifts() {
        Set<Long> postedJvIds = new HashSet<>();
        for (JournalVoucher jv : journalVoucherRepository.findByStatusOrderByDateDesc("POSTED")) {
            postedJvIds.add(jv.getId());
        }

        Map<String, BigDecimal> netByAccountCode = new HashMap<>();
        for (JournalVoucherLine line : journalVoucherLineRepository.findByJournalVoucherIdIn(postedJvIds)) {
            if (!postedJvIds.contains(line.getJournalVoucherId())) continue;
            String code = line.getAccountCode();
            if (code == null) continue;
            BigDecimal debit = line.getDebit() != null ? line.getDebit() : BigDecimal.ZERO;
            BigDecimal credit = line.getCredit() != null ? line.getCredit() : BigDecimal.ZERO;
            netByAccountCode.merge(code, debit.subtract(credit), BigDecimal::add);
        }

        List<Drift> drifts = new java.util.ArrayList<>();
        for (AccountHead account : accountHeadRepository.findAll()) {
            BigDecimal opening = account.getOpeningBalance() != null ? account.getOpeningBalance() : BigDecimal.ZERO;
            BigDecimal stored = account.getCurrentBalance() != null ? account.getCurrentBalance() : BigDecimal.ZERO;
            BigDecimal net = netByAccountCode.getOrDefault(account.getCode(), BigDecimal.ZERO);
            BigDecimal computed = opening.add(net);

            if (stored.subtract(computed).abs().compareTo(TOLERANCE) > 0) {
                drifts.add(new Drift(account.getCode(), account.getName(), stored, computed));
            }
        }
        return drifts;
    }

    /** One account's stored-vs-computed balance mismatch. */
    public static final class Drift {
        public final String code;
        public final String name;
        public final BigDecimal stored;
        public final BigDecimal computed;

        Drift(String code, String name, BigDecimal stored, BigDecimal computed) {
            this.code = code;
            this.name = name;
            this.stored = stored;
            this.computed = computed;
        }
    }
}
