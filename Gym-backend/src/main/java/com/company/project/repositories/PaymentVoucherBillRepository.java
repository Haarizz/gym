package com.company.project.repositories;

import com.company.project.entities.PaymentVoucherBill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentVoucherBillRepository extends JpaRepository<PaymentVoucherBill, Long> {

    List<PaymentVoucherBill> findByPaymentVoucherId(Long paymentVoucherId);

    void deleteByPaymentVoucherId(Long paymentVoucherId);
}
