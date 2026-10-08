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

    Optional<PosSession> findFirstByStatusAndOpenedByOrderByOpenedAtDesc(String status, String openedBy);

    /** A user's current session: OPEN or SUSPENDED. */
    Optional<PosSession> findFirstByStatusInAndOpenedByOrderByOpenedAtDesc(java.util.Collection<String> statuses, String openedBy);

    List<PosSession> findByStatusInOrderByOpenedAtDesc(java.util.Collection<String> statuses);

    /** Earliest business date before `before` that still has sessions outside a Day Close. */
    @org.springframework.data.jpa.repository.Query("SELECT MIN(s.businessDate) FROM PosSession s WHERE s.dayCloseId IS NULL AND s.businessDate < :before")
    java.time.LocalDate firstUnclosedDayBefore(@org.springframework.data.repository.query.Param("before") java.time.LocalDate before);

    /** Sessions of a business day; sessions predating business_date fall back to the day they were opened. */
    @org.springframework.data.jpa.repository.Query("SELECT s FROM PosSession s WHERE s.businessDate = :day " +
           "OR (s.businessDate IS NULL AND s.openedAt >= :start AND s.openedAt < :end) ORDER BY s.openedAt ASC")
    List<PosSession> findForBusinessDate(@org.springframework.data.repository.query.Param("day") java.time.LocalDate day,
                                         @org.springframework.data.repository.query.Param("start") java.time.LocalDateTime start,
                                         @org.springframework.data.repository.query.Param("end") java.time.LocalDateTime end);

    default List<PosSession> findByBusinessDateOrderByOpenedAtAsc(java.time.LocalDate day) {
        return findForBusinessDate(day, day.atStartOfDay(), day.plusDays(1).atStartOfDay());
    }

    /** The open / suspended session holding a terminal. */
    Optional<PosSession> findFirstByTerminalIdAndStatusInOrderByOpenedAtDesc(Long terminalId, java.util.Collection<String> statuses);
}
