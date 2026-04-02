package com.company.project.repositories;

import com.company.project.entities.Facility;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FacilityRepository extends JpaRepository<Facility, Long> {

    List<Facility> findByStatus(String status);

    Optional<Facility> findByFacilityId(String facilityId);

    @Query("SELECT COUNT(f) FROM Facility f WHERE f.status = 'Active'")
    long countActive();
}
