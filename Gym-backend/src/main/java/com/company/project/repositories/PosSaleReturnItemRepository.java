package com.company.project.repositories;

import com.company.project.entities.PosSaleReturnItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface PosSaleReturnItemRepository extends JpaRepository<PosSaleReturnItem, Long> {

    List<PosSaleReturnItem> findByReturnId(Long returnId);

    List<PosSaleReturnItem> findByReturnIdIn(Collection<Long> returnIds);
}
