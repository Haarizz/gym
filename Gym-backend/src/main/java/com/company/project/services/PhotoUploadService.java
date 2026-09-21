package com.company.project.services;

import com.company.project.dto.PhotoUploadResponseDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

/**
 * Generic, entity-agnostic photo upload used for avatars (member, staff and
 * user-profile photos). Unlike branch images, avatars don't need a DB-tracked
 * gallery — this just stores the file and hands back a URL, mirroring
 * BranchImageService's local-disk approach (no object storage exists anywhere
 * in this codebase yet).
 */
@Service
public class PhotoUploadService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif");

    private final String photosDir;

    public PhotoUploadService(
            @Value("${app.storage.photos-dir:${user.dir}/uploads/photos}") String photosDir) {
        this.photosDir = photosDir;
    }

    public PhotoUploadResponseDTO uploadPhoto(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("No file provided");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new RuntimeException("Unsupported image type: " + contentType);
        }

        String extension = switch (contentType.toLowerCase()) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> ".jpg";
        };

        try {
            Path dir = Paths.get(photosDir);
            Files.createDirectories(dir);
            String filename = UUID.randomUUID() + extension;
            Path target = dir.resolve(filename);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }

            return new PhotoUploadResponseDTO("/uploads/photos/" + filename);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store photo: " + e.getMessage(), e);
        }
    }
}
