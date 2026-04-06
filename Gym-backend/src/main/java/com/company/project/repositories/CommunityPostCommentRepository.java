package com.company.project.repositories;

import com.company.project.entities.CommunityPostComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommunityPostCommentRepository extends JpaRepository<CommunityPostComment, Long> {

    List<CommunityPostComment> findByPostIdOrderByCreatedAtAsc(Long postId);

    @Modifying
    @Query("delete from CommunityPostComment c where c.post.id = :postId")
    void deleteByPostId(@Param("postId") Long postId);
}
