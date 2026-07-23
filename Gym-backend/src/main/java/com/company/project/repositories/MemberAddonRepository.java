package com.company.project.repositories;

import com.company.project.entities.MemberAddon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface MemberAddonRepository extends JpaRepository<MemberAddon, Long>, JpaSpecificationExecutor<MemberAddon> {
}
