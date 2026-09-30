package com.company.project.repositories;

import com.company.project.entities.PrintTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrintTemplateRepository extends JpaRepository<PrintTemplate, Long> {

    List<PrintTemplate> findAllByOrderByCategoryAscNameAsc();

    List<PrintTemplate> findByCategoryOrderByNameAsc(String category);
}
