package com.company.project.repositories;

import com.company.project.entities.DeferredRevenueSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeferredRevenueScheduleRepository extends JpaRepository<DeferredRevenueSchedule, Long> {

    List<DeferredRevenueSchedule> findByStatusOrderByStartDateDesc(String status);
}
