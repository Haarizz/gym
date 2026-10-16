package com.company.project.controllers;

import com.company.project.controlplane.entities.BranchRatingSummary;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.BranchRatingSummaryRepository;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.dto.ratings.GymRatingDetailDTO;
import com.company.project.dto.ratings.GymRatingSummaryDTO;
import com.company.project.dto.ratings.PlatformGymRatingDTO;
import com.company.project.entities.Branch;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.BranchRepository;
import com.company.project.security.TenantContextHolder;
import com.company.project.services.GymReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Supplier;
import java.util.stream.Collectors;

/**
 * The platform admin's Ratings pages: every gym's member ratings. The list reads the
 * control plane's branch_rating_summaries; a gym's branches and a branch's reviews are
 * read live from that gym's own database.
 */
@RestController
@RequestMapping("/api/platform/ratings")
@PreAuthorize("hasAuthority('GYM_MANAGEMENT_VIEW')")
public class PlatformRatingController {

    private final TenantRepository tenantRepository;
    private final BranchRatingSummaryRepository summaryRepository;
    private final BranchRepository branchRepository;
    private final GymReviewService gymReviewService;

    public PlatformRatingController(
            TenantRepository tenantRepository,
            BranchRatingSummaryRepository summaryRepository,
            BranchRepository branchRepository,
            GymReviewService gymReviewService) {
        this.tenantRepository = tenantRepository;
        this.summaryRepository = summaryRepository;
        this.branchRepository = branchRepository;
        this.gymReviewService = gymReviewService;
    }

    /** GET /api/platform/ratings — every gym with its overall rating (branches left out). */
    @GetMapping
    public ResponseEntity<List<PlatformGymRatingDTO>> getGyms() {
        Map<String, List<BranchRatingSummary>> byTenant = summaryRepository.findAll().stream()
                .collect(Collectors.groupingBy(BranchRatingSummary::getTenantSlug));
        List<PlatformGymRatingDTO> gyms = tenantRepository.findAll().stream()
                .map(t -> toGym(t, byTenant.getOrDefault(t.getSlug(), List.of()), null))
                .sorted(Comparator.comparing(PlatformGymRatingDTO::getGymName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();
        return ResponseEntity.ok(gyms);
    }

    /** GET /api/platform/ratings/{tenantSlug} — one gym and each of its branches, rated or not. */
    @GetMapping("/{tenantSlug}")
    public ResponseEntity<PlatformGymRatingDTO> getGym(@PathVariable String tenantSlug) {
        Tenant tenant = requireTenant(tenantSlug);
        Map<Long, BranchRatingSummary> summaries = summaryRepository.findByTenantSlug(tenantSlug).stream()
                .collect(Collectors.toMap(BranchRatingSummary::getBranchId, s -> s));
        List<Branch> branches = inTenant(tenantSlug, branchRepository::findAll);
        List<GymRatingSummaryDTO> branchDtos = branches.stream()
                .sorted(Comparator.comparing(Branch::getBranchName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .map(b -> {
                    BranchRatingSummary s = summaries.get(b.getId());
                    return GymReviewService.toSummary(b.getId(), b.getBranchName(),
                            s != null ? s.getCounts() : new long[5], s != null ? s.getLastReviewAt() : null);
                })
                .toList();
        return ResponseEntity.ok(toGym(tenant, new ArrayList<>(summaries.values()), branchDtos));
    }

    /** GET /api/platform/ratings/{tenantSlug}/branches/{branchId} — a branch's summary and every review. */
    @GetMapping("/{tenantSlug}/branches/{branchId}")
    public ResponseEntity<GymRatingDetailDTO> getBranch(@PathVariable String tenantSlug, @PathVariable Long branchId) {
        requireTenant(tenantSlug);
        GymRatingDetailDTO dto = inTenant(tenantSlug, () -> {
            if (!branchRepository.existsById(branchId)) {
                throw new EntityNotFoundException("Branch not found");
            }
            GymRatingDetailDTO d = new GymRatingDetailDTO();
            d.setSummary(gymReviewService.summary(branchId));
            d.setReviews(gymReviewService.reviews(branchId));
            return d;
        });
        return ResponseEntity.ok(dto);
    }

    private PlatformGymRatingDTO toGym(Tenant tenant, List<BranchRatingSummary> summaries, List<GymRatingSummaryDTO> branches) {
        long count = 0;
        long sum = 0;
        LocalDateTime last = null;
        for (BranchRatingSummary s : summaries) {
            count += s.getRatingCount();
            sum += s.getRatingSum();
            if (s.getLastReviewAt() != null && (last == null || s.getLastReviewAt().isAfter(last))) {
                last = s.getLastReviewAt();
            }
        }
        PlatformGymRatingDTO dto = new PlatformGymRatingDTO();
        dto.setTenantSlug(tenant.getSlug());
        dto.setGymName(tenant.getName());
        dto.setRatingCount(count);
        dto.setAverageRating(count == 0 ? null : Math.round(sum * 10.0 / count) / 10.0);
        dto.setLastReviewAt(last);
        dto.setBranches(branches);
        return dto;
    }

    private Tenant requireTenant(String tenantSlug) {
        return tenantRepository.findBySlug(tenantSlug)
                .orElseThrow(() -> new EntityNotFoundException("Gym not found"));
    }

    /** Runs reads against one gym's database (the platform admin has no tenant of its own). */
    private static <T> T inTenant(String tenantSlug, Supplier<T> work) {
        String previous = TenantContextHolder.getCurrentTenant();
        TenantContextHolder.setCurrentTenant(tenantSlug);
        try {
            return work.get();
        } finally {
            if (previous != null) TenantContextHolder.setCurrentTenant(previous);
            else TenantContextHolder.clear();
        }
    }
}
