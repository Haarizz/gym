package com.company.project.controlplane.repositories;

import com.company.project.controlplane.entities.AccountLinkRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AccountLinkRequestRepository extends JpaRepository<AccountLinkRequest, Long> {
    List<AccountLinkRequest> findByGlobalUserIdAndStatusOrderByCreatedAtDesc(Long globalUserId, String status);
    List<AccountLinkRequest> findByTenantSlugAndMemberIdAndStatus(String tenantSlug, Long memberId, String status);
}
