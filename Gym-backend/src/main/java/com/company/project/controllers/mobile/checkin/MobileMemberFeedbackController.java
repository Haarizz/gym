package com.company.project.controllers.mobile.checkin;

import com.company.project.dto.mobile.checkin.MemberFeedbackResponseDTO;
import com.company.project.dto.mobile.checkin.MobileMemberFeedbackRequestDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.checkin.MobileMemberFeedbackService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mobile/member/check-in")
public class MobileMemberFeedbackController {

    private final MobileMemberFeedbackService feedbackService;

    public MobileMemberFeedbackController(MobileMemberFeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    /**
     * Submit post-workout feedback for a completed attendance session.
     *
     * POST /api/mobile/member/check-in/feedback
     */
    @PostMapping("/feedback")
    public ResponseEntity<MemberFeedbackResponseDTO> submitFeedback(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestBody MobileMemberFeedbackRequestDTO request) {
        return ResponseEntity.ok(feedbackService.submitFeedback(principal, request));
    }
}
