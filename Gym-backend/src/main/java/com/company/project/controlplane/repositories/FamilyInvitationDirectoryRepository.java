package com.company.project.controlplane.repositories;

import com.company.project.controlplane.entities.FamilyInvitationDirectoryEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FamilyInvitationDirectoryRepository extends JpaRepository<FamilyInvitationDirectoryEntry, Long> {
    List<FamilyInvitationDirectoryEntry> findByRecipientEmailAndStatus(String recipientEmail, String status);
    Optional<FamilyInvitationDirectoryEntry> findByTenantSlugAndInvitationId(String tenantSlug, Long invitationId);
}
