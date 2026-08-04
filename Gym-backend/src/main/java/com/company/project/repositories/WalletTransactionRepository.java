package com.company.project.repositories;

import com.company.project.entities.WalletTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {

    List<WalletTransaction> findByMemberIdOrderByCreatedAtDesc(String memberId);
}
