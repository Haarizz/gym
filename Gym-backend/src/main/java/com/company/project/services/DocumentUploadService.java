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
import java.util.Map;
import java.util.UUID;

/**
 * Stores supporting documents (currently staff certification files — PDF or
 * image) on local disk and hands back a URL, same approach as PhotoUploadService.
 */
@Service
public class DocumentUploadService {

    private static final Map<String, String> EXTENSIONS = Map.of(
            "application/pdf", ".pdf",
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp");

    private final String documentsDir;

    public DocumentUploadService(
            @Value("${app.storage.documents-dir:${user.dir}/uploads/documents}") String documentsDir) {
        this.documentsDir = documentsDir;
    }

    public PhotoUploadResponseDTO uploadDocument(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No file provided");
        }
        String contentType = file.getContentType();
        String extension = contentType != null ? EXTENSIONS.get(contentType.toLowerCase()) : null;
        if (extension == null) {
            throw new IllegalArgumentException("Unsupported document type: " + contentType + ". Use PDF, JPG or PNG.");
        }

        try {
            Path dir = Paths.get(documentsDir);
            Files.createDirectories(dir);
            String filename = UUID.randomUUID() + extension;
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
            }
            return new PhotoUploadResponseDTO("/uploads/documents/" + filename);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store document: " + e.getMessage(), e);
        }
    }
}
