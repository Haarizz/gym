package com.company.project.repositories;

import com.company.project.entities.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);
    List<Invoice> findByMemberIdOrderByIssueDateDesc(Long memberId);
    List<Invoice> findByStatus(String status);
    List<Invoice> findByDueDateBeforeAndStatusNot(LocalDate date, String status);
}
