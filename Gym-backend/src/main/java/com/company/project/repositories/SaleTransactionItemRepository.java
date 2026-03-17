package com.company.project.repositories;

import com.company.project.entities.SaleTransactionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SaleTransactionItemRepository extends JpaRepository<SaleTransactionItem, Long> {

    List<SaleTransactionItem> findByTransactionId(Long transactionId);

    void deleteByTransactionId(Long transactionId);
}
