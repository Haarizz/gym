package com.company.project.repositories;

import com.company.project.entities.FollowUp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface FollowUpRepository extends JpaRepository<FollowUp, Long>, JpaSpecificationExecutor<FollowUp> {

    Optional<FollowUp> findByFollowUpId(String followUpId);

    long countByStatus(String status);

    List<FollowUp> findByStatusAndDueDateBefore(String status, LocalDateTime dateTime);

    List<FollowUp> findTop5ByStatusOrderByDueDateAsc(String status);
}
