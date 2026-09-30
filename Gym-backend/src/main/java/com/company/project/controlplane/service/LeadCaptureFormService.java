package com.company.project.controlplane.service;

import com.company.project.controlplane.entities.LeadCaptureForm;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.LeadCaptureFormRepository;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.dto.LeadCaptureFormRequestDTO;
import com.company.project.dto.LeadCaptureFormResponseDTO;
import com.company.project.entities.Branch;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.BranchRepository;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.TenantContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Gym-admin management of public lead forms (/api/lead-forms). Rows live in the
 * control plane keyed by the caller's tenant slug; branch names are read from the
 * caller's own tenant DB (already routed by TenantContextFilter).
 */
@Service
public class LeadCaptureFormService {

    // Same values as the tenant Lead.source picker in leads.tsx.
    public static final Set<String> ALLOWED_SOURCES = Set.of(
            "social-media", "facebook-ads", "instagram", "google-ads", "website", "other");

    private static final String KEY_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int KEY_LENGTH = 12;
    private static final int MAX_SHORT_LENGTH = 255;
    private static final int MAX_TEXT_LENGTH = 2000;
    private static final int MAX_URL_LENGTH = 500;

    private final SecureRandom random = new SecureRandom();
    private final LeadCaptureFormRepository formRepository;
    private final TenantRepository tenantRepository;
    private final BranchRepository branchRepository;

    public LeadCaptureFormService(LeadCaptureFormRepository formRepository,
                                  TenantRepository tenantRepository,
                                  BranchRepository branchRepository) {
        this.formRepository = formRepository;
        this.tenantRepository = tenantRepository;
        this.branchRepository = branchRepository;
    }

    // ── Admin (authenticated, tenant-scoped) ─────────────────────────────────

    @Transactional(value = "controlPlaneTransactionManager", readOnly = true)
    public List<LeadCaptureFormResponseDTO> list() {
        String tenantSlug = requireTenant();
        Long activeBranchId = BranchContextHolder.getActiveBranchId();
        List<LeadCaptureForm> forms = activeBranchId == null
                ? formRepository.findByTenantSlugOrderByCreatedAtDesc(tenantSlug)
                : formRepository.findByTenantSlugAndBranchIdOrderByCreatedAtDesc(tenantSlug, activeBranchId);

        Map<Long, String> branchNames = branchRepository
                .findByIdIn(forms.stream().map(LeadCaptureForm::getBranchId).distinct().collect(Collectors.toList()))
                .stream()
                .collect(Collectors.toMap(Branch::getId, Branch::getBranchName, (a, b) -> a));

        return forms.stream().map(f -> toDTO(f, branchNames::get)).collect(Collectors.toList());
    }

    @Transactional("controlPlaneTransactionManager")
    public LeadCaptureFormResponseDTO create(LeadCaptureFormRequestDTO req) {
        String tenantSlug = requireTenant();
        Branch branch = resolveBranch(req.getBranchId());

        LeadCaptureForm form = new LeadCaptureForm();
        form.setTenantSlug(tenantSlug);
        form.setBranchId(branch.getId());
        form.setFormKey(generateUniqueKey());
        applyRequest(req, form, true);

        LeadCaptureForm saved = formRepository.save(form);
        return toDTO(saved, id -> branch.getBranchName());
    }

    @Transactional("controlPlaneTransactionManager")
    public LeadCaptureFormResponseDTO update(Long id, LeadCaptureFormRequestDTO req) {
        LeadCaptureForm form = findOwned(id);
        // Only an All Branches admin may move a form to another branch; in a
        // specific branch, resolveBranch pins it to that branch anyway.
        if (req.getBranchId() != null && !req.getBranchId().equals(form.getBranchId())) {
            form.setBranchId(resolveBranch(req.getBranchId()).getId());
        }
        applyRequest(req, form, false);
        LeadCaptureForm saved = formRepository.save(form);
        return toDTO(saved, this::branchName);
    }

    @Transactional("controlPlaneTransactionManager")
    public void delete(Long id) {
        formRepository.delete(findOwned(id));
    }

    // ── Public (unauthenticated) ─────────────────────────────────────────────

    /** Resolves a public link to its form, hiding inactive forms and non-active gyms as 404s. */
    @Transactional(value = "controlPlaneTransactionManager", readOnly = true)
    public LeadCaptureForm getActiveForm(String formKey) {
        LeadCaptureForm form = formKey == null ? null : formRepository.findByFormKey(formKey).orElse(null);
        if (form == null || !form.isActive()) {
            throw new EntityNotFoundException("This form is no longer available");
        }
        Tenant tenant = tenantRepository.findBySlug(form.getTenantSlug()).orElse(null);
        if (tenant == null || !"ACTIVE".equals(tenant.getStatus())) {
            throw new EntityNotFoundException("This form is no longer available");
        }
        return form;
    }

    @Transactional("controlPlaneTransactionManager")
    public void recordSubmission(Long formId) {
        formRepository.recordSubmission(formId, LocalDateTime.now());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String requireTenant() {
        String tenantSlug = TenantContextHolder.getCurrentTenant();
        if (tenantSlug == null || tenantSlug.isBlank()) {
            throw new IllegalStateException("Lead forms are only available inside a gym account");
        }
        return tenantSlug;
    }

    private LeadCaptureForm findOwned(Long id) {
        LeadCaptureForm form = formRepository.findByIdAndTenantSlug(id, requireTenant())
                .orElseThrow(() -> new EntityNotFoundException("Lead form not found: " + id));
        Long activeBranchId = BranchContextHolder.getActiveBranchId();
        if (activeBranchId != null && !activeBranchId.equals(form.getBranchId())) {
            throw new EntityNotFoundException("Lead form not found: " + id);
        }
        return form;
    }

    /**
     * Active branch wins (a branch-scoped user can't create forms for another
     * branch); All Branches mode must name one explicitly, mirroring
     * BranchSecurityListener's rule for creates.
     */
    private Branch resolveBranch(Long requestedBranchId) {
        Long activeBranchId = BranchContextHolder.getActiveBranchId();
        Long branchId = activeBranchId != null ? activeBranchId : requestedBranchId;
        if (branchId == null) {
            throw new IllegalArgumentException("Select a branch for this form");
        }
        return branchRepository.findById(branchId)
                .orElseThrow(() -> new IllegalArgumentException("Branch not found: " + branchId));
    }

    private String branchName(Long branchId) {
        return branchRepository.findById(branchId).map(Branch::getBranchName).orElse(null);
    }

    private void applyRequest(LeadCaptureFormRequestDTO req, LeadCaptureForm form, boolean creating) {
        if (creating || req.getName() != null) {
            String name = trimToNull(req.getName(), MAX_SHORT_LENGTH);
            if (name == null) throw new IllegalArgumentException("Form name is required");
            form.setName(name);
        }
        if (req.getHeadline() != null) form.setHeadline(trimToNull(req.getHeadline(), MAX_SHORT_LENGTH));
        if (req.getDescription() != null) form.setDescription(trimToNull(req.getDescription(), MAX_TEXT_LENGTH));
        if (req.getSuccessMessage() != null) form.setSuccessMessage(trimToNull(req.getSuccessMessage(), MAX_TEXT_LENGTH));
        if (req.getPrivacyPolicyUrl() != null) {
            String url = trimToNull(req.getPrivacyPolicyUrl(), MAX_URL_LENGTH);
            // Rendered as a link on a public page — only plain web URLs, never javascript: etc.
            if (url != null && !url.matches("(?i)^https?://[^\\s\"'<>]+$")) {
                throw new IllegalArgumentException("Privacy policy link must start with https://");
            }
            form.setPrivacyPolicyUrl(url);
        }
        if (req.getSource() != null) {
            if (!ALLOWED_SOURCES.contains(req.getSource())) {
                throw new IllegalArgumentException("Unsupported lead source: " + req.getSource());
            }
            form.setSource(req.getSource());
        }
        if (req.getAssignedStaff() != null) form.setAssignedStaff(trimToNull(req.getAssignedStaff(), MAX_SHORT_LENGTH));
        if (req.getShowEmail() != null) form.setShowEmail(req.getShowEmail());
        if (req.getRequireEmail() != null) form.setRequireEmail(req.getRequireEmail());
        if (req.getShowInterest() != null) form.setShowInterest(req.getShowInterest());
        if (req.getActive() != null) form.setActive(req.getActive());
        // A required field that isn't shown would make the form impossible to submit.
        if (form.isRequireEmail()) form.setShowEmail(true);
    }

    private String generateUniqueKey() {
        for (int attempt = 0; attempt < 5; attempt++) {
            StringBuilder sb = new StringBuilder(KEY_LENGTH);
            for (int i = 0; i < KEY_LENGTH; i++) {
                sb.append(KEY_ALPHABET.charAt(random.nextInt(KEY_ALPHABET.length())));
            }
            String key = sb.toString();
            if (!formRepository.existsByFormKey(key)) return key;
        }
        throw new IllegalStateException("Could not generate a unique form link, please try again");
    }

    private static String trimToNull(String value, int maxLength) {
        if (value == null) return null;
        String trimmed = value.trim();
        if (trimmed.isEmpty()) return null;
        return trimmed.length() > maxLength ? trimmed.substring(0, maxLength) : trimmed;
    }

    private LeadCaptureFormResponseDTO toDTO(LeadCaptureForm f, Function<Long, String> branchNameLookup) {
        LeadCaptureFormResponseDTO dto = new LeadCaptureFormResponseDTO();
        dto.setId(f.getId());
        dto.setFormKey(f.getFormKey());
        dto.setName(f.getName());
        dto.setBranchId(f.getBranchId());
        dto.setBranchName(branchNameLookup.apply(f.getBranchId()));
        dto.setHeadline(f.getHeadline());
        dto.setDescription(f.getDescription());
        dto.setSuccessMessage(f.getSuccessMessage());
        dto.setPrivacyPolicyUrl(f.getPrivacyPolicyUrl());
        dto.setSource(f.getSource());
        dto.setAssignedStaff(f.getAssignedStaff());
        dto.setShowEmail(f.isShowEmail());
        dto.setRequireEmail(f.isRequireEmail());
        dto.setShowInterest(f.isShowInterest());
        dto.setActive(f.isActive());
        dto.setSubmissionCount(f.getSubmissionCount());
        dto.setLastSubmissionAt(f.getLastSubmissionAt());
        dto.setCreatedAt(f.getCreatedAt());
        return dto;
    }
}
