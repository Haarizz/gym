package com.company.project.repositories;

import com.company.project.entities.UserBranch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserBranchRepository extends JpaRepository<UserBranch, Long> {

    List<UserBranch> findByUserId(Long userId);

    List<UserBranch> findByBranchId(Long branchId);

    boolean existsByUserIdAndBranchId(Long userId, Long branchId);

    void deleteByUserIdAndBranchId(Long userId, Long branchId);

    void deleteByUserId(Long userId);

    @Query("SELECT ub.branchId FROM UserBranch ub WHERE ub.userId = :userId")
    List<Long> findBranchIdsByUserId(@Param("userId") Long userId);
}
