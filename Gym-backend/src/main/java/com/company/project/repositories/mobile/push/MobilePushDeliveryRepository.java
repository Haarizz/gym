package com.company.project.repositories.mobile.push;

import com.company.project.entities.MobilePushDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

@Repository
public interface MobilePushDeliveryRepository extends JpaRepository<MobilePushDelivery, Long> {

    boolean existsByDeliveryKey(String deliveryKey);

    @Modifying
    long deleteByDeliveryKey(String deliveryKey);
}
