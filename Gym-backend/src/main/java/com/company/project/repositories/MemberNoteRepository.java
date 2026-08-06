package com.company.project.repositories;

import com.company.project.entities.MemberNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MemberNoteRepository extends JpaRepository<MemberNote, Long> {
    List<MemberNote> findByMemberIdOrderByCreatedAtDesc(Long memberId);
}
