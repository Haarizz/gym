package com.company.project.repositories;

import com.company.project.entities.PosTerminal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PosTerminalRepository extends JpaRepository<PosTerminal, Long> {

    Optional<PosTerminal> findFirstByTerminalCode(String terminalCode);

    Optional<PosTerminal> findFirstByDeviceFingerprintAndBranchIdAndStatusNotOrderByIdDesc(String deviceFingerprint, Long branchId, String status);

    List<PosTerminal> findByBranchIdOrderByIdAsc(Long branchId);

    long countByBranchIdAndStatusNotIn(Long branchId, Collection<String> statuses);

    long countByBranchId(Long branchId);

    long countByCounterIdAndStatusNotIn(Long counterId, Collection<String> statuses);

    List<PosTerminal> findByCounterId(Long counterId);
}
