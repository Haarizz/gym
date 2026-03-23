package com.company.project.services;

import com.company.project.dto.PaymentVoucherBillDTO;
import com.company.project.dto.PaymentVoucherRequestDTO;
import com.company.project.dto.PaymentVoucherResponseDTO;
import com.company.project.entities.PaymentVoucher;
import com.company.project.entities.PaymentVoucherBill;
import com.company.project.repositories.PaymentVoucherBillRepository;
import com.company.project.repositories.PaymentVoucherRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class PaymentVoucherService {

    private final PaymentVoucherRepository paymentVoucherRepository;
    private final PaymentVoucherBillRepository billRepository;

    public PaymentVoucherService(PaymentVoucherRepository paymentVoucherRepository,
                                 PaymentVoucherBillRepository billRepository) {
        this.paymentVoucherRepository = paymentVoucherRepository;
        this.billRepository = billRepository;
    }

    private synchronized String generateVoucherNo() {
        int year = LocalDate.now().getYear();
        String prefix = "PV-" + year + "-";
        Optional<PaymentVoucher> last = paymentVoucherRepository
                .findTopByVoucherNoStartingWithOrderByVoucherNoDesc(prefix);
        int seq = last.map(pv -> {
            try {
                return Integer.parseInt(pv.getVoucherNo().substring(prefix.length())) + 1;
            } catch (NumberFormatException e) {
                return 1;
            }
        }).orElse(1);
        return String.format("%s%05d", prefix, seq);
    }

    public List<PaymentVoucherResponseDTO> getPaymentVouchers(
            String search, String status, String supplierType) {
        List<PaymentVoucher> all = paymentVoucherRepository.findAllByOrderByPaymentDateDesc();
        return all.stream()
                .filter(pv -> {
                    if (search == null || search.isBlank()) return true;
                    String s = search.toLowerCase(Locale.ROOT);
                    return (pv.getVoucherNo() != null && pv.getVoucherNo().toLowerCase(Locale.ROOT).contains(s))
                            || (pv.getSupplierName() != null && pv.getSupplierName().toLowerCase(Locale.ROOT).contains(s))
                            || (pv.getBillNo() != null && pv.getBillNo().toLowerCase(Locale.ROOT).contains(s))
                            || (pv.getDescription() != null && pv.getDescription().toLowerCase(Locale.ROOT).contains(s));
                })
                .filter(pv -> status == null || status.isBlank() || status.equalsIgnoreCase("all")
                        || (pv.getStatus() != null && pv.getStatus().equalsIgnoreCase(status)))
                .filter(pv -> supplierType == null || supplierType.isBlank() || supplierType.equalsIgnoreCase("all")
                        || (pv.getSupplierType() != null && pv.getSupplierType().equalsIgnoreCase(supplierType)))
                .map(pv -> {
                    List<PaymentVoucherBill> bills = billRepository.findByPaymentVoucherId(pv.getId());
                    return PaymentVoucherResponseDTO.fromEntity(pv, bills);
                })
                .collect(Collectors.toList());
    }

    public PaymentVoucherResponseDTO getPaymentVoucherById(Long id) {
        PaymentVoucher pv = paymentVoucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment Voucher not found: " + id));
        List<PaymentVoucherBill> bills = billRepository.findByPaymentVoucherId(id);
        return PaymentVoucherResponseDTO.fromEntity(pv, bills);
    }

    public PaymentVoucherResponseDTO createPaymentVoucher(PaymentVoucherRequestDTO req) {
        PaymentVoucher pv = new PaymentVoucher();
        pv.setVoucherNo(generateVoucherNo());
        applyRequest(pv, req);
        pv.setStatus(req.getStatus() != null && !req.getStatus().isBlank() ? req.getStatus() : "Pending");
        PaymentVoucher saved = paymentVoucherRepository.save(pv);
        List<PaymentVoucherBill> bills = saveBills(saved.getId(), req.getBills());
        return PaymentVoucherResponseDTO.fromEntity(saved, bills);
    }

    public PaymentVoucherResponseDTO updatePaymentVoucher(Long id, PaymentVoucherRequestDTO req) {
        PaymentVoucher pv = paymentVoucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment Voucher not found: " + id));
        applyRequest(pv, req);
        if (req.getStatus() != null && !req.getStatus().isBlank()) {
            pv.setStatus(req.getStatus());
        }
        PaymentVoucher saved = paymentVoucherRepository.save(pv);
        // Replace bills
        billRepository.deleteByPaymentVoucherId(id);
        List<PaymentVoucherBill> bills = saveBills(id, req.getBills());
        return PaymentVoucherResponseDTO.fromEntity(saved, bills);
    }

    public PaymentVoucherResponseDTO updateStatus(Long id, String status) {
        PaymentVoucher pv = paymentVoucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment Voucher not found: " + id));
        pv.setStatus(status);
        PaymentVoucher saved = paymentVoucherRepository.save(pv);
        List<PaymentVoucherBill> bills = billRepository.findByPaymentVoucherId(id);
        return PaymentVoucherResponseDTO.fromEntity(saved, bills);
    }

    public void deletePaymentVoucher(Long id) {
        PaymentVoucher pv = paymentVoucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment Voucher not found: " + id));
        billRepository.deleteByPaymentVoucherId(id);
        paymentVoucherRepository.delete(pv);
    }

    private void applyRequest(PaymentVoucher pv, PaymentVoucherRequestDTO req) {
        pv.setSupplierName(req.getSupplierName());
        pv.setSupplierType(req.getSupplierType() != null ? req.getSupplierType() : "Supplier");
        pv.setBillNo(req.getBillNo());
        pv.setPaymentDate(req.getPaymentDate() != null ? req.getPaymentDate() : LocalDate.now());
        pv.setAmount(req.getAmount() != null ? req.getAmount() : BigDecimal.ZERO);
        pv.setPaymentMethod(req.getPaymentMethod());
        pv.setDescription(req.getDescription());
        pv.setBankAccount(req.getBankAccount());
        pv.setChequeNo(req.getChequeNo());
        pv.setChequeDate(req.getChequeDate());
        pv.setNotes(req.getNotes());
    }

    private List<PaymentVoucherBill> saveBills(Long paymentVoucherId, List<PaymentVoucherBillDTO> billDTOs) {
        if (billDTOs == null || billDTOs.isEmpty()) return Collections.emptyList();
        return billDTOs.stream().map(dto -> {
            PaymentVoucherBill bill = new PaymentVoucherBill();
            bill.setPaymentVoucherId(paymentVoucherId);
            bill.setBillNo(dto.getBillNo());
            bill.setBillDate(dto.getBillDate());
            bill.setOriginalAmount(dto.getOriginalAmount() != null ? dto.getOriginalAmount() : BigDecimal.ZERO);
            bill.setPaidAmount(dto.getPaidAmount() != null ? dto.getPaidAmount() : BigDecimal.ZERO);
            bill.setRemainingBalance(dto.getRemainingBalance() != null ? dto.getRemainingBalance() : BigDecimal.ZERO);
            bill.setDueDate(dto.getDueDate());
            bill.setStatus(dto.getStatus() != null ? dto.getStatus() : "Pending");
            return billRepository.save(bill);
        }).collect(Collectors.toList());
    }
}
