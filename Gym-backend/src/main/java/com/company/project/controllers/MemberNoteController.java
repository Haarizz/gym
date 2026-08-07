package com.company.project.controllers;

import com.company.project.dto.MemberNoteRequestDTO;
import com.company.project.dto.MemberNoteResponseDTO;
import com.company.project.services.MemberNoteService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/members/{memberId}/notes")
public class MemberNoteController {

    private final MemberNoteService memberNoteService;

    public MemberNoteController(MemberNoteService memberNoteService) {
        this.memberNoteService = memberNoteService;
    }

    @GetMapping
    public ResponseEntity<List<MemberNoteResponseDTO>> getNotes(@PathVariable Long memberId) {
        return ResponseEntity.ok(memberNoteService.getNotes(memberId));
    }

    @PostMapping
    public ResponseEntity<?> addNote(@PathVariable Long memberId, @RequestBody MemberNoteRequestDTO request) {
        try {
            MemberNoteResponseDTO note = memberNoteService.addNote(memberId, request.getContent());
            return ResponseEntity.status(HttpStatus.CREATED).body(note);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
