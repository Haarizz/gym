package com.company.project.controlplane.repositories;

import com.company.project.controlplane.entities.UserMembershipEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserMembershipRepository extends JpaRepository<UserMembershipEntry, Long> {
    List<UserMembershipEntry> findByGlobalUserId(Long globalUserId);
    List<UserMembershipEntry> findByTenantSlug(String tenantSlug);
    Optional<UserMembershipEntry> findByGlobalUserIdAndTenantSlug(Long globalUserId, String tenantSlug);
}
