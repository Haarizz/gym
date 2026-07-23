package com.company.project.repositories;

import com.company.project.entities.PaymentVoucher;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentVoucherRepository extends JpaRepository<PaymentVoucher, Long> {

    List<PaymentVoucher> findAllByOrderByPaymentDateDesc();

    Optional<PaymentVoucher> findTopByVoucherNoStartingWithOrderByVoucherNoDesc(String prefix);

    List<PaymentVoucher> findByStatusOrderByPaymentDateDesc(String status);

    List<PaymentVoucher> findBySupplierTypeOrderByPaymentDateDesc(String supplierType);
}
