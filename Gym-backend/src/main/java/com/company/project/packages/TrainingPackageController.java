package com.company.project.packages;

import com.company.project.security.UserDetailsImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Training packages (docs/training-packages-commission-plan.md):
 * the catalogue under /api/training-packages, and sales to members under /api/package-enrolments.
 */
@RestController
public class TrainingPackageController {

    private final TrainingPackageService packages;
    private final PackageEnrolmentService enrolments;

    public TrainingPackageController(TrainingPackageService packages, PackageEnrolmentService enrolments) {
        this.packages = packages;
        this.enrolments = enrolments;
    }

    // ── Catalogue ───────────────────────────────────────────────────────────

    @GetMapping("/api/training-packages")
    public List<TrainingPackageService.PackageView> list(@RequestParam(name = "active_only", required = false) Boolean activeOnly) {
        return packages.list(Boolean.TRUE.equals(activeOnly));
    }

    @GetMapping("/api/training-packages/{id}")
    public TrainingPackageService.PackageView get(@PathVariable Long id) {
        return packages.get(id);
    }

    @PostMapping("/api/training-packages")
    public ResponseEntity<TrainingPackageService.PackageView> create(@RequestBody TrainingPackageService.PackageRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED).body(packages.create(r));
    }

    @PutMapping("/api/training-packages/{id}")
    public TrainingPackageService.PackageView update(@PathVariable Long id, @RequestBody TrainingPackageService.PackageRequest r) {
        return packages.update(id, r);
    }

    @PatchMapping("/api/training-packages/{id}/toggle-active")
    public TrainingPackageService.PackageView toggleActive(@PathVariable Long id) {
        return packages.toggleActive(id);
    }

    @DeleteMapping("/api/training-packages/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        packages.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── Enrolments ──────────────────────────────────────────────────────────

    @GetMapping("/api/package-enrolments")
    public List<PackageEnrolmentService.EnrolmentView> enrolments(
            @RequestParam(name = "member_id", required = false) Long memberId,
            @RequestParam(name = "trainer_id", required = false) Long trainerId,
            @RequestParam(required = false) String status) {
        return enrolments.list(memberId, trainerId, status);
    }

    /** A member's packages a PT booking can use (booking dialog). */
    @GetMapping("/api/package-enrolments/usable")
    public List<PackageEnrolmentService.EnrolmentView> usable(@RequestParam(name = "member_id") Long memberId) {
        return enrolments.usable(memberId);
    }

    @GetMapping("/api/package-enrolments/{id}")
    public PackageEnrolmentService.EnrolmentView enrolment(@PathVariable Long id) {
        return enrolments.get(id);
    }

    @PostMapping("/api/package-enrolments")
    public ResponseEntity<PackageEnrolmentService.SaleResult> sell(@RequestBody PackageEnrolmentService.SellRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED).body(enrolments.sell(r));
    }

    @PostMapping("/api/package-enrolments/{id}/trainer")
    public PackageEnrolmentService.EnrolmentView changeTrainer(@PathVariable Long id,
                                                               @RequestBody PackageEnrolmentService.TrainerChangeRequest r,
                                                               @AuthenticationPrincipal UserDetailsImpl principal) {
        return enrolments.changeTrainer(id, r, principal != null ? principal.getUsername() : "Staff");
    }

    @PostMapping("/api/package-enrolments/{id}/cancel")
    public PackageEnrolmentService.EnrolmentView cancel(@PathVariable Long id,
                                                        @AuthenticationPrincipal UserDetailsImpl principal) {
        return enrolments.cancel(id, principal != null ? principal.getUsername() : "Staff");
    }
}
