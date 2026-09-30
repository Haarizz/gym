package com.company.project.controllers;

import com.company.project.controlplane.entities.LeadCaptureForm;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.controlplane.service.LeadCaptureFormService;
import com.company.project.controlplane.service.LeadFormRateLimiter;
import com.company.project.dto.PublicLeadFormDTO;
import com.company.project.dto.PublicLeadSubmissionDTO;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.ClientIpResolver;
import com.company.project.security.TenantContextHolder;
import com.company.project.services.LeadCaptureSubmissionService;
import jakarta.persistence.EntityManagerFactory;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.jpa.EntityManagerFactoryUtils;
import org.springframework.orm.jpa.EntityManagerHolder;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Objects;
import java.util.function.Supplier;

/**
 * Unauthenticated side of gym lead forms — the /f/{formKey} page people reach
 * from social-media ads. permitAll in SecurityConfig; the unguessable formKey
 * resolves (via the control plane) to the tenant + branch the lead belongs to,
 * and this controller switches TenantContextHolder/BranchContextHolder to them
 * for the tenant-side work, the same way MobileDiscoveryController does.
 */
@RestController
@RequestMapping("/api/public/lead-forms")
public class PublicLeadFormController {

    private static final String DEFAULT_SUCCESS_MESSAGE =
            "Thank you! Our team will contact you shortly.";

    private static final Object[] SUBMIT_LOCKS = new Object[64];
    static {
        for (int i = 0; i < SUBMIT_LOCKS.length; i++) SUBMIT_LOCKS[i] = new Object();
    }

    private final LeadCaptureFormService formService;
    private final LeadCaptureSubmissionService submissionService;
    private final LeadFormRateLimiter rateLimiter;
    private final TenantRepository tenantRepository;
    private final EntityManagerFactory entityManagerFactory;

    public PublicLeadFormController(LeadCaptureFormService formService,
                                    LeadCaptureSubmissionService submissionService,
                                    LeadFormRateLimiter rateLimiter,
                                    TenantRepository tenantRepository,
                                    EntityManagerFactory entityManagerFactory) {
        this.formService = formService;
        this.submissionService = submissionService;
        this.rateLimiter = rateLimiter;
        this.tenantRepository = tenantRepository;
        this.entityManagerFactory = entityManagerFactory;
    }

    /** GET /api/public/lead-forms/{formKey} — what the public page renders. */
    @GetMapping("/{formKey}")
    public ResponseEntity<PublicLeadFormDTO> getForm(@PathVariable String formKey) {
        LeadCaptureForm form = formService.getActiveForm(formKey);
        String fallbackGymName = tenantRepository.findBySlug(form.getTenantSlug())
                .map(t -> t.getName()).orElse(null);
        return ResponseEntity.ok(inTenant(form, () -> submissionService.describe(form, fallbackGymName)));
    }

    /** POST /api/public/lead-forms/{formKey}/submit */
    @PostMapping("/{formKey}/submit")
    public ResponseEntity<Map<String, Object>> submit(@PathVariable String formKey,
                                                      @RequestBody PublicLeadSubmissionDTO request,
                                                      HttpServletRequest httpRequest) {
        if (!rateLimiter.tryAcquire(ClientIpResolver.resolve(httpRequest), formKey)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Too many requests. Please try again later."));
        }

        LeadCaptureForm form = formService.getActiveForm(formKey);
        String successMessage = form.getSuccessMessage() != null ? form.getSuccessMessage() : DEFAULT_SUCCESS_MESSAGE;

        if (request.getWebsite() != null && !request.getWebsite().isBlank()) {
            // Honeypot tripped — pretend success so the bot doesn't adapt, persist nothing.
            return ResponseEntity.ok(Map.of("success", true, "message", successMessage));
        }

        // The duplicate-phone check and the insert are separate statements, so a
        // double-tapped Submit could otherwise create two leads. Serialize per
        // form + phone; submit() commits its transaction before returning, so the
        // second request sees the first one's lead. Striped locks keep memory
        // fixed; single-instance only, like the rate limiter.
        Object lock = SUBMIT_LOCKS[Math.floorMod(Objects.hash(form.getId(), phoneKey(request.getPhone())), SUBMIT_LOCKS.length)];
        synchronized (lock) {
            inTenant(form, () -> {
                submissionService.submit(form, request);
                return null;
            });
        }
        formService.recordSubmission(form.getId());
        return ResponseEntity.ok(Map.of("success", true, "message", successMessage));
    }

    private <T> T inTenant(LeadCaptureForm form, Supplier<T> work) {
        // Drop any OSIV EntityManager already bound to this request so the tenant
        // work below opens a fresh one on the form's tenant DataSource (see
        // MobileDiscoveryController.purchaseMembership for the same step).
        if (TransactionSynchronizationManager.hasResource(entityManagerFactory)) {
            EntityManagerHolder emHolder = (EntityManagerHolder) TransactionSynchronizationManager.unbindResource(entityManagerFactory);
            EntityManagerFactoryUtils.closeEntityManager(emHolder.getEntityManager());
        }
        try {
            TenantContextHolder.setCurrentTenant(form.getTenantSlug());
            BranchContextHolder.setActiveBranchId(form.getBranchId());
            return work.get();
        } finally {
            BranchContextHolder.clear();
            TenantContextHolder.clear();
        }
    }

    /** Same last-10-digits identity LeadCaptureSubmissionService uses for its duplicate check. */
    private static String phoneKey(String phone) {
        String digits = phone == null ? "" : phone.replaceAll("[^0-9]", "");
        return digits.length() > 10 ? digits.substring(digits.length() - 10) : digits;
    }
}
