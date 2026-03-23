package com.company.project.repositories;

import com.company.project.entities.AccountHead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AccountHeadRepository extends JpaRepository<AccountHead, Long> {

    Optional<AccountHead> findByCode(String code);

    List<AccountHead> findByTypeOrderByCodeAsc(String type);

    List<AccountHead> findByIsActiveTrueOrderByCodeAsc();

    List<AccountHead> findAllByOrderByCodeAsc();

    List<AccountHead> findByParentIdOrderByCodeAsc(Long parentId);

    int countByCostCenter(String costCenter);
}
