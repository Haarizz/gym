package com.company.project.repositories;

import com.company.project.entities.PaymentVoucher;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface PaymentVoucherRepository extends JpaRepository<PaymentVoucher, Long> {

    List<PaymentVoucher> findAllByOrderByPaymentDateDesc();

    List<PaymentVoucher> findByStatusOrderByPaymentDateDesc(String status);

    List<PaymentVoucher> findBySupplierTypeOrderByPaymentDateDesc(String supplierType);

    /** Date-range filtering pushed to SQL — used by LedgerTransactionService. */
    List<PaymentVoucher> findByPaymentDateBetweenOrderByPaymentDateDesc(LocalDate from, LocalDate to);
}
