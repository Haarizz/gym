package com.company.project.repositories;

import com.company.project.entities.BiosMonthlySnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface BiosMonthlySnapshotRepository extends JpaRepository<BiosMonthlySnapshot, Long> {
    List<BiosMonthlySnapshot> findByMonthBetween(LocalDate from, LocalDate to);
    boolean existsByBranchIdAndMonth(Long branchId, LocalDate month);
}
