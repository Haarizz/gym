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
        return all.stream()
                .filter(a -> {
                    if (search == null || search.isBlank()) return true;
                    String s = search.toLowerCase(Locale.ROOT);
                    return (a.getCode() != null && a.getCode().toLowerCase(Locale.ROOT).contains(s))
                            || (a.getName() != null && a.getName().toLowerCase(Locale.ROOT).contains(s));
                })
                .map(AccountHeadResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public AccountHeadResponseDTO createAccountHead(AccountHeadRequestDTO req) {
        if (accountHeadRepository.findByCode(req.getCode()).isPresent()) {
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
        if (!a.getCode().equals(req.getCode()) && accountHeadRepository.findByCode(req.getCode()).isPresent()) {
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

    @Transactional(readOnly = true)
    public List<LedgerEntryDTO> getAllLedgerEntries(LocalDate from, LocalDate to) {
        List<JournalVoucherLine> allLines = journalVoucherLineRepository.findAll();
        List<LedgerEntryDTO> entries = new ArrayList<>();
        for (JournalVoucherLine line : allLines) {
            Optional<JournalVoucher> jvOpt = journalVoucherRepository.findById(line.getJournalVoucherId());
            if (jvOpt.isEmpty()) continue;
            JournalVoucher jv = jvOpt.get();
            if (!"POSTED".equalsIgnoreCase(jv.getStatus())) continue;
            LocalDate date = jv.getDate();
            if (from != null && date.isBefore(from)) continue;
            if (to != null && date.isAfter(to)) continue;

            LedgerEntryDTO entry = new LedgerEntryDTO();
            entry.setDate(date);
            entry.setReference(jv.getVoucherNo());
            entry.setDescription(line.getDescription() != null ? line.getDescription() : jv.getNarration());
            entry.setDebit(line.getDebit() != null ? line.getDebit() : BigDecimal.ZERO);
            entry.setCredit(line.getCredit() != null ? line.getCredit() : BigDecimal.ZERO);
            entry.setBalance(BigDecimal.ZERO);
            entry.setSourceType("JOURNAL_VOUCHER");
            entry.setSourceId(jv.getId());
            entry.setAccountCode(line.getAccountCode());
            accountHeadRepository.findByCode(line.getAccountCode())
                    .ifPresent(a -> entry.setAccountName(a.getName()));
            entries.add(entry);
        }
        entries.sort(Comparator.comparing(LedgerEntryDTO::getDate));
        return entries;
    }

    @Transactional(readOnly = true)
    public List<LedgerEntryDTO> getLedgerEntries(String code, LocalDate from, LocalDate to) {
        AccountHead account = accountHeadRepository.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Account not found: " + code));

        List<JournalVoucherLine> lines = journalVoucherLineRepository.findByAccountCode(code);

        List<LedgerEntryDTO> entries = new ArrayList<>();
        for (JournalVoucherLine line : lines) {
            Optional<JournalVoucher> jvOpt = journalVoucherRepository.findById(line.getJournalVoucherId());
            if (jvOpt.isEmpty()) continue;
            JournalVoucher jv = jvOpt.get();
            if (!"POSTED".equalsIgnoreCase(jv.getStatus())) continue;
            LocalDate date = jv.getDate();
            if (from != null && date.isBefore(from)) continue;
            if (to != null && date.isAfter(to)) continue;

            LedgerEntryDTO entry = new LedgerEntryDTO();
            entry.setDate(date);
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
