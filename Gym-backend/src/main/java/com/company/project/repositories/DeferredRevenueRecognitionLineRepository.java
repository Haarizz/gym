package com.company.project.repositories;

import com.company.project.entities.DeferredRevenueRecognitionLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface DeferredRevenueRecognitionLineRepository extends JpaRepository<DeferredRevenueRecognitionLine, Long> {

    List<DeferredRevenueRecognitionLine> findByStatusAndPeriodEndLessThanEqual(String status, LocalDate periodEnd);

    List<DeferredRevenueRecognitionLine> findByScheduleIdOrderByPeriodNumberAsc(Long scheduleId);
}
