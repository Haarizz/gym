package com.company.project.repositories;

import com.company.project.entities.Gym;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GymRepository extends JpaRepository<Gym, Long> {

    List<Gym> findByStatus(String status);

    Optional<Gym> findBySlug(String slug);

    Optional<Gym> findByIsDefaultTrue();

    Optional<Gym> findByOwnerUserId(Long ownerUserId);

    boolean existsBySlug(String slug);
}
