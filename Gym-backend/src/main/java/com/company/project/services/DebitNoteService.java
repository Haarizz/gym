package com.company.project.services;

import com.company.project.dto.DebitNoteRequestDTO;
import com.company.project.dto.DebitNoteResponseDTO;
import com.company.project.entities.DebitNote;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.DebitNoteRepository;
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
public class DebitNoteService {

    private final DebitNoteRepository debitNoteRepository;
    private final JournalEntrySourceRepository journalEntrySourceRepository;
    private final FinancialEventService financialEventService;
    private final VoucherNumberService voucherNumberService;

    public DebitNoteService(DebitNoteRepository debitNoteRepository,
                             JournalEntrySourceRepository journalEntrySourceRepository,
                             FinancialEventService financialEventService,
                             VoucherNumberService voucherNumberService) {
        this.debitNoteRepository = debitNoteRepository;
        this.journalEntrySourceRepository = journalEntrySourceRepository;
        this.financialEventService = financialEventService;
        this.voucherNumberService = voucherNumberService;
    }

    public List<DebitNoteResponseDTO> getAll() {
        return debitNoteRepository.findAll(Sort.by(Sort.Direction.DESC, "date", "id"))
                .stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    public DebitNoteResponseDTO getById(Long id) {
        return toResponseDTO(findOrThrow(id));
    }

    public DebitNoteResponseDTO create(DebitNoteRequestDTO req) {
        DebitNote n = new DebitNote();
        n.setVoucherNo(voucherNumberService.next("DN"));
        n.setDate(req.getDate() != null ? req.getDate() : LocalDate.now());
        n.setSupplierId(req.getSupplierId());
        n.setSupplierName(req.getSupplierName());
        n.setLinkedBillId(req.getLinkedBillId());
        n.setReason(req.getReason());
        BigDecimal subtotal = req.getSubtotal() != null ? req.getSubtotal() : BigDecimal.ZERO;
        BigDecimal tax = req.getTaxAmount() != null ? req.getTaxAmount() : BigDecimal.ZERO;
        n.setSubtotal(subtotal);
        n.setTaxAmount(tax);
        n.setTotalAmount(subtotal.add(tax));
        n.setStatus("DRAFT");
        DebitNote saved = debitNoteRepository.save(n);
        return toResponseDTO(saved);
    }

    public DebitNoteResponseDTO post(Long id) {
        DebitNote n = findOrThrow(id);
        if (!"DRAFT".equalsIgnoreCase(n.getStatus())) {
            throw new BusinessRuleViolationException("Only DRAFT debit notes can be posted");
        }
        financialEventService.onDebitNoteIssued(n);
        n.setStatus("POSTED");
        DebitNote saved = debitNoteRepository.save(n);
        return toResponseDTO(saved);
    }

    public DebitNoteResponseDTO cancel(Long id) {
        DebitNote n = findOrThrow(id);
        if (!"DRAFT".equalsIgnoreCase(n.getStatus())) {
            throw new BusinessRuleViolationException("Only DRAFT debit notes can be cancelled");
        }
        n.setStatus("CANCELLED");
        DebitNote saved = debitNoteRepository.save(n);
        return toResponseDTO(saved);
    }

    private DebitNote findOrThrow(Long id) {
        return debitNoteRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Debit Note not found: " + id));
    }

    private DebitNoteResponseDTO toResponseDTO(DebitNote n) {
        Long jvId = journalEntrySourceRepository
                .findBySourceEntityTypeAndSourceEntityId("DebitNote", n.getId())
                .map(s -> s.getJournalVoucherId()).orElse(null);
        return DebitNoteResponseDTO.fromEntity(n, jvId);
    }
}
