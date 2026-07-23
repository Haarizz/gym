package com.company.project.repositories;

import com.company.project.entities.WastageReturn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.List;

public interface WastageReturnRepository extends JpaRepository<WastageReturn, Long>, JpaSpecificationExecutor<WastageReturn> {
    List<WastageReturn> findByStatus(String status);
    List<WastageReturn> findByType(String type);
}
