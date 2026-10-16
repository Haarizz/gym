package com.company.project.repositories;

import com.company.project.entities.CommissionEarning;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CommissionEarningRepository extends JpaRepository<CommissionEarning, Long> {

    java.util.List<CommissionEarning> findByPeriodYearAndPeriodMonth(Integer periodYear, Integer periodMonth);
    java.util.List<CommissionEarning> findByPeriodYearAndPeriodMonthAndStatusIn(Integer periodYear, Integer periodMonth, java.util.Collection<String> statuses);
    java.util.Optional<CommissionEarning> findByStaffIdAndPeriodYearAndPeriodMonthAndCategory(Long staffId, Integer periodYear, Integer periodMonth, String category);
}
