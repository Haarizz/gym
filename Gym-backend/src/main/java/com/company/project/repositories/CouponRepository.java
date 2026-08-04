package com.company.project.repositories;

import com.company.project.entities.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CouponRepository extends JpaRepository<Coupon, Long> {

    Optional<Coupon> findByCode(String code);

    Optional<Coupon> findByRewardId(Long rewardId);

    boolean existsByCode(String code);
}
