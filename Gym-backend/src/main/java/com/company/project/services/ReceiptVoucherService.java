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
    private final NotificationService notificationService;

    public ReceiptVoucherService(ReceiptVoucherRepository receiptVoucherRepository,
                                  NotificationService notificationService) {
        this.receiptVoucherRepository = receiptVoucherRepository;
        this.notificationService = notificationService;
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
        ReceiptVoucher saved = receiptVoucherRepository.save(rv);
        notificationService.notifyRoles(
                List.of("ADMIN", "MANAGER", "ACCOUNTANT"),
                "Payment Received",
                "Receipt " + saved.getVoucherNo() + " created" +
                (saved.getAmount() != null ? " for AED " + saved.getAmount() : "") + ".",
                "SUCCESS", "MEDIUM", "BILLING",
                saved.getId(), "/receipt-voucher",
                "RECEIPT_CREATED_" + saved.getId()
        );
        return ReceiptVoucherResponseDTO.fromEntity(saved);
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

    /**
     * Internal helper — called by any module that receives a payment (Members,
     * Add-ons, POS, etc.) to automatically post a ReceiptVoucher into the
     * General Ledger / Financials module.  NOT exposed as an HTTP endpoint.
     */
    public void createVoucherFromModule(
            String source,
            String sourceCategory,
            String memberName,
            Long memberId,
            BigDecimal amount,
            String paymentMode,
            String reference,
            String transactionId,
            String notes) {

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) return;

        ReceiptVoucher rv = new ReceiptVoucher();
        rv.setVoucherNo(generateVoucherNo());
        rv.setDate(LocalDate.now());
        rv.setSource(source);
        rv.setSourceCategory(sourceCategory);
        rv.setMemberName(memberName);
        rv.setMemberId(memberId);
        rv.setAmount(amount);
        rv.setPaymentMode(paymentMode != null ? paymentMode : "Cash");
        rv.setReference(reference);
        rv.setTransactionId(transactionId);
        rv.setNotes(notes);
        rv.setStatus("completed");   // "completed" matches FinancialAnalyticsService query
        rv.setVoucherType("Receipt");

        ReceiptVoucher saved = receiptVoucherRepository.save(rv);

        notificationService.notifyRoles(
                List.of("ADMIN", "MANAGER", "ACCOUNTANT"),
                "Payment Received – " + sourceCategory,
                source + " | Voucher " + saved.getVoucherNo() + " | AED " + saved.getAmount(),
                "SUCCESS", "MEDIUM", "BILLING",
                saved.getId(), "/receipt-voucher",
                "RECEIPT_MODULE_" + saved.getId()
        );
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
