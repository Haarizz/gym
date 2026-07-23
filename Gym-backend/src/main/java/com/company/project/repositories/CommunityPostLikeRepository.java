package com.company.project.repositories;

import com.company.project.entities.CommunityPostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CommunityPostLikeRepository extends JpaRepository<CommunityPostLike, Long> {

    Optional<CommunityPostLike> findByPostIdAndUserId(Long postId, Long userId);

    @Modifying
    @Query("delete from CommunityPostLike l where l.post.id = :postId")
    void deleteByPostId(@Param("postId") Long postId);

    @Query("select l.post.id from CommunityPostLike l where l.user.id = :userId and l.post.id in :postIds")
    List<Long> findLikedPostIds(@Param("userId") Long userId, @Param("postIds") List<Long> postIds);
}
