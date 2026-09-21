package com.company.project.repositories;

import com.company.project.entities.BranchImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BranchImageRepository extends JpaRepository<BranchImage, Long> {

    List<BranchImage> findByBranchIdOrderBySortOrderAsc(Long branchId);

    List<BranchImage> findByBranchIdAndIsCoverTrue(Long branchId);
}
