package com.company.project.services;

import com.company.project.dto.MemberNoteResponseDTO;
import com.company.project.entities.MemberNote;
import com.company.project.repositories.MemberNoteRepository;
import com.company.project.repositories.MemberRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class MemberNoteService {

    private final MemberNoteRepository noteRepository;
    private final MemberRepository memberRepository;

    public MemberNoteService(MemberNoteRepository noteRepository, MemberRepository memberRepository) {
        this.noteRepository = noteRepository;
        this.memberRepository = memberRepository;
    }

    @Transactional(readOnly = true)
    public List<MemberNoteResponseDTO> getNotes(Long memberId) {
        return noteRepository.findByMemberIdOrderByCreatedAtDesc(memberId).stream()
                .map(MemberNoteResponseDTO::fromEntity)
                .toList();
    }

    @Transactional
    public MemberNoteResponseDTO addNote(Long memberId, String content) {
        if (!StringUtils.hasText(content)) {
            throw new IllegalArgumentException("Note content is required.");
        }
        if (!memberRepository.existsById(memberId)) {
            throw new EntityNotFoundException("Member not found: " + memberId);
        }
        MemberNote note = noteRepository.save(new MemberNote(memberId, content.trim()));
        return MemberNoteResponseDTO.fromEntity(note);
    }
}
