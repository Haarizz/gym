package com.company.project.services;

import com.company.project.dto.AutoMatchSuggestionDTO;
import com.company.project.dto.BankReconciliationRequestDTO;
import com.company.project.dto.BankReconciliationResponseDTO;
import com.company.project.dto.BankStatementLineDTO;
import com.company.project.dto.MatchCandidateDTO;
import com.company.project.entities.AccountHead;
import com.company.project.entities.BankReconciliation;
import com.company.project.entities.BankStatementLine;
import com.company.project.entities.JournalVoucher;
import com.company.project.entities.JournalVoucherLine;
import com.company.project.repositories.AccountHeadRepository;
import com.company.project.repositories.BankReconciliationRepository;
import com.company.project.repositories.BankStatementLineRepository;
import com.company.project.repositories.JournalVoucherLineRepository;
import com.company.project.repositories.JournalVoucherRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class BankReconciliationService {

    /**
     * Fallback bank ledger account for reconciliations whose bankAccountName doesn't resolve to a
     * real AccountHead (e.g. legacy free-text rows entered before per-bank matching existed). Every
     * reconciliation created against a real Chart-of-Accounts bank account is instead checked
     * against *that specific account's* code — see {@link #resolveBankAccountCode(String)}. Without
     * this resolution, a gym with more than one real bank account would have every reconciliation
     * silently checked against the same generic bucket regardless of which bank was selected.
     */
    private static final String BANK_ACCOUNT_CODE = FinancialEventService.ACC_CASH_AT_BANK;

    /** How many days on either side of a statement line's date to look for a matching posted entry. */
    private static final int MATCH_WINDOW_DAYS = 30;

    /** Amounts are stored with 2 decimal places; anything smaller is rounding noise. */
    private static final BigDecimal AMOUNT_TOLERANCE = new BigDecimal("0.01");

    private static final int MAX_CANDIDATES = 25;

    /**
     * Statuses whose ledger effect must count toward a bank account's balance.
     * A REVERSED voucher's original lines are NOT retroactively voided — the
     * offsetting entry is a separate, newly POSTED reversal voucher — so both
     * must be included or a reversed transaction ends up counted with its sign
     * flipped instead of netting to zero. See {@link #loadLedgerEffectiveVouchers()}.
     */
    private static final List<String> LEDGER_EFFECTIVE_STATUSES = List.of("POSTED", "REVERSED");

    private final BankReconciliationRepository reconciliationRepository;
    private final BankStatementLineRepository lineRepository;
    private final AccountHeadRepository accountHeadRepository;
    private final JournalVoucherRepository journalVoucherRepository;
    private final JournalVoucherLineRepository journalVoucherLineRepository;

    public BankReconciliationService(BankReconciliationRepository reconciliationRepository,
                                     BankStatementLineRepository lineRepository,
                                     AccountHeadRepository accountHeadRepository,
                                     JournalVoucherRepository journalVoucherRepository,
                                     JournalVoucherLineRepository journalVoucherLineRepository) {
        this.reconciliationRepository = reconciliationRepository;
        this.lineRepository = lineRepository;
        this.accountHeadRepository = accountHeadRepository;
        this.journalVoucherRepository = journalVoucherRepository;
        this.journalVoucherLineRepository = journalVoucherLineRepository;
    }

    @Transactional(readOnly = true)
    public List<BankReconciliationResponseDTO> getAll(String bankAccountName) {
        List<BankReconciliation> all = bankAccountName != null && !bankAccountName.isBlank()
                ? reconciliationRepository.findByBankAccountNameOrderByStatementDateDesc(bankAccountName)
                : reconciliationRepository.findAllByOrderByStatementDateDesc();

        return all.stream().map(r -> {
            List<BankStatementLineDTO> lines = lineRepository
                    .findByReconciliationIdOrderByTransactionDateAsc(r.getId())
                    .stream().map(BankStatementLineDTO::fromEntity).collect(Collectors.toList());
            long unmatched = lineRepository.countByReconciliationIdAndIsMatchedFalse(r.getId());
            BankReconciliationResponseDTO dto = BankReconciliationResponseDTO.fromEntity(r, lines, unmatched);
            applyLiveBalance(r, dto);
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BankReconciliationResponseDTO getById(Long id) {
        BankReconciliation r = reconciliationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Reconciliation not found: " + id));
        List<BankStatementLineDTO> lines = lineRepository
                .findByReconciliationIdOrderByTransactionDateAsc(id)
                .stream().map(BankStatementLineDTO::fromEntity).collect(Collectors.toList());
        long unmatched = lineRepository.countByReconciliationIdAndIsMatchedFalse(id);
        BankReconciliationResponseDTO dto = BankReconciliationResponseDTO.fromEntity(r, lines, unmatched);
        applyLiveBalance(r, dto);
        return dto;
    }

    /**
     * The ledger balance stored on the entity is only ever computed at create()/update() time.
     * If new journal vouchers post to the bank account afterward (the normal, expected case —
     * reconciliations are usually created before every transaction for the period is entered),
     * that stored snapshot goes stale and the "difference" shown to the user stops meaning
     * anything. For any reconciliation still open, recompute it fresh on every read instead of
     * trusting the snapshot. COMPLETED reconciliations are a closed, audited record and must stay
     * exactly as they were at completion — never recomputed after the fact.
     */
    private void applyLiveBalance(BankReconciliation r, BankReconciliationResponseDTO dto) {
        if ("COMPLETED".equals(r.getStatus())) return;
        BigDecimal systemBalance = computeSystemBalance(r.getStatementDate(), resolveBankAccountCode(r.getBankAccountName()));
        BigDecimal closing = r.getClosingBalance() != null ? r.getClosingBalance() : BigDecimal.ZERO;
        dto.setSystemBalance(systemBalance);
        dto.setDifference(closing.subtract(systemBalance));
    }

    public BankReconciliationResponseDTO create(BankReconciliationRequestDTO req) {
        BankReconciliation r = new BankReconciliation();
        mapFromRequest(r, req);
        r.setStatus("OPEN");
        r = reconciliationRepository.save(r);
        saveLines(r.getId(), req.getLines());
        return getById(r.getId());
    }

    public BankReconciliationResponseDTO update(Long id, BankReconciliationRequestDTO req) {
        BankReconciliation r = reconciliationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Reconciliation not found: " + id));
        if ("COMPLETED".equals(r.getStatus())) {
            throw new IllegalStateException("Completed reconciliations cannot be modified");
        }
        mapFromRequest(r, req);
        r = reconciliationRepository.save(r);
        reconcileLines(id, req.getLines());
        return getById(r.getId());
    }

    /**
     * Matches a bank statement line to a real, posted journal voucher — never to
     * an arbitrary typed string. Validates that the voucher exists, is POSTED,
     * actually posts to the bank account being reconciled, and isn't already
     * claimed by a different statement line (a single ledger movement should
     * only ever explain one bank-statement line).
     */
    public BankReconciliationResponseDTO matchLine(Long reconciliationId, Long lineId, Long journalVoucherId) {
        BankStatementLine line = lineRepository.findById(lineId)
                .orElseThrow(() -> new IllegalArgumentException("Line not found: " + lineId));
        if (!reconciliationId.equals(line.getReconciliationId())) {
            throw new IllegalArgumentException("Line " + lineId + " does not belong to reconciliation " + reconciliationId);
        }
        if (journalVoucherId == null) {
            throw new IllegalArgumentException("journalVoucherId is required");
        }

        JournalVoucher jv = journalVoucherRepository.findById(journalVoucherId)
                .orElseThrow(() -> new IllegalArgumentException("Journal voucher not found: " + journalVoucherId));
        if (!"POSTED".equals(jv.getStatus()) || jv.getDeletedAt() != null) {
            throw new IllegalStateException("Only posted journal vouchers can be matched to a bank statement line");
        }
        BankReconciliation reconciliation = reconciliationRepository.findById(reconciliationId)
                .orElseThrow(() -> new IllegalArgumentException("Reconciliation not found: " + reconciliationId));
        String bankAccountCode = resolveBankAccountCode(reconciliation.getBankAccountName());
        boolean hitsBankAccount = journalVoucherLineRepository.findByJournalVoucherId(journalVoucherId).stream()
                .anyMatch(l -> bankAccountCode.equals(l.getAccountCode()));
        if (!hitsBankAccount) {
            throw new IllegalStateException(
                    "Journal voucher " + jv.getVoucherNo() + " does not post to the bank account and cannot be matched");
        }
        if (lineRepository.existsByMatchedJournalVoucherIdAndIdNot(journalVoucherId, lineId)) {
            throw new IllegalStateException(
                    "Journal voucher " + jv.getVoucherNo() + " is already matched to another statement line");
        }

        line.setIsMatched(true);
        line.setMatchedJournalVoucherId(journalVoucherId);
        line.setMatchedVoucherNo(jv.getVoucherNo());
        lineRepository.save(line);
        updateStatus(reconciliationId);
        return getById(reconciliationId);
    }

    public BankReconciliationResponseDTO unmatchLine(Long reconciliationId, Long lineId) {
        BankStatementLine line = lineRepository.findById(lineId)
                .orElseThrow(() -> new IllegalArgumentException("Line not found: " + lineId));
        if (!reconciliationId.equals(line.getReconciliationId())) {
            throw new IllegalArgumentException("Line " + lineId + " does not belong to reconciliation " + reconciliationId);
        }
        line.setIsMatched(false);
        line.setMatchedVoucherNo(null);
        line.setMatchedJournalVoucherId(null);
        lineRepository.save(line);
        updateStatus(reconciliationId);
        return getById(reconciliationId);
    }

    public BankReconciliationResponseDTO complete(Long reconciliationId) {
        long unmatched = lineRepository.countByReconciliationIdAndIsMatchedFalse(reconciliationId);
        if (unmatched > 0) {
            throw new IllegalStateException("Cannot complete: " + unmatched + " unmatched lines remain");
        }
        BankReconciliation r = reconciliationRepository.findById(reconciliationId)
                .orElseThrow(() -> new IllegalArgumentException("Reconciliation not found: " + reconciliationId));

        // Every bank line being matched only proves the ledger has an entry for everything the
        // bank statement shows — it says nothing about the reverse (a ledger posting to the bank
        // account with no corresponding statement line, e.g. a dated/backdated entry or plain
        // mistake). Recompute one final time and refuse to lock in a reconciliation that doesn't
        // actually tie out; the whole point of reconciling is bank balance == ledger balance.
        BigDecimal systemBalance = computeSystemBalance(r.getStatementDate(), resolveBankAccountCode(r.getBankAccountName()));
        BigDecimal closing = r.getClosingBalance() != null ? r.getClosingBalance() : BigDecimal.ZERO;
        BigDecimal difference = closing.subtract(systemBalance);
        if (difference.abs().compareTo(AMOUNT_TOLERANCE) > 0) {
            throw new IllegalStateException(
                    "Cannot complete: bank and ledger balances differ by " + difference.abs()
                            + " even though all lines are matched — a posted ledger entry with no "
                            + "matching bank statement line is the usual cause");
        }

        r.setSystemBalance(systemBalance);
        r.setDifference(difference);
        r.setStatus("COMPLETED");
        reconciliationRepository.save(r);
        return getById(reconciliationId);
    }

    public void delete(Long id) {
        BankReconciliation r = reconciliationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Reconciliation not found: " + id));
        lineRepository.deleteByReconciliationId(id);
        reconciliationRepository.delete(r);
    }

    /**
     * Real, unmatched, POSTED journal vouchers on the bank account that could
     * plausibly correspond to this statement line — for the manual match picker.
     * Ranked by amount closeness then date proximity so the most likely match
     * appears first; never returns anything that isn't an actual posted voucher.
     */
    @Transactional(readOnly = true)
    public List<MatchCandidateDTO> getMatchCandidates(Long reconciliationId, Long lineId) {
        BankStatementLine line = lineRepository.findById(lineId)
                .orElseThrow(() -> new IllegalArgumentException("Line not found: " + lineId));
        if (!reconciliationId.equals(line.getReconciliationId())) {
            throw new IllegalArgumentException("Line " + lineId + " does not belong to reconciliation " + reconciliationId);
        }
        BankReconciliation reconciliation = reconciliationRepository.findById(reconciliationId)
                .orElseThrow(() -> new IllegalArgumentException("Reconciliation not found: " + reconciliationId));

        Map<Long, JournalVoucher> postedById = loadPostedVouchers();
        Set<Long> usedJvIds = alreadyMatchedJournalVoucherIds();
        List<JournalVoucherLine> bankLines = journalVoucherLineRepository.findByAccountCode(resolveBankAccountCode(reconciliation.getBankAccountName()));

        boolean wantDebit = isBankCredit(line.getType());
        BigDecimal target = line.getAmount() != null ? line.getAmount() : BigDecimal.ZERO;

        List<MatchCandidateDTO> candidates = new ArrayList<>();
        for (JournalVoucherLine jvl : bankLines) {
            JournalVoucher jv = postedById.get(jvl.getJournalVoucherId());
            if (jv == null || usedJvIds.contains(jv.getId())) continue;
            BigDecimal amount = wantDebit ? jvl.getDebit() : jvl.getCredit();
            if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) continue;
            candidates.add(new MatchCandidateDTO(jv.getId(), jv.getVoucherNo(), jv.getDate(), jv.getNarration(), amount));
        }

        candidates.sort(Comparator
                .comparing((MatchCandidateDTO c) -> c.getAmount().subtract(target).abs())
                .thenComparing(c -> Math.abs(daysBetween(line.getTransactionDate(), c.getDate()))));

        return candidates.size() > MAX_CANDIDATES ? candidates.subList(0, MAX_CANDIDATES) : candidates;
    }

    /**
     * Read-only suggestions for every unmatched line in the reconciliation.
     * Only lines with at least one *exact*-amount, direction-matching, posted
     * voucher within {@link #MATCH_WINDOW_DAYS} of the statement date are
     * included — nothing is applied here, the caller reviews and confirms via
     * matchLine() for each accepted suggestion.
     */
    @Transactional(readOnly = true)
    public List<AutoMatchSuggestionDTO> suggestAutoMatches(Long reconciliationId) {
        BankReconciliation reconciliation = reconciliationRepository.findById(reconciliationId)
                .orElseThrow(() -> new IllegalArgumentException("Reconciliation not found: " + reconciliationId));

        Map<Long, JournalVoucher> postedById = loadPostedVouchers();
        Set<Long> usedJvIds = alreadyMatchedJournalVoucherIds();
        List<JournalVoucherLine> bankLines = journalVoucherLineRepository.findByAccountCode(resolveBankAccountCode(reconciliation.getBankAccountName()));

        List<BankStatementLine> unmatchedLines = lineRepository
                .findByReconciliationIdOrderByTransactionDateAsc(reconciliationId).stream()
                .filter(l -> !Boolean.TRUE.equals(l.getIsMatched()))
                .collect(Collectors.toList());

        List<AutoMatchSuggestionDTO> suggestions = new ArrayList<>();
        for (BankStatementLine line : unmatchedLines) {
            boolean wantDebit = isBankCredit(line.getType());
            BigDecimal target = line.getAmount() != null ? line.getAmount() : BigDecimal.ZERO;

            List<MatchCandidateDTO> exactMatches = new ArrayList<>();
            for (JournalVoucherLine jvl : bankLines) {
                JournalVoucher jv = postedById.get(jvl.getJournalVoucherId());
                if (jv == null || usedJvIds.contains(jv.getId())) continue;
                if (jv.getDate() == null || line.getTransactionDate() == null) continue;
                if (Math.abs(daysBetween(line.getTransactionDate(), jv.getDate())) > MATCH_WINDOW_DAYS) continue;

                BigDecimal amount = wantDebit ? jvl.getDebit() : jvl.getCredit();
                if (amount == null) continue;
                if (amount.subtract(target).abs().compareTo(AMOUNT_TOLERANCE) > 0) continue;

                exactMatches.add(new MatchCandidateDTO(jv.getId(), jv.getVoucherNo(), jv.getDate(), jv.getNarration(), amount));
            }
            if (exactMatches.isEmpty()) continue;

            exactMatches.sort(Comparator.comparing(
                    c -> Math.abs(daysBetween(line.getTransactionDate(), c.getDate()))));

            String confidence = exactMatches.size() == 1 ? "HIGH" : "AMBIGUOUS";
            suggestions.add(new AutoMatchSuggestionDTO(line.getId(), confidence, exactMatches));
        }
        return suggestions;
    }

    private void mapFromRequest(BankReconciliation r, BankReconciliationRequestDTO req) {
        r.setBankAccountName(req.getBankAccountName());
        r.setStatementDate(req.getStatementDate());
        r.setOpeningBalance(req.getOpeningBalance() != null ? req.getOpeningBalance() : BigDecimal.ZERO);
        r.setClosingBalance(req.getClosingBalance() != null ? req.getClosingBalance() : BigDecimal.ZERO);

        // The "system"/ledger balance is never taken from client input — it is
        // always computed from the actual posted ledger as of the statement
        // date, otherwise "reconciling" would just be comparing the bank
        // statement to whatever number the user felt like typing.
        BigDecimal systemBalance = computeSystemBalance(req.getStatementDate(), resolveBankAccountCode(req.getBankAccountName()));
        r.setSystemBalance(systemBalance);

        BigDecimal closing = req.getClosingBalance() != null ? req.getClosingBalance() : BigDecimal.ZERO;
        r.setDifference(closing.subtract(systemBalance));
        r.setNotes(req.getNotes());
    }

    /**
     * Resolves a reconciliation's free-text bankAccountName to the real Chart-of-Accounts
     * AccountHead it refers to (case/whitespace-insensitive, since the create/edit form is a plain
     * text field with autocomplete suggestions, not a strict picker). Falls back to the generic
     * Cash-at-Bank bucket ({@link #BANK_ACCOUNT_CODE}) when no matching account exists — e.g. for
     * legacy reconciliations entered before real per-bank accounts existed, or a typo'd name —
     * rather than failing closed and blocking reconciliation entirely.
     */
    private String resolveBankAccountCode(String bankAccountName) {
        if (bankAccountName == null || bankAccountName.isBlank()) return BANK_ACCOUNT_CODE;
        return accountHeadRepository.findByNameIgnoreCase(bankAccountName.trim())
                .map(AccountHead::getCode)
                .orElse(BANK_ACCOUNT_CODE);
    }

    /** opening_balance(bank account) + net(debit-credit) of all ledger-effective lines on or before asOfDate. */
    private BigDecimal computeSystemBalance(LocalDate asOfDate, String accountCode) {
        AccountHead account = accountHeadRepository.findByCode(accountCode).orElse(null);
        BigDecimal opening = account != null && account.getOpeningBalance() != null
                ? account.getOpeningBalance() : BigDecimal.ZERO;

        Map<Long, JournalVoucher> effectiveById = loadLedgerEffectiveVouchers();
        BigDecimal net = BigDecimal.ZERO;
        for (JournalVoucherLine line : journalVoucherLineRepository.findByAccountCode(accountCode)) {
            JournalVoucher jv = effectiveById.get(line.getJournalVoucherId());
            if (jv == null || jv.getDate() == null) continue;
            if (asOfDate != null && jv.getDate().isAfter(asOfDate)) continue;
            BigDecimal debit = line.getDebit() != null ? line.getDebit() : BigDecimal.ZERO;
            BigDecimal credit = line.getCredit() != null ? line.getCredit() : BigDecimal.ZERO;
            net = net.add(debit).subtract(credit);
        }
        return opening.add(net);
    }

    private Map<Long, JournalVoucher> loadPostedVouchers() {
        return journalVoucherRepository.findByStatusOrderByDateDesc("POSTED").stream()
                .collect(Collectors.toMap(JournalVoucher::getId, jv -> jv, (a, b) -> a));
    }

    /** POSTED + REVERSED vouchers — the full set whose lines have a real, permanent ledger effect. */
    private Map<Long, JournalVoucher> loadLedgerEffectiveVouchers() {
        return journalVoucherRepository.findByStatusInOrderByDateDesc(LEDGER_EFFECTIVE_STATUSES).stream()
                .collect(Collectors.toMap(JournalVoucher::getId, jv -> jv, (a, b) -> a));
    }

    private Set<Long> alreadyMatchedJournalVoucherIds() {
        Set<Long> ids = new HashSet<>();
        for (BankStatementLine l : lineRepository.findByMatchedJournalVoucherIdIsNotNull()) {
            ids.add(l.getMatchedJournalVoucherId());
        }
        return ids;
    }

    /** Bank-statement CREDIT (deposit, money in) increases the Cash-at-Bank asset — i.e. a DEBIT in the ledger. */
    private static boolean isBankCredit(String statementLineType) {
        return "CREDIT".equalsIgnoreCase(statementLineType);
    }

    private static long daysBetween(LocalDate a, LocalDate b) {
        if (a == null || b == null) return Long.MAX_VALUE / 2;
        return ChronoUnit.DAYS.between(a, b);
    }

    /**
     * Used only by create(): every line is brand new, so it always starts
     * unmatched — a bank statement line can only become "matched" by going
     * through matchLine(), never by being submitted pre-matched in a request
     * body.
     */
    private void saveLines(Long reconciliationId, List<BankStatementLineDTO> lineDTOs) {
        if (lineDTOs == null) return;
        for (BankStatementLineDTO dto : lineDTOs) {
            BankStatementLine line = new BankStatementLine();
            line.setReconciliationId(reconciliationId);
            line.setTransactionDate(dto.getTransactionDate());
            line.setDescription(dto.getDescription());
            line.setAmount(dto.getAmount());
            line.setType(dto.getType());
            line.setReference(dto.getReference());
            line.setIsMatched(false);
            lineRepository.save(line);
        }
    }

    /**
     * Used by update(): applies the edited line list without discarding match
     * state. A line whose id matches an existing row is updated in place —
     * its isMatched/matchedVoucherNo/matchedJournalVoucherId are left exactly
     * as they were, since editing a statement date typo shouldn't silently
     * unmatch every transaction. Lines omitted from the new list are removed;
     * lines with no id (newly added in the edit form) are inserted, unmatched.
     */
    private void reconcileLines(Long reconciliationId, List<BankStatementLineDTO> lineDTOs) {
        List<BankStatementLine> existing = lineRepository.findByReconciliationIdOrderByTransactionDateAsc(reconciliationId);
        Map<Long, BankStatementLine> existingById = existing.stream()
                .collect(Collectors.toMap(BankStatementLine::getId, l -> l));
        Set<Long> keptIds = new HashSet<>();

        if (lineDTOs != null) {
            for (BankStatementLineDTO dto : lineDTOs) {
                BankStatementLine line = dto.getId() != null ? existingById.get(dto.getId()) : null;
                if (line == null) {
                    line = new BankStatementLine();
                    line.setReconciliationId(reconciliationId);
                    line.setIsMatched(false);
                } else {
                    keptIds.add(line.getId());
                }
                line.setTransactionDate(dto.getTransactionDate());
                line.setDescription(dto.getDescription());
                line.setAmount(dto.getAmount());
                line.setType(dto.getType());
                line.setReference(dto.getReference());
                lineRepository.save(line);
            }
        }

        for (BankStatementLine line : existing) {
            if (!keptIds.contains(line.getId())) {
                lineRepository.delete(line);
            }
        }
    }

    private void updateStatus(Long reconciliationId) {
        BankReconciliation r = reconciliationRepository.findById(reconciliationId).orElseThrow();
        if (!"COMPLETED".equals(r.getStatus())) {
            r.setStatus("IN_PROGRESS");
            reconciliationRepository.save(r);
        }
    }
}
