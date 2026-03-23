package com.company.project.repositories;

import com.company.project.entities.JournalVoucher;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JournalVoucherRepository extends JpaRepository<JournalVoucher, Long> {

    List<JournalVoucher> findAllByOrderByDateDesc();

    Optional<JournalVoucher> findTopByVoucherNoStartingWithOrderByVoucherNoDesc(String prefix);

    List<JournalVoucher> findByStatusOrderByDateDesc(String status);
}
