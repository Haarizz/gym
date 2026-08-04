package com.company.project.repositories;

import com.company.project.entities.PromotionAccessDaysAudit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PromotionAccessDaysAuditRepository extends JpaRepository<PromotionAccessDaysAudit, Long> {

    boolean existsByPromotionIdAndMemberId(Long promotionId, Long memberId);

    List<PromotionAccessDaysAudit> findByPromotionId(Long promotionId);
}
