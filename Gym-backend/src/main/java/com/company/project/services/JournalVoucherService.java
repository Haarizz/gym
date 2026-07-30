package com.company.project.services;

import com.company.project.dto.JournalVoucherLineDTO;
import com.company.project.dto.JournalVoucherRequestDTO;
import com.company.project.dto.JournalVoucherResponseDTO;
import com.company.project.entities.AccountHead;
import com.company.project.entities.JournalVoucher;
import com.company.project.entities.JournalVoucherLine;
import com.company.project.repositories.AccountHeadRepository;
import com.company.project.repositories.JournalVoucherLineRepository;
import com.company.project.repositories.JournalVoucherRepository;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@Transactional
public class JournalVoucherService {

    private final JournalVoucherRepository journalVoucherRepository;
    private final JournalVoucherLineRepository lineRepository;
    private final AccountHeadRepository accountHeadRepository;
    private final FinancialEventService financialEventService;
    private final VoucherNumberService voucherNumberService;

    public JournalVoucherService(JournalVoucherRepository journalVoucherRepository,
                                 JournalVoucherLineRepository lineRepository,
                                 AccountHeadRepository accountHeadRepository,
                                 FinancialEventService financialEventService,
                                 VoucherNumberService voucherNumberService) {
        this.journalVoucherRepository = journalVoucherRepository;
        this.lineRepository           = lineRepository;
        this.accountHeadRepository    = accountHeadRepository;
        this.financialEventService    = financialEventService;
        this.voucherNumberService     = voucherNumberService;
    }

    /**
     * Filters at the query level (via Specification) instead of loading the whole
     * table and filtering with a Java stream, so a search only pulls matching rows
     * over the wire (see docs/gymbios-financial-roadmap.html — M1).
     */
    public List<JournalVoucherResponseDTO> getJournalVouchers(String search, String status) {
        Specification<JournalVoucher> spec = buildSpec(search, status);
        List<JournalVoucher> all = journalVoucherRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "date"));
        return all.stream()
                .map(jv -> {
                    List<JournalVoucherLine> lines = lineRepository.findByJournalVoucherId(jv.getId());
                    return JournalVoucherResponseDTO.fromEntity(jv, lines);
                })
                .collect(Collectors.toList());
    }

    private Specification<JournalVoucher> buildSpec(String search, String status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (status != null && !status.isBlank() && !status.equalsIgnoreCase("all")) {
                predicates.add(cb.equal(cb.lower(root.get("status")), status.toLowerCase(Locale.ROOT)));
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search.toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("voucherNo")), like),
                        cb.like(cb.lower(root.get("narration")), like),
                        cb.like(cb.lower(root.get("reference")), like)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public JournalVoucherResponseDTO getJournalVoucherById(Long id) {
        JournalVoucher jv = journalVoucherRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new EntityNotFoundException("Journal Voucher not found: " + id));
        List<JournalVoucherLine> lines = lineRepository.findByJournalVoucherId(id);
        return JournalVoucherResponseDTO.fromEntity(jv, lines);
    }

    public JournalVoucherResponseDTO createJournalVoucher(JournalVoucherRequestDTO req) {
        List<JournalVoucherLineDTO> lineDTOs = req.getLines() != null ? req.getLines() : Collections.emptyList();
        BigDecimal totalDebit = lineDTOs.stream()
                .map(l -> l.getDebit() != null ? l.getDebit() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCredit = lineDTOs.stream()
                .map(l -> l.getCredit() != null ? l.getCredit() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        JournalVoucher jv = new JournalVoucher();
        jv.setVoucherNo(voucherNumberService.next("JV"));
        jv.setDate(req.getDate() != null ? req.getDate() : LocalDate.now());
        jv.setNarration(req.getNarration());
        jv.setStatus(req.getStatus() != null && !req.getStatus().isBlank() ? req.getStatus() : "DRAFT");
        jv.setReference(req.getReference());
        jv.setTotalDebit(totalDebit);
        jv.setTotalCredit(totalCredit);
        JournalVoucher saved = journalVoucherRepository.save(jv);
        List<JournalVoucherLine> lines = saveLines(saved.getId(), lineDTOs);
        return JournalVoucherResponseDTO.fromEntity(saved, lines);
    }

    public JournalVoucherResponseDTO updateJournalVoucher(Long id, JournalVoucherRequestDTO req) {
        JournalVoucher jv = journalVoucherRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new EntityNotFoundException("Journal Voucher not found: " + id));
        if (!"DRAFT".equalsIgnoreCase(jv.getStatus())) {
            throw new BusinessRuleViolationException("Only DRAFT journal vouchers can be edited");
        }
        List<JournalVoucherLineDTO> lineDTOs = req.getLines() != null ? req.getLines() : Collections.emptyList();
        BigDecimal totalDebit = lineDTOs.stream()
                .map(l -> l.getDebit() != null ? l.getDebit() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCredit = lineDTOs.stream()
                .map(l -> l.getCredit() != null ? l.getCredit() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        jv.setDate(req.getDate() != null ? req.getDate() : jv.getDate());
        jv.setNarration(req.getNarration());
        if (req.getStatus() != null && !req.getStatus().isBlank()) jv.setStatus(req.getStatus());
        jv.setReference(req.getReference());
        jv.setTotalDebit(totalDebit);
        jv.setTotalCredit(totalCredit);
        JournalVoucher saved = journalVoucherRepository.save(jv);
        lineRepository.deleteByJournalVoucherId(id);
        List<JournalVoucherLine> lines = saveLines(id, lineDTOs);
        return JournalVoucherResponseDTO.fromEntity(saved, lines);
    }

    /**
     * Post a DRAFT voucher to the ledger.
     * After posting, each AccountHead.currentBalance is updated so the
     * balance sheet always reflects the latest posted state.
     */
    public JournalVoucherResponseDTO postJournalVoucher(Long id) {
        JournalVoucher jv = journalVoucherRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new EntityNotFoundException("Journal Voucher not found: " + id));
        if (!"DRAFT".equalsIgnoreCase(jv.getStatus())) {
            throw new BusinessRuleViolationException("Only DRAFT vouchers can be posted");
        }

        // Validate balance before posting
        List<JournalVoucherLine> lines = lineRepository.findByJournalVoucherId(id);
        BigDecimal dr = lines.stream().map(l -> l.getDebit()  != null ? l.getDebit()  : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal cr = lines.stream().map(l -> l.getCredit() != null ? l.getCredit() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (dr.compareTo(cr) != 0) {
            throw new BusinessRuleViolationException(
                    "Cannot post: journal does not balance — DR=" + dr + " CR=" + cr);
        }

        jv.setStatus("POSTED");
        JournalVoucher saved = journalVoucherRepository.save(jv);

        // Update AccountHead.currentBalance for each line
        for (JournalVoucherLine line : lines) {
            financialEventService.updateAccountBalance(
                    line.getAccountCode(),
                    line.getAccountName(),
                    line.getDebit()  != null ? line.getDebit()  : BigDecimal.ZERO,
                    line.getCredit() != null ? line.getCredit() : BigDecimal.ZERO
            );
        }

        return JournalVoucherResponseDTO.fromEntity(saved, lines);
    }

    /**
     * Reverse a POSTED journal voucher.
     *
     * Creates an equal-and-opposite voucher (all debits become credits and
     * vice-versa), posts it immediately, and marks the original as REVERSED.
     * This is the ERP-standard way to correct a posted entry — the original
     * entry is never deleted or modified.
     */
    public JournalVoucherResponseDTO reverseJournalVoucher(Long id, LocalDate reversalDate, String reason) {
        JournalVoucher original = journalVoucherRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new EntityNotFoundException("Journal Voucher not found: " + id));
        if (!"POSTED".equalsIgnoreCase(original.getStatus())) {
            throw new BusinessRuleViolationException("Only POSTED vouchers can be reversed");
        }
        if (original.getReversedByVoucherId() != null) {
            throw new BusinessRuleViolationException("Voucher " + original.getVoucherNo() + " is already reversed");
        }

        List<JournalVoucherLine> originalLines = lineRepository.findByJournalVoucherId(id);

        // Build reversal voucher (swap debit ↔ credit on every line)
        String reversalNarration = "REVERSAL of " + original.getVoucherNo()
                + (reason != null && !reason.isBlank() ? ": " + reason : "");
        LocalDate date = reversalDate != null ? reversalDate : LocalDate.now();

        JournalVoucher reversal = new JournalVoucher();
        reversal.setVoucherNo(voucherNumberService.next("JV"));
        reversal.setDate(date);
        reversal.setNarration(reversalNarration);
        reversal.setStatus("POSTED");
        reversal.setReference("REVERSAL");
        reversal.setTotalDebit(original.getTotalCredit());
        reversal.setTotalCredit(original.getTotalDebit());
        reversal.setSystemGenerated(true);
        reversal.setReversesVoucherId(original.getId());
        reversal = journalVoucherRepository.save(reversal);

        final Long reversalId = reversal.getId();
        List<JournalVoucherLine> reversalLines = originalLines.stream().map(l -> {
            JournalVoucherLine rl = new JournalVoucherLine();
            rl.setJournalVoucherId(reversalId);
            rl.setAccountCode(l.getAccountCode());
            rl.setAccountName(l.getAccountName());
            // Swap debit ↔ credit
            rl.setDebit(l.getCredit()  != null ? l.getCredit()  : BigDecimal.ZERO);
            rl.setCredit(l.getDebit()  != null ? l.getDebit()  : BigDecimal.ZERO);
            rl.setDescription("Reversal: " + (l.getDescription() != null ? l.getDescription() : ""));
            rl.setCostCenter(l.getCostCenter());
            return lineRepository.save(rl);
        }).collect(Collectors.toList());

        // Update AccountHead balances for the reversal (opposite sign)
        for (JournalVoucherLine rl : reversalLines) {
            financialEventService.updateAccountBalance(
                    rl.getAccountCode(),
                    rl.getAccountName(),
                    rl.getDebit()  != null ? rl.getDebit()  : BigDecimal.ZERO,
                    rl.getCredit() != null ? rl.getCredit() : BigDecimal.ZERO
            );
        }

        // Mark original as REVERSED
        original.setStatus("REVERSED");
        original.setReversedByVoucherId(reversal.getId());
        journalVoucherRepository.save(original);

        return JournalVoucherResponseDTO.fromEntity(reversal, reversalLines);
    }

    public JournalVoucherResponseDTO cancelJournalVoucher(Long id) {
        JournalVoucher jv = journalVoucherRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new EntityNotFoundException("Journal Voucher not found: " + id));
        if ("POSTED".equalsIgnoreCase(jv.getStatus())) {
            throw new BusinessRuleViolationException("Posted vouchers cannot be cancelled — use reverseJournalVoucher() instead");
        }
        if ("REVERSED".equalsIgnoreCase(jv.getStatus())) {
            throw new BusinessRuleViolationException("Reversed vouchers cannot be cancelled");
        }
        jv.setStatus("CANCELLED");
        JournalVoucher saved = journalVoucherRepository.save(jv);
        List<JournalVoucherLine> lines = lineRepository.findByJournalVoucherId(id);
        return JournalVoucherResponseDTO.fromEntity(saved, lines);
    }

    /**
     * Soft-deletes a DRAFT or CANCELLED voucher: marks it deleted_at rather than
     * removing the row, so the header and its lines remain in the database for
     * audit purposes. Deleted vouchers are excluded from buildSpec()'s "IS NULL"
     * predicate and from findByIdAndDeletedAtIsNull(), so they behave as
     * "not found" everywhere else in this service.
     */
    public void deleteJournalVoucher(Long id) {
        JournalVoucher jv = journalVoucherRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new EntityNotFoundException("Journal Voucher not found: " + id));
        if (!"DRAFT".equalsIgnoreCase(jv.getStatus()) && !"CANCELLED".equalsIgnoreCase(jv.getStatus())) {
            throw new BusinessRuleViolationException("Only DRAFT or CANCELLED vouchers can be deleted");
        }
        jv.setDeletedAt(LocalDateTime.now());
        journalVoucherRepository.save(jv);
    }

    private List<JournalVoucherLine> saveLines(Long journalVoucherId, List<JournalVoucherLineDTO> lineDTOs) {
        if (lineDTOs == null || lineDTOs.isEmpty()) return Collections.emptyList();
        return lineDTOs.stream().map(dto -> {
            JournalVoucherLine line = new JournalVoucherLine();
            line.setJournalVoucherId(journalVoucherId);
            line.setAccountCode(dto.getAccountCode());
            line.setAccountName(dto.getAccountName());
            line.setDebit(dto.getDebit() != null ? dto.getDebit() : BigDecimal.ZERO);
            line.setCredit(dto.getCredit() != null ? dto.getCredit() : BigDecimal.ZERO);
            line.setDescription(dto.getDescription());
            line.setCostCenter(dto.getCostCenter());
            return lineRepository.save(line);
        }).collect(Collectors.toList());
    }
}
