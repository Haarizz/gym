package com.company.project.controllers;

import com.company.project.dto.PhotoUploadResponseDTO;
import com.company.project.services.PhotoUploadService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Generic photo upload for avatars (user profile, member, staff photos).
 * Gated only by the global /api/** authenticated rule in SecurityConfig —
 * any logged-in user may upload their own photo, or an admin may upload one
 * for a member/staff record that doesn't exist yet (before it's created).
 *
 * Deliberately under /api/mobile/ — BranchContextFilter treats that prefix as
 * a "soft" (branch-optional) endpoint, which a freshly self-registered member
 * with no gym/branch assignment yet needs in order to upload a photo at all.
 */
@RestController
@RequestMapping("/api/mobile/uploads/photos")
public class PhotoUploadController {

    private final PhotoUploadService photoUploadService;

    public PhotoUploadController(PhotoUploadService photoUploadService) {
        this.photoUploadService = photoUploadService;
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<PhotoUploadResponseDTO> uploadPhoto(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(photoUploadService.uploadPhoto(file));
    }
}
