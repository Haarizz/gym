package com.company.project.repositories;

import com.company.project.entities.MemberCancellationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MemberCancellationRequestRepository extends JpaRepository<MemberCancellationRequest, Long> {

    List<MemberCancellationRequest> findByStatusOrderByRequestedAtAsc(String status);

    List<MemberCancellationRequest> findTop100ByStatusNotOrderByDecidedAtDesc(String status);

    Optional<MemberCancellationRequest> findFirstByMemberDbIdAndStatus(Long memberDbId, String status);
}
