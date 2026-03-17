package com.company.project.repositories;

import com.company.project.entities.PosSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PosSessionRepository extends JpaRepository<PosSession, Long>, JpaSpecificationExecutor<PosSession> {

    Optional<PosSession> findFirstByStatusOrderByOpenedAtDesc(String status);

    List<PosSession> findByStatusOrderByOpenedAtDesc(String status);
}
