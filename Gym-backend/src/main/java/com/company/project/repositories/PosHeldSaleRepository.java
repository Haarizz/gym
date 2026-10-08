package com.company.project.repositories;

import com.company.project.entities.PosHeldSale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PosHeldSaleRepository extends JpaRepository<PosHeldSale, Long> {

    List<PosHeldSale> findAllByOrderByCreatedAtDesc();

    long countByPosSessionId(Long posSessionId);
}
