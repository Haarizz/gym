package com.company.project.repositories;

import com.company.project.entities.PosDayClose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PosDayCloseRepository extends JpaRepository<PosDayClose, Long> {

    Optional<PosDayClose> findFirstByBusinessDate(LocalDate businessDate);

    List<PosDayClose> findByBusinessDateBetweenOrderByBusinessDateDesc(LocalDate from, LocalDate to);

    List<PosDayClose> findTop60ByOrderByBusinessDateDesc();
}
