package com.company.project.repositories;

import com.company.project.entities.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findAllByOrderByDateDesc();

    List<Expense> findByStatusOrderByDateDesc(String status);

    List<Expense> findByCategoryOrderByDateDesc(String category);

    List<Expense> findByDateBetweenOrderByDateDesc(LocalDate from, LocalDate to);

    @Query("SELECT COALESCE(SUM(e.totalAmount), 0) FROM Expense e WHERE e.status = 'APPROVED'")
    BigDecimal sumApprovedTotal();

    @Query("SELECT COALESCE(SUM(e.taxAmount), 0) FROM Expense e WHERE e.status = 'APPROVED'")
    BigDecimal sumApprovedTax();

    @Query("SELECT e.category, COALESCE(SUM(e.totalAmount), 0) FROM Expense e WHERE e.status = 'APPROVED' GROUP BY e.category")
    List<Object[]> sumByCategory();

    @Query("SELECT COUNT(e) FROM Expense e WHERE e.status = :status")
    long countByStatus(@Param("status") String status);

    @Query("SELECT FUNCTION('YEAR', e.date), FUNCTION('MONTH', e.date), COALESCE(SUM(e.totalAmount), 0) FROM Expense e WHERE LOWER(e.status) = 'approved' AND e.date >= :from AND e.date <= :to GROUP BY FUNCTION('YEAR', e.date), FUNCTION('MONTH', e.date) ORDER BY FUNCTION('YEAR', e.date), FUNCTION('MONTH', e.date)")
    List<Object[]> sumByMonth(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
