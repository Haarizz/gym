package com.company.project.services.conversations;

import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.entities.Conversation;
import com.company.project.repositories.ConversationRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.security.TenantContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Sends the pushes held back by quiet hours: a member wrote while the staff member (or
 * every desk staff member) was off shift, so ConversationNotifier marked the conversation
 * instead of buzzing them. Every 10 minutes, each marked conversation whose recipients
 * are now on shift gets one push and is unmarked. Reading or answering it unmarks it too.
 *
 * Runs for every gym like MembershipAutoUnfreezeScheduler: the primary database first,
 * then each active tenant's own; each conversation in its own transaction.
 */
@Service
public class ConversationQuietHoursScheduler {

    private static final Logger log = LoggerFactory.getLogger(ConversationQuietHoursScheduler.class);

    private final ConversationRepository conversationRepository;
    private final StaffRepository staffRepository;
    private final MemberRepository memberRepository;
    private final ConversationNotifier notifier;
    private final TenantRepository tenantRepository;
    private final TransactionTemplate tx;

    public ConversationQuietHoursScheduler(
            ConversationRepository conversationRepository,
            StaffRepository staffRepository,
            MemberRepository memberRepository,
            ConversationNotifier notifier,
            TenantRepository tenantRepository,
            PlatformTransactionManager transactionManager) {
        this.conversationRepository = conversationRepository;
        this.staffRepository = staffRepository;
        this.memberRepository = memberRepository;
        this.notifier = notifier;
        this.tenantRepository = tenantRepository;
        this.tx = new TransactionTemplate(transactionManager);
    }

    @Scheduled(cron = "0 */10 * * * *")
    public void flushAllTenants() {
        runForCurrentDatabase("primary");

        List<Tenant> tenants;
        try {
            tenants = tenantRepository.findAll();
        } catch (Exception e) {
            log.error("Chat quiet hours: could not list tenants", e);
            return;
        }
        for (Tenant tenant : tenants) {
            if (tenant.getSlug() == null || !"ACTIVE".equalsIgnoreCase(tenant.getStatus())) continue;
            try {
                TenantContextHolder.setCurrentTenant(tenant.getSlug());
                runForCurrentDatabase(tenant.getSlug());
            } finally {
                TenantContextHolder.clear();
            }
        }
    }

    private void runForCurrentDatabase(String label) {
        List<Long> pending;
        try {
            pending = conversationRepository.findByStaffPushPendingSinceIsNotNull().stream()
                    .map(Conversation::getId)
                    .toList();
        } catch (Exception e) {
            log.error("Chat quiet hours: could not load held messages for {}", label, e);
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        for (Long id : pending) {
            try {
                tx.executeWithoutResult(s -> flush(id, now));
            } catch (Exception e) {
                log.error("Chat quiet hours: push failed for conversation {} in {}", id, label, e);
            }
        }
    }

    private void flush(Long id, LocalDateTime now) {
        Conversation c = conversationRepository.findByIdForUpdate(id).orElse(null);
        if (c == null || c.getStaffPushPendingSince() == null) return;
        var staff = c.isFrontDesk() ? null : staffRepository.findById(c.getStaffId()).orElse(null);
        // Nobody left to tell (staff member gone, no desk staff with the app): stop holding it.
        if (notifier.recipients(c, staff).isEmpty()
                || notifier.flushPending(c, staff, memberRepository.findById(c.getMemberId()).orElse(null), now)) {
            c.setStaffPushPendingSince(null);
            conversationRepository.save(c);
        }
    }
}
