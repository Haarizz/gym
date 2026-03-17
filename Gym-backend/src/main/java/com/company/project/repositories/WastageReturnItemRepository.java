package com.company.project.repositories;

import com.company.project.entities.WastageReturnItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WastageReturnItemRepository extends JpaRepository<WastageReturnItem, Long> {
    List<WastageReturnItem> findByVoucherId(Long voucherId);
    void deleteByVoucherId(Long voucherId);
}
