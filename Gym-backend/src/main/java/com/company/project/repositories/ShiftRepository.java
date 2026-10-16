package com.company.project.repositories;

import com.company.project.entities.Shift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ShiftRepository extends JpaRepository<Shift, Long> {

    java.util.List<Shift> findAllByOrderByCheckInAsc();
}
