package com.company.project.repositories;

import com.company.project.entities.ReceiptVoucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface ReceiptVoucherRepository extends JpaRepository<ReceiptVoucher, Long>,
        JpaSpecificationExecutor<ReceiptVoucher> {

    List<ReceiptVoucher> findAllByOrderByDateDesc();

    List<ReceiptVoucher> findByStatusOrderByDateDesc(String status);

    List<ReceiptVoucher> findBySourceCategoryOrderByDateDesc(String sourceCategory);

    @Query("SELECT COALESCE(SUM(rv.amount), 0) FROM ReceiptVoucher rv WHERE rv.status = 'completed'")
    BigDecimal sumCompleted();

    @Query("SELECT COUNT(rv) FROM ReceiptVoucher rv WHERE rv.status = :status")
    long countByStatus(@Param("status") String status);

    @Query("SELECT rv.sourceCategory, COALESCE(SUM(rv.amount), 0) FROM ReceiptVoucher rv WHERE LOWER(rv.status) = 'completed' GROUP BY rv.sourceCategory")
    List<Object[]> sumBySourceCategory();

    @Query("SELECT FUNCTION('YEAR', rv.date), FUNCTION('MONTH', rv.date), COALESCE(SUM(rv.amount), 0) FROM ReceiptVoucher rv WHERE LOWER(rv.status) = 'completed' AND rv.date >= :from AND rv.date <= :to GROUP BY FUNCTION('YEAR', rv.date), FUNCTION('MONTH', rv.date) ORDER BY FUNCTION('YEAR', rv.date), FUNCTION('MONTH', rv.date)")
    List<Object[]> sumByMonth(@Param("from") java.time.LocalDate from, @Param("to") java.time.LocalDate to);

    List<ReceiptVoucher> findByDateBetweenOrderByDateDesc(java.time.LocalDate from, java.time.LocalDate to);
}
