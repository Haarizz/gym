package com.company.project.services;

import com.company.project.dto.ContraVoucherRequestDTO;
import com.company.project.dto.ContraVoucherResponseDTO;
import com.company.project.entities.ContraVoucher;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.ContraVoucherRepository;
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
public class ContraVoucherService {

    private final ContraVoucherRepository contraVoucherRepository;
    private final JournalEntrySourceRepository journalEntrySourceRepository;
    private final FinancialEventService financialEventService;
    private final VoucherNumberService voucherNumberService;

    public ContraVoucherService(ContraVoucherRepository contraVoucherRepository,
                                 JournalEntrySourceRepository journalEntrySourceRepository,
                                 FinancialEventService financialEventService,
                                 VoucherNumberService voucherNumberService) {
        this.contraVoucherRepository = contraVoucherRepository;
        this.journalEntrySourceRepository = journalEntrySourceRepository;
        this.financialEventService = financialEventService;
        this.voucherNumberService = voucherNumberService;
    }

    public List<ContraVoucherResponseDTO> getAll() {
        return contraVoucherRepository.findAll(Sort.by(Sort.Direction.DESC, "date", "id"))
                .stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    public ContraVoucherResponseDTO getById(Long id) {
        return toResponseDTO(findOrThrow(id));
    }

    public ContraVoucherResponseDTO create(ContraVoucherRequestDTO req) {
        if (req.getFromAccountCode() != null && req.getFromAccountCode().equals(req.getToAccountCode())) {
            throw new BusinessRuleViolationException("From and To accounts must be different");
        }
        ContraVoucher v = new ContraVoucher();
        v.setVoucherNo(voucherNumberService.next("CV"));
        v.setDate(req.getDate() != null ? req.getDate() : LocalDate.now());
        v.setFromAccountCode(req.getFromAccountCode());
        v.setFromAccountName(req.getFromAccountName());
        v.setToAccountCode(req.getToAccountCode());
        v.setToAccountName(req.getToAccountName());
        v.setAmount(req.getAmount() != null ? req.getAmount() : BigDecimal.ZERO);
        v.setNarration(req.getNarration());
        v.setReference(req.getReference());
        v.setStatus("DRAFT");
        ContraVoucher saved = contraVoucherRepository.save(v);
        return toResponseDTO(saved);
    }

    public ContraVoucherResponseDTO post(Long id) {
        ContraVoucher v = findOrThrow(id);
        if (!"DRAFT".equalsIgnoreCase(v.getStatus())) {
            throw new BusinessRuleViolationException("Only DRAFT contra vouchers can be posted");
        }
        financialEventService.onContraVoucherPosted(v);
        v.setStatus("POSTED");
        ContraVoucher saved = contraVoucherRepository.save(v);
        return toResponseDTO(saved);
    }

    public ContraVoucherResponseDTO cancel(Long id) {
        ContraVoucher v = findOrThrow(id);
        if (!"DRAFT".equalsIgnoreCase(v.getStatus())) {
            throw new BusinessRuleViolationException("Only DRAFT contra vouchers can be cancelled");
        }
        v.setStatus("CANCELLED");
        ContraVoucher saved = contraVoucherRepository.save(v);
        return toResponseDTO(saved);
    }

    private ContraVoucher findOrThrow(Long id) {
        return contraVoucherRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Contra Voucher not found: " + id));
    }

    private ContraVoucherResponseDTO toResponseDTO(ContraVoucher v) {
        Long jvId = journalEntrySourceRepository
                .findBySourceEntityTypeAndSourceEntityId("ContraVoucher", v.getId())
                .map(s -> s.getJournalVoucherId()).orElse(null);
        return ContraVoucherResponseDTO.fromEntity(v, jvId);
    }
}
