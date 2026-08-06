package com.company.project.services;

import com.company.project.dto.InvoiceDTO;
import com.company.project.dto.InvoiceLineDTO;
import com.company.project.entities.Invoice;
import com.company.project.entities.InvoiceLine;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.InvoiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final FinancialEventService financialEventService;
    private final VoucherNumberService voucherNumberService;

    public InvoiceService(InvoiceRepository invoiceRepository, 
                          FinancialEventService financialEventService,
                          VoucherNumberService voucherNumberService) {
        this.invoiceRepository = invoiceRepository;
        this.financialEventService = financialEventService;
        this.voucherNumberService = voucherNumberService;
    }

    public InvoiceDTO createInvoice(InvoiceDTO dto) {
        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber(voucherNumberService.next("INV"));
        invoice.setMemberId(dto.getMemberId());
        invoice.setMemberName(dto.getMemberName());
        invoice.setIssueDate(dto.getIssueDate() != null ? dto.getIssueDate() : LocalDate.now());
        invoice.setDueDate(dto.getDueDate() != null ? dto.getDueDate() : LocalDate.now().plusDays(15));
        invoice.setNotes(dto.getNotes());
        
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal taxTotal = BigDecimal.ZERO;

        if (dto.getLines() != null) {
            for (InvoiceLineDTO lineDto : dto.getLines()) {
                InvoiceLine line = new InvoiceLine();
                line.setDescription(lineDto.getDescription());
                line.setQuantity(lineDto.getQuantity() != null ? lineDto.getQuantity() : 1);
                line.setUnitPrice(lineDto.getUnitPrice() != null ? lineDto.getUnitPrice() : BigDecimal.ZERO);
                line.setTaxCode(lineDto.getTaxCode());
                line.setTaxAmount(lineDto.getTaxAmount() != null ? lineDto.getTaxAmount() : BigDecimal.ZERO);
                
                BigDecimal qty = new BigDecimal(line.getQuantity());
                BigDecimal lineTotal = line.getUnitPrice().multiply(qty).add(line.getTaxAmount());
                line.setLineTotal(lineTotal);
                
                subtotal = subtotal.add(line.getUnitPrice().multiply(qty));
                taxTotal = taxTotal.add(line.getTaxAmount());
                
                invoice.addLine(line);
            }
        }

        invoice.setSubtotal(subtotal);
        invoice.setTaxAmount(taxTotal);
        invoice.setDiscountAmount(dto.getDiscountAmount() != null ? dto.getDiscountAmount() : BigDecimal.ZERO);
        invoice.setTotalAmount(subtotal.add(taxTotal).subtract(invoice.getDiscountAmount()));
        invoice.setAmountPaid(BigDecimal.ZERO);
        invoice.setStatus(invoice.getTotalAmount().compareTo(BigDecimal.ZERO) == 0 ? "PAID" : "UNPAID");

        Invoice saved = invoiceRepository.save(invoice);

        if ("UNPAID".equals(saved.getStatus())) {
            financialEventService.onInvoiceIssued(saved);
        }

        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public InvoiceDTO getInvoice(Long id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Invoice not found with id " + id));
        return toDTO(invoice);
    }

    @Transactional(readOnly = true)
    public List<InvoiceDTO> getInvoicesByMember(Long memberId) {
        return invoiceRepository.findByMemberIdOrderByIssueDateDesc(memberId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<InvoiceDTO> getAllInvoices() {
        return invoiceRepository.findAll()
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public void markInvoiceAsPaid(Long invoiceId, BigDecimal amountPaid) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new EntityNotFoundException("Invoice not found with id " + invoiceId));
        
        BigDecimal newAmountPaid = invoice.getAmountPaid().add(amountPaid);
        invoice.setAmountPaid(newAmountPaid);
        
        if (newAmountPaid.compareTo(invoice.getTotalAmount()) >= 0) {
            invoice.setStatus("PAID");
        } else if (newAmountPaid.compareTo(BigDecimal.ZERO) > 0) {
            invoice.setStatus("PARTIAL");
        }
        
        invoiceRepository.save(invoice);
    }

    private InvoiceDTO toDTO(Invoice invoice) {
        InvoiceDTO dto = new InvoiceDTO();
        dto.setId(invoice.getId());
        dto.setInvoiceNumber(invoice.getInvoiceNumber());
        dto.setMemberId(invoice.getMemberId());
        dto.setMemberName(invoice.getMemberName());
        dto.setIssueDate(invoice.getIssueDate());
        dto.setDueDate(invoice.getDueDate());
        dto.setStatus(invoice.getStatus());
        dto.setSubtotal(invoice.getSubtotal());
        dto.setTaxAmount(invoice.getTaxAmount());
        dto.setDiscountAmount(invoice.getDiscountAmount());
        dto.setTotalAmount(invoice.getTotalAmount());
        dto.setAmountPaid(invoice.getAmountPaid());
        dto.setNotes(invoice.getNotes());
        dto.setCreatedAt(invoice.getCreatedAt());

        if (invoice.getLines() != null) {
            List<InvoiceLineDTO> lineDTOs = invoice.getLines().stream().map(line -> {
                InvoiceLineDTO lDto = new InvoiceLineDTO();
                lDto.setId(line.getId());
                lDto.setDescription(line.getDescription());
                lDto.setQuantity(line.getQuantity());
                lDto.setUnitPrice(line.getUnitPrice());
                lDto.setTaxCode(line.getTaxCode());
                lDto.setTaxAmount(line.getTaxAmount());
                lDto.setLineTotal(line.getLineTotal());
                return lDto;
            }).collect(Collectors.toList());
            dto.setLines(lineDTOs);
        }
        return dto;
    }
}
