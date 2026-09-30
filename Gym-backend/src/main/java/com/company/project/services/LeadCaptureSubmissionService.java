package com.company.project.services;

import com.company.project.controlplane.entities.LeadCaptureForm;
import com.company.project.dto.FollowUpRequestDTO;
import com.company.project.dto.LeadRequestDTO;
import com.company.project.dto.LeadResponseDTO;
import com.company.project.dto.MembershipPlanResponseDTO;
import com.company.project.dto.PublicLeadFormDTO;
import com.company.project.dto.PublicLeadSubmissionDTO;
import com.company.project.entities.Branch;
import com.company.project.entities.Lead;
import com.company.project.entities.LeadInteraction;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.GymRepository;
import com.company.project.repositories.LeadInteractionRepository;
import com.company.project.repositories.LeadRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Tenant-side half of the public lead forms: renders a form's public view and
 * turns a submission into a Lead + first follow-up. Callers (PublicLeadFormController)
 * must already have set TenantContextHolder/BranchContextHolder to the form's
 * tenant + branch, so every repository here hits that gym's own database and
 * BranchSecurityListener stamps the form's branch on new rows.
 */
@Service
@Transactional
public class LeadCaptureSubmissionService {

    private static final Logger log = LoggerFactory.getLogger(LeadCaptureSubmissionService.class);

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Set<String> CONTACT_METHODS = Set.of("phone", "whatsapp", "email", "sms");
    private static final int MIN_PHONE_DIGITS = 7;
    private static final int MAX_PHONE_DIGITS = 15;
    private static final int MAX_SHORT_LENGTH = 255;
    private static final int MAX_MESSAGE_LENGTH = 2000;
    // Inbound ad leads go cold fast — first call is due within the hour.
    private static final long FIRST_FOLLOW_UP_DELAY_MINUTES = 60;
    private static final String FORM_STAFF_LABEL = "Web form";

    private final LeadService leadService;
    private final FollowUpService followUpService;
    private final NotificationService notificationService;
    private final MembershipPlanService planService;
    private final LeadRepository leadRepository;
    private final LeadInteractionRepository interactionRepository;
    private final BranchRepository branchRepository;
    private final GymRepository gymRepository;

    public LeadCaptureSubmissionService(LeadService leadService,
                                        FollowUpService followUpService,
                                        NotificationService notificationService,
                                        MembershipPlanService planService,
                                        LeadRepository leadRepository,
                                        LeadInteractionRepository interactionRepository,
                                        BranchRepository branchRepository,
                                        GymRepository gymRepository) {
        this.leadService = leadService;
        this.followUpService = followUpService;
        this.notificationService = notificationService;
        this.planService = planService;
        this.leadRepository = leadRepository;
        this.interactionRepository = interactionRepository;
        this.branchRepository = branchRepository;
        this.gymRepository = gymRepository;
    }

    @Transactional(readOnly = true)
    public PublicLeadFormDTO describe(LeadCaptureForm form, String fallbackGymName) {
        Branch branch = requireBranch(form);

        PublicLeadFormDTO dto = new PublicLeadFormDTO();
        dto.setGymName(gymRepository.findByIsDefaultTrue().map(g -> g.getName()).orElse(fallbackGymName));
        dto.setBranchName(branch.getBranchName());
        dto.setBranchPhone(branch.getPhone());
        dto.setHeadline(form.getHeadline());
        dto.setDescription(form.getDescription());
        dto.setSuccessMessage(form.getSuccessMessage());
        dto.setPrivacyPolicyUrl(form.getPrivacyPolicyUrl());
        dto.setShowEmail(form.isShowEmail());
        dto.setRequireEmail(form.isRequireEmail());
        dto.setShowInterest(form.isShowInterest());
        if (form.isShowInterest()) {
            List<String> options = new ArrayList<>();
            try {
                // Branch-scoped via BranchContextHolder, same as MobileDiscoveryController.
                planService.getPlans("Active").stream()
                        .map(MembershipPlanResponseDTO::getName)
                        .filter(n -> n != null && !n.isBlank())
                        .distinct()
                        .forEach(options::add);
            } catch (Exception e) {
                log.warn("Could not load plans for lead form {}", form.getFormKey(), e);
            }
            options.add("Personal Training");
            options.add("Just exploring");
            dto.setInterestOptions(options.stream().distinct().collect(Collectors.toList()));
        }
        return dto;
    }

    public void submit(LeadCaptureForm form, PublicLeadSubmissionDTO req) {
        Branch branch = requireBranch(form);

        String fullName = clean(req.getFullName(), MAX_SHORT_LENGTH);
        if (fullName == null) throw new IllegalArgumentException("Please enter your name");
        if (!Boolean.TRUE.equals(req.getConsent())) {
            throw new IllegalArgumentException("Please agree to be contacted so we can get back to you");
        }

        String phoneDigits = req.getPhone() == null ? "" : req.getPhone().replaceAll("[^0-9]", "");
        if (phoneDigits.length() < MIN_PHONE_DIGITS || phoneDigits.length() > MAX_PHONE_DIGITS) {
            throw new IllegalArgumentException("Please enter a valid phone number");
        }
        String phone = req.getPhone().trim().startsWith("+") ? "+" + phoneDigits : phoneDigits;

        String email = form.isShowEmail() ? clean(req.getEmail(), MAX_SHORT_LENGTH) : null;
        if (email == null && form.isRequireEmail()) throw new IllegalArgumentException("Please enter your email");
        if (email != null && !EMAIL.matcher(email).matches()) throw new IllegalArgumentException("Please enter a valid email");

        String interest = form.isShowInterest() ? clean(req.getInterest(), MAX_SHORT_LENGTH) : null;
        String contactMethod = clean(req.getPreferredContactMethod(), 20);
        if (contactMethod != null) contactMethod = contactMethod.toLowerCase(Locale.ROOT);
        if (contactMethod != null && !CONTACT_METHODS.contains(contactMethod)) contactMethod = null;
        String message = clean(req.getMessage(), MAX_MESSAGE_LENGTH);
        String campaign = clean(req.getUtmCampaign(), 100);

        String last10 = phoneDigits.length() > 10 ? phoneDigits.substring(phoneDigits.length() - 10) : phoneDigits;
        Lead existing = leadRepository.findLatestByBranchAndPhoneDigits(branch.getId(), last10).orElse(null);
        if (existing != null) {
            recordRepeatSubmission(existing, form, email, interest, message, campaign);
            return;
        }

        String[] names = splitName(fullName);
        LeadRequestDTO lead = new LeadRequestDTO();
        lead.setFirstName(names[0]);
        lead.setLastName(names[1]);
        lead.setPhone(phone);
        lead.setEmail(email);
        lead.setStatus("new");
        lead.setSource(resolveSource(form.getSource(), req.getUtmSource()));
        lead.setPriority("high");
        lead.setAssignedStaff(form.getAssignedStaff());
        lead.setMembershipInterest(interest);
        lead.setPreferredContactMethod(contactMethod);
        lead.setNotes(buildNotes(form, message, req));
        List<String> tags = new ArrayList<>(List.of("web-form", "form:" + form.getName()));
        if (campaign != null) tags.add("campaign:" + campaign);
        lead.setTags(tags);

        LeadResponseDTO created = leadService.createLead(lead);

        FollowUpRequestDTO followUp = new FollowUpRequestDTO();
        followUp.setLeadId(created.getId());
        followUp.setType("whatsapp".equals(contactMethod) ? "whatsapp" : "call");
        followUp.setStatus("pending");
        followUp.setPriority("high");
        followUp.setAssignedStaff(form.getAssignedStaff());
        followUp.setDueDate(LocalDateTime.now().plusMinutes(FIRST_FOLLOW_UP_DELAY_MINUTES));
        followUp.setSubject("Contact new lead: " + fullName);
        followUp.setFollowUpReason("New lead from form \"" + form.getName() + "\"");
        followUp.setNotes(message);
        followUpService.createFollowUp(followUp);

        // LeadService only notifies MANAGER; the gym owner should hear about ad leads too.
        notificationService.notifyRoles(
                List.of("ADMIN"),
                "New lead from " + form.getName(),
                fullName + " (" + phone + ") filled your lead form" +
                        (interest != null ? " — interested in " + interest : "") + ".",
                "INFO", "HIGH", "LEADS",
                created.getId(), "/leads",
                "LEAD_FORM_" + created.getId()
        );
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Branch requireBranch(LeadCaptureForm form) {
        Branch branch = branchRepository.findById(form.getBranchId()).orElse(null);
        if (branch == null || !"ACTIVE".equalsIgnoreCase(branch.getStatus())) {
            throw new EntityNotFoundException("This form is no longer available");
        }
        return branch;
    }

    /**
     * Same person again (same phone, same branch): log it on the existing lead
     * instead of creating a duplicate, and reopen it if it had been marked lost.
     */
    private void recordRepeatSubmission(Lead lead, LeadCaptureForm form, String email,
                                        String interest, String message, String campaign) {
        StringBuilder note = new StringBuilder("Submitted the \"").append(form.getName())
                .append("\" lead form again and agreed to be contacted (").append(LocalDateTime.now().withNano(0)).append(").");
        if (interest != null) note.append(" Interested in: ").append(interest).append('.');
        if (campaign != null) note.append(" Campaign: ").append(campaign).append('.');
        if (message != null) note.append(" Message: ").append(message);

        LeadInteraction interaction = new LeadInteraction();
        interaction.setLead(lead);
        interaction.setType("note");
        interaction.setDate(LocalDateTime.now());
        interaction.setStaffMember(FORM_STAFF_LABEL);
        interaction.setNotes(note.toString());
        interactionRepository.save(interaction);

        if (lead.getEmail() == null && email != null) lead.setEmail(email);
        if (lead.getMembershipInterest() == null && interest != null) lead.setMembershipInterest(interest);
        if ("lost".equals(lead.getStatus())) lead.setStatus("new");
        leadRepository.save(lead);

        notificationService.notifyRoles(
                List.of("ADMIN", "MANAGER"),
                "Returning lead",
                lead.getFirstName() + " filled the \"" + form.getName() + "\" form again.",
                "INFO", "MEDIUM", "LEADS",
                lead.getId(), "/leads",
                "LEAD_FORM_REPEAT_" + interaction.getId()
        );
    }

    /** A recognised utm_source on the ad link beats the form's default source. */
    static String resolveSource(String formSource, String utmSource) {
        if (utmSource != null) {
            String s = utmSource.trim().toLowerCase(Locale.ROOT);
            if (s.contains("facebook") || s.equals("fb") || s.equals("meta")) return "facebook-ads";
            if (s.contains("instagram") || s.equals("ig")) return "instagram";
            if (s.contains("google") || s.contains("youtube")) return "google-ads";
        }
        return formSource != null ? formSource : "social-media";
    }

    private static String buildNotes(LeadCaptureForm form, String message, PublicLeadSubmissionDTO req) {
        StringBuilder notes = new StringBuilder();
        if (message != null) notes.append(message).append("\n\n");
        notes.append("Captured via lead form: ").append(form.getName());
        // Audit trail for consent (DPDP / ad-platform lead-form policies).
        notes.append("\nAgreed to be contacted: ").append(LocalDateTime.now().withNano(0));
        String utm = List.of(
                        labelled("source", req.getUtmSource()),
                        labelled("medium", req.getUtmMedium()),
                        labelled("campaign", req.getUtmCampaign()),
                        labelled("content", req.getUtmContent()))
                .stream().filter(s -> !s.isEmpty()).collect(Collectors.joining(", "));
        if (!utm.isEmpty()) notes.append("\nAd tracking: ").append(utm);
        return notes.toString();
    }

    private static String labelled(String label, String value) {
        String v = clean(value, 100);
        return v == null ? "" : label + "=" + v;
    }

    private static String[] splitName(String fullName) {
        String[] parts = fullName.split("\\s+", 2);
        // Empty (not null) last name: LeadService's notification text concatenates it.
        return new String[]{parts[0], parts.length > 1 ? parts[1] : ""};
    }

    private static String clean(String value, int maxLength) {
        if (value == null) return null;
        String trimmed = value.trim();
        if (trimmed.isEmpty()) return null;
        return trimmed.length() > maxLength ? trimmed.substring(0, maxLength) : trimmed;
    }
}
