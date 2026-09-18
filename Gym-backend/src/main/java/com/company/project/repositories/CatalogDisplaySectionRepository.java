package com.company.project.repositories;

import com.company.project.entities.CatalogDisplaySection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CatalogDisplaySectionRepository extends JpaRepository<CatalogDisplaySection, Long> {

    List<CatalogDisplaySection> findAllByOrderBySortOrderAsc();

    boolean existsBySectionKeyIgnoreCase(String sectionKey);
}
