package com.company.project.services;

import com.company.project.dto.ReceiptVoucherRequestDTO;
import com.company.project.dto.ReceiptVoucherResponseDTO;
import com.company.project.entities.ReceiptVoucher;
import com.company.project.repositories.ReceiptVoucherRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class ReceiptVoucherService {

    private final ReceiptVoucherRepository receiptVoucherRepository;

    public ReceiptVoucherService(ReceiptVoucherRepository receiptVoucherRepository) {
        this.receiptVoucherRepository = receiptVoucherRepository;
    }

    private synchronized String generateVoucherNo() {
        int year = LocalDate.now().getYear();
        String prefix = "RV-" + year + "-";
        Optional<ReceiptVoucher> last = receiptVoucherRepository
                .findTopByVoucherNoStartingWithOrderByVoucherNoDesc(prefix);
        int seq = last.map(rv -> {
            try {
                return Integer.parseInt(rv.getVoucherNo().substring(prefix.length())) + 1;
            } catch (NumberFormatException e) {
                return 1;
            }
        }).orElse(1);
        return String.format("%s%05d", prefix, seq);
    }

    public List<ReceiptVoucherResponseDTO> getReceiptVouchers(
            String search, String status, String branch,
            String sourceCategory, LocalDate from, LocalDate to) {
        List<ReceiptVoucher> all = receiptVoucherRepository.findAllByOrderByDateDesc();
        return all.stream()
                .filter(rv -> {
                    if (search == null || search.isBlank()) return true;
                    String s = search.toLowerCase(Locale.ROOT);
                    return (rv.getVoucherNo() != null && rv.getVoucherNo().toLowerCase(Locale.ROOT).contains(s))
                            || (rv.getMemberName() != null && rv.getMemberName().toLowerCase(Locale.ROOT).contains(s))
                            || (rv.getSource() != null && rv.getSource().toLowerCase(Locale.ROOT).contains(s))
                            || (rv.getReference() != null && rv.getReference().toLowerCase(Locale.ROOT).contains(s));
                })
                .filter(rv -> status == null || status.isBlank() || status.equalsIgnoreCase("all")
                        || (rv.getStatus() != null && rv.getStatus().equalsIgnoreCase(status)))
                .filter(rv -> branch == null || branch.isBlank()
                        || (rv.getBranch() != null && rv.getBranch().equalsIgnoreCase(branch)))
                .filter(rv -> sourceCategory == null || sourceCategory.isBlank() || sourceCategory.equalsIgnoreCase("all")
                        || (rv.getSourceCategory() != null && rv.getSourceCategory().equalsIgnoreCase(sourceCategory)))
                .filter(rv -> from == null || (rv.getDate() != null && !rv.getDate().isBefore(from)))
                .filter(rv -> to == null || (rv.getDate() != null && !rv.getDate().isAfter(to)))
                .map(ReceiptVoucherResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public ReceiptVoucherResponseDTO getReceiptVoucherById(Long id) {
        ReceiptVoucher rv = receiptVoucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Receipt Voucher not found: " + id));
        return ReceiptVoucherResponseDTO.fromEntity(rv);
    }

    public ReceiptVoucherResponseDTO createReceiptVoucher(ReceiptVoucherRequestDTO req) {
        ReceiptVoucher rv = new ReceiptVoucher();
        rv.setVoucherNo(generateVoucherNo());
        applyRequest(rv, req);
        rv.setStatus(req.getStatus() != null && !req.getStatus().isBlank() ? req.getStatus() : "draft");
        return ReceiptVoucherResponseDTO.fromEntity(receiptVoucherRepository.save(rv));
    }

    public ReceiptVoucherResponseDTO updateReceiptVoucher(Long id, ReceiptVoucherRequestDTO req) {
        ReceiptVoucher rv = receiptVoucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Receipt Voucher not found: " + id));
        applyRequest(rv, req);
        if (req.getStatus() != null && !req.getStatus().isBlank()) {
            rv.setStatus(req.getStatus());
        }
        return ReceiptVoucherResponseDTO.fromEntity(receiptVoucherRepository.save(rv));
    }

    public ReceiptVoucherResponseDTO updateStatus(Long id, String status) {
        ReceiptVoucher rv = receiptVoucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Receipt Voucher not found: " + id));
        rv.setStatus(status);
        return ReceiptVoucherResponseDTO.fromEntity(receiptVoucherRepository.save(rv));
    }

    public void deleteReceiptVoucher(Long id) {
        ReceiptVoucher rv = receiptVoucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Receipt Voucher not found: " + id));
        receiptVoucherRepository.delete(rv);
    }

    private void applyRequest(ReceiptVoucher rv, ReceiptVoucherRequestDTO req) {
        rv.setDate(req.getDate() != null ? req.getDate() : LocalDate.now());
        rv.setSource(req.getSource());
        rv.setSourceCategory(req.getSourceCategory());
        rv.setMemberId(req.getMemberId());
        rv.setMemberName(req.getMemberName());
        rv.setAmount(req.getAmount() != null ? req.getAmount() : BigDecimal.ZERO);
        rv.setPaymentMode(req.getPaymentMode());
        rv.setBranch(req.getBranch());
        rv.setReference(req.getReference());
        rv.setNotes(req.getNotes());
        rv.setTransactionId(req.getTransactionId());
        rv.setApprovedBy(req.getApprovedBy());
        rv.setVoucherType(req.getVoucherType());
    }
}
