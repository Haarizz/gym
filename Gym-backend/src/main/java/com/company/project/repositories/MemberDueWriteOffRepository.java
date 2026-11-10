package com.company.project.repositories;

import com.company.project.entities.MemberDueWriteOff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MemberDueWriteOffRepository extends JpaRepository<MemberDueWriteOff, Long> {

    boolean existsByReceiptId(Long receiptId);

    @Query("SELECT w FROM MemberDueWriteOff w WHERE w.writtenOffAt >= :from AND w.writtenOffAt < :to ORDER BY w.writtenOffAt DESC, w.id DESC")
    List<MemberDueWriteOff> findInPeriod(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    List<MemberDueWriteOff> findByReceiptIdIn(java.util.Collection<Long> receiptIds);
}
