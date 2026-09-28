package com.company.project.services.mobile.family;

import com.company.project.controlplane.entities.FamilyInvitationDirectoryEntry;
import com.company.project.controlplane.repositories.FamilyInvitationDirectoryRepository;
import com.company.project.entities.Member;
import com.company.project.entities.MobileFamilyInvitation;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.mobile.family.MobileFamilyInvitationRepository;
import com.company.project.services.EmailService;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Locale;

/**
 * Mobile Family/Couple invitations. An invitation is claimed by the invitee
 * logging in to the app with the email it was sent to (verified at registration)
 * — no link or code to carry across. The tenant-DB invitation row is the source of
 * truth; FamilyInvitationDirectoryEntry is the control-plane index that lets login
 * find it without knowing the tenant.
 *
 * Methods touching tenant data expect TenantContextHolder to already be set.
 */
@Service
public class MobileFamilyInvitationService {

    private static final Logger log = LoggerFactory.getLogger(MobileFamilyInvitationService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    public enum ClaimStatus { CLAIMED, SKIPPED_EXISTING_MEMBERSHIP, REVOKED, EXPIRED, INVALID }

    private final MobileFamilyInvitationRepository invitationRepository;
    private final MemberRepository memberRepository;
    private final FamilyInvitationDirectoryRepository directoryRepository;
    private final EmailService emailService;

    @Value("${mobile.app.download-url:}")
    private String appDownloadUrl;

    public MobileFamilyInvitationService(MobileFamilyInvitationRepository invitationRepository,
                                         MemberRepository memberRepository,
                                         FamilyInvitationDirectoryRepository directoryRepository,
                                         EmailService emailService) {
        this.invitationRepository = invitationRepository;
        this.memberRepository = memberRepository;
        this.directoryRepository = directoryRepository;
        this.emailService = emailService;
    }

    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Creates the invitation for a newly created family member with an email, in
     * the caller's (tenant) transaction, and indexes it in the control plane right
     * away — that write commits on its own, so if the tenant transaction then rolls
     * back the index row is orphaned, which claimInTenant reports as INVALID.
     */
    public MobileFamilyInvitation createInvitation(Member head, Member dependent, String tenantSlug,
                                                   String gymName, String planName) {
        LocalDateTime now = LocalDateTime.now();
        MobileFamilyInvitation invitation = new MobileFamilyInvitation();
        invitation.setPrimaryMemberId(head.getMemberId());
        invitation.setDependentMemberId(dependent.getMemberId());
        invitation.setRecipientEmail(normalizeEmail(dependent.getEmail()));
        // Claims match on the invitee's verified email, not a token; token_hash is a
        // required unique column, filled with an unguessable value nothing reads.
        invitation.setTokenHash(randomToken());
        invitation.setStatus("PENDING");
        // Claimable for as long as the membership it grants is still running.
        invitation.setExpiresAt(dependent.getExpiryDate() != null ? dependent.getExpiryDate() : now.plusDays(30));
        invitation.setCreatedAt(now);
        invitation.setUpdatedAt(now);
        invitation = invitationRepository.save(invitation);

        FamilyInvitationDirectoryEntry entry = new FamilyInvitationDirectoryEntry();
        entry.setRecipientEmail(invitation.getRecipientEmail());
        entry.setTenantSlug(tenantSlug);
        entry.setInvitationId(invitation.getId());
        entry.setStatus("PENDING");
        entry.setGymName(gymName);
        entry.setInviterName(head.getName());
        entry.setPlanName(planName);
        directoryRepository.save(entry);

        return invitation;
    }

    /** Best-effort: a missing SMTP config or send failure never fails the purchase — login still claims by email. */
    public void sendInvitationEmail(String recipientEmail, String recipientName, String inviterName,
                                    String gymName, String planName) {
        if (!emailService.isConfigured()) {
            log.warn("SMTP not configured — family invitation email to {} not sent (they can still claim by logging in with that email)", recipientEmail);
            return;
        }
        String gym = StringUtils.hasText(gymName) ? gymName : "the gym";
        String subject = inviterName + " added you to their " + planName + " membership at " + gym;
        StringBuilder html = new StringBuilder()
                .append("<p>Hi ").append(esc(recipientName)).append(",</p>")
                .append("<p><strong>").append(esc(inviterName)).append("</strong> has added you to their <strong>")
                .append(esc(planName)).append("</strong> membership at <strong>").append(esc(gym)).append("</strong>.</p>")
                .append("<p>To start using it, download the GymBios app and sign up or log in with this email address (<strong>")
                .append(esc(recipientEmail)).append("</strong>). Your membership will be activated automatically.</p>");
        if (StringUtils.hasText(appDownloadUrl)) {
            html.append("<p><a href=\"").append(esc(appDownloadUrl))
                .append("\" style=\"display:inline-block;padding:10px 18px;background:#0f766e;color:#fff;border-radius:6px;text-decoration:none\">Download GymBios</a></p>");
        }
        html.append("<p>If you already have your own membership at ").append(esc(gym))
            .append(", it stays as it is.</p>");
        try {
            emailService.sendEmail(recipientEmail, subject, html.toString());
        } catch (Exception e) {
            log.error("Failed to send family invitation email to {}", recipientEmail, e);
        }
    }

    /**
     * Claims one invitation in the current tenant for the logged-in user. An own
     * membership already held in this gym wins: the invitation is marked SKIPPED
     * and nothing is linked.
     */
    @Transactional
    public ClaimStatus claimInTenant(Long invitationId, String callerEmail, Long globalUserId) {
        MobileFamilyInvitation invitation = invitationRepository.findById(invitationId).orElse(null);
        if (invitation == null) {
            return ClaimStatus.INVALID; // purchase rolled back after the index write
        }
        if (!invitation.getRecipientEmail().equalsIgnoreCase(callerEmail)) {
            return ClaimStatus.INVALID;
        }
        Member dependent = memberRepository.findByMemberId(invitation.getDependentMemberId()).orElse(null);
        if (dependent == null) {
            return ClaimStatus.INVALID;
        }
        if (globalUserId.equals(dependent.getGlobalUserId())) {
            invitationRepository.transitionFromPending(invitationId, "CLAIMED", LocalDateTime.now());
            return ClaimStatus.CLAIMED; // already linked (repeat login)
        }
        switch (invitation.getStatus()) {
            case "PENDING": break;
            case "REVOKED": return ClaimStatus.REVOKED;
            case "EXPIRED": return ClaimStatus.EXPIRED;
            case "SKIPPED": return ClaimStatus.SKIPPED_EXISTING_MEMBERSHIP;
            default: return ClaimStatus.INVALID;
        }
        if (invitation.getExpiresAt().isBefore(LocalDateTime.now())) {
            invitationRepository.transitionFromPending(invitationId, "EXPIRED", LocalDateTime.now());
            return ClaimStatus.EXPIRED;
        }
        if (dependent.getGlobalUserId() != null) {
            return ClaimStatus.INVALID;
        }
        if (memberRepository.existsByGlobalUserId(globalUserId)
                || memberRepository.existsOwnMembershipByEmail(callerEmail, dependent.getMemberId())) {
            invitationRepository.transitionFromPending(invitationId, "SKIPPED", LocalDateTime.now());
            return ClaimStatus.SKIPPED_EXISTING_MEMBERSHIP;
        }

        if (invitationRepository.transitionFromPending(invitationId, "CLAIMED", LocalDateTime.now()) == 0) {
            throw new IllegalStateException("Invitation was claimed or revoked concurrently");
        }
        dependent.setGlobalUserId(globalUserId);
        memberRepository.saveAndFlush(dependent);
        return ClaimStatus.CLAIMED;
    }

    public void updateDirectoryStatus(String tenantSlug, Long invitationId, String status) {
        directoryRepository.findByTenantSlugAndInvitationId(tenantSlug, invitationId).ifPresent(entry -> {
            entry.setStatus(status);
            directoryRepository.save(entry);
        });
    }

    /** Re-sends the email for a still-pending invitation; primary member only. */
    public void resendInvitation(Long invitationId, Long senderGlobalUserId, String tenantSlug) {
        MobileFamilyInvitation invitation = requireOwnPendingInvitation(invitationId, senderGlobalUserId);
        Member head = memberRepository.findByMemberId(invitation.getPrimaryMemberId()).orElseThrow();
        Member dependent = memberRepository.findByMemberId(invitation.getDependentMemberId())
                .orElseThrow(() -> new IllegalStateException("Family member not found"));
        String gymName = directoryRepository.findByTenantSlugAndInvitationId(tenantSlug, invitationId)
                .map(FamilyInvitationDirectoryEntry::getGymName).orElse(null);
        sendInvitationEmail(invitation.getRecipientEmail(), dependent.getName(), head.getName(),
                gymName, dependent.getMembershipPlan());
    }

    @Transactional
    public void revokeInvitation(Long invitationId, Long senderGlobalUserId, String tenantSlug) {
        requireOwnPendingInvitation(invitationId, senderGlobalUserId);
        if (invitationRepository.transitionFromPending(invitationId, "REVOKED", LocalDateTime.now()) == 0) {
            throw new IllegalStateException("Can only revoke pending invitations");
        }
        updateDirectoryStatus(tenantSlug, invitationId, "REVOKED");
    }

    private MobileFamilyInvitation requireOwnPendingInvitation(Long invitationId, Long senderGlobalUserId) {
        // Someone else's invitation reads as not found rather than revealing it exists.
        MobileFamilyInvitation invitation = invitationRepository.findById(invitationId)
                .filter(inv -> memberRepository.findByMemberId(inv.getPrimaryMemberId())
                        .map(primary -> senderGlobalUserId.equals(primary.getGlobalUserId()))
                        .orElse(false))
                .orElseThrow(() -> new EntityNotFoundException("Invitation not found"));
        if (!"PENDING".equals(invitation.getStatus())) {
            throw new IllegalStateException("Only pending invitations can be changed");
        }
        return invitation;
    }

    private static String randomToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String esc(String s) {
        return s == null ? "" : HtmlUtils.htmlEscape(s);
    }
}
