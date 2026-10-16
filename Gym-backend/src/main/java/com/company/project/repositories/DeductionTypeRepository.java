package com.company.project.repositories;

import com.company.project.entities.DeductionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeductionTypeRepository extends JpaRepository<DeductionType, Long> {

    java.util.List<DeductionType> findAllByOrderByIdAsc();
}
