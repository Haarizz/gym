package com.company.project.repositories;

import com.company.project.entities.CommunityPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CommunityPostRepository extends JpaRepository<CommunityPost, Long>, JpaSpecificationExecutor<CommunityPost> {
}
