package com.company.project.services;

import com.company.project.dto.AccountHeadRequestDTO;
import com.company.project.dto.AccountHeadResponseDTO;
import com.company.project.dto.LedgerEntryDTO;
import com.company.project.entities.AccountHead;
import com.company.project.entities.JournalVoucher;
import com.company.project.entities.JournalVoucherLine;
import com.company.project.repositories.AccountHeadRepository;
import com.company.project.repositories.JournalVoucherLineRepository;
import com.company.project.repositories.JournalVoucherRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class AccountHeadService {

    private final AccountHeadRepository accountHeadRepository;
    private final JournalVoucherLineRepository journalVoucherLineRepository;
    private final JournalVoucherRepository journalVoucherRepository;

    public AccountHeadService(AccountHeadRepository accountHeadRepository,
                              JournalVoucherLineRepository journalVoucherLineRepository,
                              JournalVoucherRepository journalVoucherRepository) {
        this.accountHeadRepository = accountHeadRepository;
        this.journalVoucherLineRepository = journalVoucherLineRepository;
        this.journalVoucherRepository = journalVoucherRepository;
    }

    @Transactional(readOnly = true)
    public List<AccountHeadResponseDTO> getAccountHeads(String type, Boolean isActive, String search) {
        List<AccountHead> all;
        if (Boolean.TRUE.equals(isActive)) {
            all = accountHeadRepository.findByIsActiveTrueOrderByCodeAsc();
        } else if (type != null && !type.isBlank()) {
            all = accountHeadRepository.findByTypeOrderByCodeAsc(type.toUpperCase(Locale.ROOT));
        } else {
            all = accountHeadRepository.findAllByOrderByCodeAsc();
        }

        // Fetch branch-specific balances
        List<Object[]> balances = journalVoucherLineRepository.getAccountBalances();
        java.util.Map<String, BigDecimal> balanceMap = new java.util.HashMap<>();
        for (Object[] row : balances) {
            String code = (String) row[0];
            BigDecimal balance = row[1] != null ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO;
            balanceMap.put(code, balance);
        }

        return all.stream()
                .filter(a -> {
                    if (search == null || search.isBlank()) return true;
                    String s = search.toLowerCase(Locale.ROOT);
                    return (a.getCode() != null && a.getCode().toLowerCase(Locale.ROOT).contains(s))
                            || (a.getName() != null && a.getName().toLowerCase(Locale.ROOT).contains(s));
                })
                .map(a -> {
                    AccountHeadResponseDTO dto = AccountHeadResponseDTO.fromEntity(a);
                    BigDecimal opening = a.getOpeningBalance() != null ? a.getOpeningBalance() : BigDecimal.ZERO;
                    BigDecimal netChange = balanceMap.getOrDefault(a.getCode(), BigDecimal.ZERO);
                    
                    // For Asset & Expense, normal balance is Debit (Debit - Credit)
                    // For Liability, Equity, Revenue, normal balance is Credit (Credit - Debit)
                    // Our query does Debit - Credit for all. 
                    // Wait, if it's Liability, Debit - Credit is negative, so adding it to opening balance 
                    // is technically subtracting it. But wait, `currentBalance` logic in `getLedgerEntries` 
                    // does `balance.add(debit).subtract(credit)` for ALL accounts.
                    // So we can just add `netChange` to `openingBalance` for ALL accounts, assuming `openingBalance` 
                    // is stored consistently with `balance = debit - credit`.
                    // Wait, let's verify `getLedgerEntries`:
                    // balance = account.getOpeningBalance() + debit - credit;
                    // It does exactly that for ALL accounts. So:
                    dto.setCurrentBalance(opening.add(netChange));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public AccountHeadResponseDTO createAccountHead(AccountHeadRequestDTO req) {
        if (accountHeadRepository.findFirstByCode(req.getCode()).isPresent()) {
            throw new IllegalArgumentException("Account code already exists: " + req.getCode());
        }
        AccountHead a = new AccountHead();
        mapFromRequest(a, req);
        if (a.getIsActive() == null) a.setIsActive(true);
        BigDecimal opening = a.getOpeningBalance() != null ? a.getOpeningBalance() : BigDecimal.ZERO;
        if (a.getCurrentBalance() == null) a.setCurrentBalance(opening);
        return AccountHeadResponseDTO.fromEntity(accountHeadRepository.save(a));
    }

    public AccountHeadResponseDTO updateAccountHead(Long id, AccountHeadRequestDTO req) {
        AccountHead a = accountHeadRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Account head not found: " + id));
        if (!a.getCode().equals(req.getCode()) && accountHeadRepository.findFirstByCode(req.getCode()).isPresent()) {
            throw new IllegalArgumentException("Account code already exists: " + req.getCode());
        }
        mapFromRequest(a, req);
        return AccountHeadResponseDTO.fromEntity(accountHeadRepository.save(a));
    }

    public AccountHeadResponseDTO toggleActive(Long id) {
        AccountHead a = accountHeadRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Account head not found: " + id));
        a.setIsActive(!Boolean.TRUE.equals(a.getIsActive()));
        return AccountHeadResponseDTO.fromEntity(accountHeadRepository.save(a));
    }

    public void deleteAccountHead(Long id) {
        AccountHead a = accountHeadRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Account head not found: " + id));
        accountHeadRepository.delete(a);
    }

    /**
     * Fills in any missing accounts from the standard Chart of Accounts for the
     * caller's active branch — same list as DataInitializer.seedDefaultAccountHeads()
     * (the primary DB's boot-time seeder) and TenantProvisioningService.seedDefaultAccountHeads()
     * (run automatically for every new gym going forward). Exists as a callable,
     * idempotent action for branches that were provisioned before that fix landed and
     * so never got seeded — those accounts otherwise only ever appear lazily, one at a
     * time, the moment something happens to post to that code first (see
     * FinancialEventService.updateAccountBalance's auto-create fallback), leaving the
     * Chart of Accounts screen showing an incomplete, unpredictable subset. Skips any
     * code that already exists (branch-scoped via findFirstByCode, which the active
     * branchFilter already restricts to this branch) rather than failing on it, so
     * it's always safe to call again. Keep this list in sync with the other two.
     */
    public List<AccountHeadResponseDTO> seedDefaults() {
        record DefaultAccount(String code, String name, String type) {}
        List<DefaultAccount> defaults = List.of(
                new DefaultAccount("1000", "Cash in Hand", "ASSET"),
                new DefaultAccount("1001", "Cash at Bank", "ASSET"),
                new DefaultAccount("1100", "Accounts Receivable", "ASSET"),
                new DefaultAccount("1400", "Salary Advance Receivable", "ASSET"),
                new DefaultAccount("1500", "Fixed Assets", "ASSET"),
                new DefaultAccount("1600", "Accumulated Depreciation", "ASSET"),
                new DefaultAccount("2000", "Accounts Payable", "LIABILITY"),
                new DefaultAccount("2100", "Tax / GST Payable", "LIABILITY"),
                new DefaultAccount("2200", "GST Input Credit", "LIABILITY"),
                new DefaultAccount("2300", "Deferred Revenue", "LIABILITY"),
                new DefaultAccount("4000", "Membership Revenue", "REVENUE"),
                new DefaultAccount("4100", "POS Sales Revenue", "REVENUE"),
                new DefaultAccount("4200", "Service / Add-on Revenue", "REVENUE"),
                new DefaultAccount("4300", "Interest Income", "REVENUE"),
                new DefaultAccount("5000", "Salary Expense", "EXPENSE"),
                new DefaultAccount("5100", "Maintenance Expense", "EXPENSE"),
                new DefaultAccount("5200", "Purchase / COGS", "EXPENSE"),
                new DefaultAccount("5700", "Miscellaneous Expense", "EXPENSE"),
                new DefaultAccount("5800", "Depreciation Expense", "EXPENSE"),
                new DefaultAccount("5900", "Bank Charges Expense", "EXPENSE")
        );

        List<AccountHead> created = new ArrayList<>();
        for (DefaultAccount d : defaults) {
            if (accountHeadRepository.findFirstByCode(d.code()).isPresent()) continue;
            AccountHead a = new AccountHead();
            a.setCode(d.code());
            a.setName(d.name());
            a.setType(d.type());
            a.setOpeningBalance(BigDecimal.ZERO);
            a.setCurrentBalance(BigDecimal.ZERO);
            a.setIsActive(true);
            created.add(accountHeadRepository.save(a));
        }
        return created.stream().map(AccountHeadResponseDTO::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<LedgerEntryDTO> getAllLedgerEntries(LocalDate from, LocalDate to) {
        List<JournalVoucher> jvs;
        if (from != null && to != null) {
            jvs = journalVoucherRepository.findByStatusAndDateBetweenOrderByDateDesc("POSTED", from, to);
        } else {
            jvs = journalVoucherRepository.findByStatusOrderByDateDesc("POSTED");
        }

        List<LedgerEntryDTO> entries = new ArrayList<>();
        if (jvs.isEmpty()) {
            return entries;
        }

        java.util.Map<Long, JournalVoucher> jvMap = jvs.stream().collect(java.util.stream.Collectors.toMap(JournalVoucher::getId, j -> j));
        List<JournalVoucherLine> allLines = journalVoucherLineRepository.findByJournalVoucherIdIn(jvMap.keySet());

        for (JournalVoucherLine line : allLines) {
            JournalVoucher jv = jvMap.get(line.getJournalVoucherId());
            if (jv == null) continue;

            LedgerEntryDTO entry = new LedgerEntryDTO();
            entry.setDate(jv.getDate());
            entry.setReference(jv.getVoucherNo());
            entry.setDescription(line.getDescription() != null ? line.getDescription() : jv.getNarration());
            entry.setDebit(line.getDebit() != null ? line.getDebit() : BigDecimal.ZERO);
            entry.setCredit(line.getCredit() != null ? line.getCredit() : BigDecimal.ZERO);
            entry.setBalance(BigDecimal.ZERO);
            entry.setSourceType("JOURNAL_VOUCHER");
            entry.setSourceId(jv.getId());
            entry.setAccountCode(line.getAccountCode());
            accountHeadRepository.findFirstByCode(line.getAccountCode())
                    .ifPresent(a -> entry.setAccountName(a.getName()));
            entries.add(entry);
        }
        entries.sort(Comparator.comparing(LedgerEntryDTO::getDate));
        return entries;
    }

    @Transactional(readOnly = true)
    public List<LedgerEntryDTO> getLedgerEntries(String code, LocalDate from, LocalDate to) {
        AccountHead account = accountHeadRepository.findFirstByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Account not found: " + code));

        List<JournalVoucher> jvs;
        if (from != null && to != null) {
            jvs = journalVoucherRepository.findByStatusAndDateBetweenOrderByDateDesc("POSTED", from, to);
        } else {
            jvs = journalVoucherRepository.findByStatusOrderByDateDesc("POSTED");
        }

        List<LedgerEntryDTO> entries = new ArrayList<>();
        if (jvs.isEmpty()) {
            return entries;
        }

        java.util.Map<Long, JournalVoucher> jvMap = jvs.stream().collect(java.util.stream.Collectors.toMap(JournalVoucher::getId, j -> j));
        List<JournalVoucherLine> lines = journalVoucherLineRepository.findByAccountCode(code);

        for (JournalVoucherLine line : lines) {
            JournalVoucher jv = jvMap.get(line.getJournalVoucherId());
            if (jv == null) continue;

            LedgerEntryDTO entry = new LedgerEntryDTO();
            entry.setDate(jv.getDate());
            entry.setReference(jv.getVoucherNo());
            entry.setDescription(line.getDescription() != null ? line.getDescription() : jv.getNarration());
            entry.setDebit(line.getDebit() != null ? line.getDebit() : BigDecimal.ZERO);
            entry.setCredit(line.getCredit() != null ? line.getCredit() : BigDecimal.ZERO);
            entry.setSourceType("JOURNAL_VOUCHER");
            entry.setSourceId(jv.getId());
            entry.setAccountCode(code);
            entry.setAccountName(account.getName());
            entries.add(entry);
        }

        entries.sort(Comparator.comparing(LedgerEntryDTO::getDate));

        BigDecimal balance = account.getOpeningBalance() != null ? account.getOpeningBalance() : BigDecimal.ZERO;
        for (LedgerEntryDTO e : entries) {
            balance = balance.add(e.getDebit()).subtract(e.getCredit());
            e.setBalance(balance);
        }

        return entries;
    }

    private void mapFromRequest(AccountHead a, AccountHeadRequestDTO req) {
        a.setCode(req.getCode());
        a.setName(req.getName());
        a.setType(req.getType() != null ? req.getType().toUpperCase(Locale.ROOT) : null);
        a.setSubGroup(req.getSubGroup());
        a.setParentId(req.getParentId());
        a.setLevel(req.getLevel());
        a.setBranch(req.getBranch());
        a.setCostCenter(req.getCostCenter());
        a.setOpeningBalance(req.getOpeningBalance());
        a.setIsActive(req.getIsActive());
        a.setDescription(req.getDescription());
    }
}
