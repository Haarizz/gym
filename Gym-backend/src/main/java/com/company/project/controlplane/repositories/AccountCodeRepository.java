package com.company.project.controlplane.repositories;

import com.company.project.controlplane.entities.AccountCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AccountCodeRepository extends JpaRepository<AccountCode, Long> {
    /** The account's latest code for this purpose — only the latest one is ever valid. */
    Optional<AccountCode> findFirstByGlobalUserIdAndPurposeOrderByCreatedAtDesc(Long globalUserId, String purpose);
}
