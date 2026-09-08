package com.company.project.repositories;

import com.company.project.entities.PaymentVoucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDate;
import java.util.List;

public interface PaymentVoucherRepository extends JpaRepository<PaymentVoucher, Long>, JpaSpecificationExecutor<PaymentVoucher> {

    List<PaymentVoucher> findAllByOrderByPaymentDateDesc();

    List<PaymentVoucher> findByStatusOrderByPaymentDateDesc(String status);

    List<PaymentVoucher> findBySupplierTypeOrderByPaymentDateDesc(String supplierType);

    /** Date-range filtering pushed to SQL — used by LedgerTransactionService. */
    List<PaymentVoucher> findByPaymentDateBetweenOrderByPaymentDateDesc(LocalDate from, LocalDate to);
}
