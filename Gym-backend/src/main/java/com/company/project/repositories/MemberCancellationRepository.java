package com.company.project.repositories;

import com.company.project.entities.MemberCancellation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MemberCancellationRepository extends JpaRepository<MemberCancellation, Long> {

    List<MemberCancellation> findByMemberDbIdOrderByCancelledAtDesc(Long memberDbId);
}
