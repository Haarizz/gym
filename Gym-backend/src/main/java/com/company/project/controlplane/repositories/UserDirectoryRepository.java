package com.company.project.controlplane.repositories;

import com.company.project.controlplane.entities.UserDirectoryEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserDirectoryRepository extends JpaRepository<UserDirectoryEntry, Long> {
    Optional<UserDirectoryEntry> findByUsernameOrEmail(String username, String email);
    boolean existsByUsername(String username);
}
