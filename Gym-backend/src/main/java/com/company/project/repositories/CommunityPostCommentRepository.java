package com.company.project.repositories;

import com.company.project.entities.CommunityPostComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommunityPostCommentRepository extends JpaRepository<CommunityPostComment, Long> {

    List<CommunityPostComment> findByPostIdOrderByCreatedAtAsc(Long postId);
}

