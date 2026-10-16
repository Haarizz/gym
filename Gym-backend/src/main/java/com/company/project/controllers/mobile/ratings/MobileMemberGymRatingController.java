package com.company.project.controllers.mobile.ratings;

import com.company.project.dto.ReviewRequestDTO;
import com.company.project.dto.mobile.ratings.MemberGymRatingDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.ratings.MobileMemberGymRatingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** The member app's rating of their own gym (branch), and the gym's review-request prompt. */
@RestController
@RequestMapping("/api/mobile/member/gym-rating")
public class MobileMemberGymRatingController {

    private final MobileMemberGymRatingService service;

    public MobileMemberGymRatingController(MobileMemberGymRatingService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<MemberGymRatingDTO> get(@AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(service.get(principal));
    }

    /** Body: { "rating": 1-5, "tags": ["clean"], "comment": "...", "anonymous": false } — replaces any earlier rating. */
    @PutMapping
    public ResponseEntity<MemberGymRatingDTO> rate(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestBody ReviewRequestDTO request) {
        return ResponseEntity.ok(service.rate(principal, request));
    }

    @PostMapping("/dismiss-prompt")
    public ResponseEntity<MemberGymRatingDTO> dismissPrompt(@AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(service.dismissPrompt(principal));
    }
}
