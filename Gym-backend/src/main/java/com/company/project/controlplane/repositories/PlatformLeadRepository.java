package com.company.project.controlplane.repositories;

import com.company.project.controlplane.entities.PlatformLead;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlatformLeadRepository extends JpaRepository<PlatformLead, Long> {

    Page<PlatformLead> findByStage(String stage, Pageable pageable);

    @Query("""
        SELECT p FROM PlatformLead p
        WHERE p.stage = :stage
          AND (:search IS NULL OR :search = '' OR
               LOWER(p.businessName) LIKE LOWER(CONCAT('%', :search, '%')) OR
               LOWER(p.contactName) LIKE LOWER(CONCAT('%', :search, '%')) OR
               LOWER(p.contactEmail) LIKE LOWER(CONCAT('%', :search, '%')))
        """)
    Page<PlatformLead> searchByStage(@Param("stage") String stage, @Param("search") String search, Pageable pageable);

    long countByStage(String stage);

    java.util.List<PlatformLead> findByGymTenantId(Long gymTenantId);
}
