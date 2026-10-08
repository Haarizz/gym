package com.company.project.repositories;

import com.company.project.entities.PosCorrection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface PosCorrectionRepository extends JpaRepository<PosCorrection, Long>, JpaSpecificationExecutor<PosCorrection> {

    /** Open (not yet applied / rejected / cancelled) corrections of one record. */
    List<PosCorrection> findByTargetTypeAndTargetIdAndStatusIn(String targetType, Long targetId, Collection<String> statuses);

    List<PosCorrection> findByTargetTypeAndTargetIdOrderByCreatedAtDesc(String targetType, Long targetId);
}
