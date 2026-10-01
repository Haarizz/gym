package com.company.project.controllers;

import com.company.project.dto.PhotoUploadResponseDTO;
import com.company.project.services.DocumentUploadService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Generic document upload (PDF / image), used for staff certification files.
 * Lives next to PhotoUploadController under /api/mobile/uploads/ for the same
 * branch-optional reason.
 */
@RestController
@RequestMapping("/api/mobile/uploads/documents")
public class DocumentUploadController {

    private final DocumentUploadService documentUploadService;

    public DocumentUploadController(DocumentUploadService documentUploadService) {
        this.documentUploadService = documentUploadService;
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<PhotoUploadResponseDTO> uploadDocument(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(documentUploadService.uploadDocument(file));
    }
}
