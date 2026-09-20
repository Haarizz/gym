package com.company.project.services;

import com.company.project.dto.BranchImageResponseDTO;
import com.company.project.entities.BranchImage;
import com.company.project.repositories.BranchImageRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BranchImageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif");

    private final BranchImageRepository branchImageRepository;
    private final String branchImagesDir;

    public BranchImageService(
            BranchImageRepository branchImageRepository,
            @Value("${app.storage.branch-images-dir:${user.dir}/uploads/branch-images}") String branchImagesDir) {
        this.branchImageRepository = branchImageRepository;
        this.branchImagesDir = branchImagesDir;
    }

    @Transactional
    public BranchImageResponseDTO uploadImage(Long branchId, MultipartFile file, boolean isCover) {
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
            Path branchDir = Paths.get(branchImagesDir, String.valueOf(branchId));
            Files.createDirectories(branchDir);
            String filename = UUID.randomUUID() + extension;
            Path target = branchDir.resolve(filename);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }

            if (isCover) {
                branchImageRepository.findByBranchIdAndIsCoverTrue(branchId)
                        .forEach(existing -> {
                            existing.setCover(false);
                            branchImageRepository.save(existing);
                        });
            }

            BranchImage image = new BranchImage();
            image.setBranchId(branchId);
            image.setImageUrl("/uploads/branch-images/" + branchId + "/" + filename);
            image.setCover(isCover);
            image.setSortOrder(branchImageRepository.findByBranchIdOrderBySortOrderAsc(branchId).size());
            image = branchImageRepository.save(image);

            return toResponse(image);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store branch image: " + e.getMessage(), e);
        }
    }

    public List<BranchImageResponseDTO> getImages(Long branchId) {
        return branchImageRepository.findByBranchIdOrderBySortOrderAsc(branchId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public BranchImageResponseDTO setCover(Long branchId, Long imageId) {
        BranchImage target = branchImageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Image not found: " + imageId));
        if (!branchId.equals(target.getBranchId())) {
            throw new RuntimeException("Image does not belong to this branch");
        }

        branchImageRepository.findByBranchIdAndIsCoverTrue(branchId)
                .forEach(existing -> {
                    existing.setCover(false);
                    branchImageRepository.save(existing);
                });

        target.setCover(true);
        target = branchImageRepository.save(target);
        return toResponse(target);
    }

    @Transactional
    public void deleteImage(Long branchId, Long imageId) {
        BranchImage image = branchImageRepository.findById(imageId)
                .orElseThrow(() -> new RuntimeException("Image not found: " + imageId));
        if (!branchId.equals(image.getBranchId())) {
            throw new RuntimeException("Image does not belong to this branch");
        }
        branchImageRepository.delete(image);

        // Best-effort disk cleanup — the DB row is the source of truth, so a
        // leftover file here is harmless, unlike a missing one.
        try {
            String relativePath = image.getImageUrl().replaceFirst("^/uploads/branch-images/", "");
            Files.deleteIfExists(Paths.get(branchImagesDir, relativePath));
        } catch (IOException ignored) {
        }
    }

    private BranchImageResponseDTO toResponse(BranchImage image) {
        BranchImageResponseDTO dto = new BranchImageResponseDTO();
        dto.setId(image.getId());
        dto.setImageUrl(image.getImageUrl());
        dto.setCover(image.isCover());
        dto.setSortOrder(image.getSortOrder());
        return dto;
    }
}
