package com.company.project.repositories;

import com.company.project.entities.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, Long> {
    List<UserRole> findByUserId(Long userId);
    long countByRoleId(Long roleId);
    void deleteByUserId(Long userId);
}
