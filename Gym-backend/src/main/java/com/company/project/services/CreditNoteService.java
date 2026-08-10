package com.company.project.services;

import com.company.project.dto.CreditNoteRequestDTO;
import com.company.project.dto.CreditNoteResponseDTO;
import com.company.project.entities.CreditNote;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.CreditNoteRepository;
import com.company.project.repositories.JournalEntrySourceRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class CreditNoteService {

    private final CreditNoteRepository creditNoteRepository;
    private final JournalEntrySourceRepository journalEntrySourceRepository;
    private final FinancialEventService financialEventService;
    private final VoucherNumberService voucherNumberService;

    public CreditNoteService(CreditNoteRepository creditNoteRepository,
                              JournalEntrySourceRepository journalEntrySourceRepository,
                              FinancialEventService financialEventService,
                              VoucherNumberService voucherNumberService) {
        this.creditNoteRepository = creditNoteRepository;
        this.journalEntrySourceRepository = journalEntrySourceRepository;
        this.financialEventService = financialEventService;
        this.voucherNumberService = voucherNumberService;
    }

    public List<CreditNoteResponseDTO> getAll() {
        return creditNoteRepository.findAll(Sort.by(Sort.Direction.DESC, "date", "id"))
                .stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    public CreditNoteResponseDTO getById(Long id) {
        return toResponseDTO(findOrThrow(id));
    }

    public CreditNoteResponseDTO create(CreditNoteRequestDTO req) {
        CreditNote n = new CreditNote();
        n.setVoucherNo(voucherNumberService.next("CN"));
        n.setDate(req.getDate() != null ? req.getDate() : LocalDate.now());
        n.setMemberDbId(req.getMemberDbId());
        n.setMemberName(req.getMemberName());
        n.setLinkedReceiptId(req.getLinkedReceiptId());
        n.setReason(req.getReason());
        BigDecimal subtotal = req.getSubtotal() != null ? req.getSubtotal() : BigDecimal.ZERO;
        BigDecimal tax = req.getTaxAmount() != null ? req.getTaxAmount() : BigDecimal.ZERO;
        n.setSubtotal(subtotal);
        n.setTaxAmount(tax);
        n.setTotalAmount(subtotal.add(tax));
        n.setRefundMethod(req.getRefundMethod() != null && !req.getRefundMethod().isBlank()
                ? req.getRefundMethod() : "Cash");
        n.setStatus("DRAFT");
        CreditNote saved = creditNoteRepository.save(n);
        return toResponseDTO(saved);
    }

    public CreditNoteResponseDTO post(Long id) {
        CreditNote n = findOrThrow(id);
        if (!"DRAFT".equalsIgnoreCase(n.getStatus())) {
            throw new BusinessRuleViolationException("Only DRAFT credit notes can be posted");
        }
        financialEventService.onCreditNoteIssued(n);
        n.setStatus("POSTED");
        CreditNote saved = creditNoteRepository.save(n);
        return toResponseDTO(saved);
    }

    public CreditNoteResponseDTO cancel(Long id) {
        CreditNote n = findOrThrow(id);
        if (!"DRAFT".equalsIgnoreCase(n.getStatus())) {
            throw new BusinessRuleViolationException("Only DRAFT credit notes can be cancelled");
        }
        n.setStatus("CANCELLED");
        CreditNote saved = creditNoteRepository.save(n);
        return toResponseDTO(saved);
    }

    private CreditNote findOrThrow(Long id) {
        return creditNoteRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Credit Note not found: " + id));
    }

    private CreditNoteResponseDTO toResponseDTO(CreditNote n) {
        Long jvId = journalEntrySourceRepository
                .findBySourceEntityTypeAndSourceEntityId("CreditNote", n.getId())
                .map(s -> s.getJournalVoucherId()).orElse(null);
        return CreditNoteResponseDTO.fromEntity(n, jvId);
    }
}
