package com.company.project.repositories;

import com.company.project.entities.ShiftAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ShiftAssignmentRepository extends JpaRepository<ShiftAssignment, Long> {

    java.util.List<ShiftAssignment> findByStaffIdOrderByEffectiveFromDesc(Long staffId);
    java.util.List<ShiftAssignment> findByShiftId(Long shiftId);
}
