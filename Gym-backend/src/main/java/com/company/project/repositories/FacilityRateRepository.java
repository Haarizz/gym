package com.company.project.repositories;

import com.company.project.entities.FacilityRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FacilityRateRepository extends JpaRepository<FacilityRate, Long> {

    List<FacilityRate> findByFacilityId(Long facilityId);

    void deleteByFacilityId(Long facilityId);
}
