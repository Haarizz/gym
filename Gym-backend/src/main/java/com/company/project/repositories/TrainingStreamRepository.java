package com.company.project.repositories;

import com.company.project.entities.TrainingStream;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TrainingStreamRepository extends JpaRepository<TrainingStream, Long> {

    List<TrainingStream> findByStatus(String status);

    List<TrainingStream> findByCategory(String category);

    List<TrainingStream> findByStatusAndCategory(String status, String category);

    @Query("SELECT s.category, COUNT(s) FROM TrainingStream s GROUP BY s.category")
    List<Object[]> countByCategory();

    @Query("SELECT COUNT(s) FROM TrainingStream s WHERE s.status = 'Live'")
    long countLive();

    @Query("SELECT COUNT(s) FROM TrainingStream s WHERE s.status = 'Scheduled'")
    long countScheduled();

    @Query("SELECT COALESCE(SUM(s.participants), 0) FROM TrainingStream s WHERE s.status = 'Live'")
    long sumActiveParticipants();

    @Query("SELECT COALESCE(AVG(s.views), 0) FROM TrainingStream s")
    double avgViews();

    @Query("SELECT COALESCE(SUM(s.views), 0) FROM TrainingStream s")
    long sumViews();
}
