package com.company.project.controllers;

import com.company.project.dto.StaffRatingResponseDTO;
import com.company.project.dto.StaffRatingSummaryDTO;
import com.company.project.services.StaffRatingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Member ratings of staff, as shown on the web Staffs & Trainers page. Members submit them from the app. */
@RestController
@RequestMapping("/api/staff-ratings")
public class StaffRatingController {

    private final StaffRatingService staffRatingService;

    public StaffRatingController(StaffRatingService staffRatingService) {
        this.staffRatingService = staffRatingService;
    }

    /** GET /api/staff-ratings/summary — average, count and star distribution per rated staff member. */
    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('STAFF_VIEW')")
    public ResponseEntity<List<StaffRatingSummaryDTO>> getSummaries() {
        return ResponseEntity.ok(staffRatingService.getSummaries());
    }

    /** GET /api/staff-ratings/{staffId} — every rating and review of one staff member. */
    @GetMapping("/{staffId}")
    @PreAuthorize("hasAuthority('STAFF_VIEW')")
    public ResponseEntity<List<StaffRatingResponseDTO>> getRatings(@PathVariable Long staffId) {
        return ResponseEntity.ok(staffRatingService.getRatings(staffId));
    }
}
