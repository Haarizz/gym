package com.company.project.services;

import com.company.project.dto.BankReconciliationRequestDTO;
import com.company.project.dto.BankReconciliationResponseDTO;
import com.company.project.dto.BankStatementLineDTO;
import com.company.project.entities.BankReconciliation;
import com.company.project.entities.BankStatementLine;
import com.company.project.repositories.BankReconciliationRepository;
import com.company.project.repositories.BankStatementLineRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class BankReconciliationService {

    private final BankReconciliationRepository reconciliationRepository;
    private final BankStatementLineRepository lineRepository;

    public BankReconciliationService(BankReconciliationRepository reconciliationRepository,
                                     BankStatementLineRepository lineRepository) {
        this.reconciliationRepository = reconciliationRepository;
        this.lineRepository = lineRepository;
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
            return BankReconciliationResponseDTO.fromEntity(r, lines, unmatched);
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
        return BankReconciliationResponseDTO.fromEntity(r, lines, unmatched);
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
        lineRepository.deleteByReconciliationId(id);
        saveLines(id, req.getLines());
        return getById(r.getId());
    }

    public BankReconciliationResponseDTO matchLine(Long reconciliationId, Long lineId, String voucherNo) {
        BankStatementLine line = lineRepository.findById(lineId)
                .orElseThrow(() -> new IllegalArgumentException("Line not found: " + lineId));
        if (!reconciliationId.equals(line.getReconciliationId())) {
            throw new IllegalArgumentException("Line " + lineId + " does not belong to reconciliation " + reconciliationId);
        }
        line.setIsMatched(true);
        line.setMatchedVoucherNo(voucherNo);
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

    private void mapFromRequest(BankReconciliation r, BankReconciliationRequestDTO req) {
        r.setBankAccountName(req.getBankAccountName());
        r.setStatementDate(req.getStatementDate());
        r.setOpeningBalance(req.getOpeningBalance() != null ? req.getOpeningBalance() : BigDecimal.ZERO);
        r.setClosingBalance(req.getClosingBalance() != null ? req.getClosingBalance() : BigDecimal.ZERO);
        r.setSystemBalance(req.getSystemBalance() != null ? req.getSystemBalance() : BigDecimal.ZERO);
        BigDecimal diff = (req.getClosingBalance() != null ? req.getClosingBalance() : BigDecimal.ZERO)
                .subtract(req.getSystemBalance() != null ? req.getSystemBalance() : BigDecimal.ZERO);
        r.setDifference(diff);
        r.setNotes(req.getNotes());
    }

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
            line.setIsMatched(dto.getIsMatched() != null ? dto.getIsMatched() : false);
            line.setMatchedVoucherNo(dto.getMatchedVoucherNo());
            lineRepository.save(line);
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
