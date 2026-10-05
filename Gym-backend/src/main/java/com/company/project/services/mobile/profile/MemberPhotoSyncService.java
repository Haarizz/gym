package com.company.project.services.mobile.profile;

import com.company.project.entities.Member;
import com.company.project.controlplane.repositories.UserMembershipRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.security.TenantContextHolder;
import jakarta.persistence.EntityManagerFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.orm.jpa.EntityManagerFactoryUtils;
import org.springframework.orm.jpa.EntityManagerHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Objects;

/**
 * BG_82: a mobile member's photo lives on their global UserProfile (control plane),
 * but the web Member Directory reads the gym's own Member row (tenant DB). This
 * copies the photo onto the caller's Member row in the gym the app currently has
 * selected (its X-Tenant-ID header). The row is found by the caller's own
 * globalUserId, so nobody can touch another member's record.
 *
 * Deliberately not @Transactional and called after the profile save has committed:
 * it swaps the request's EntityManager for one bound to the gym's database, the
 * same way MobileDiscoveryController reads each gym (OSIV would otherwise keep
 * using the control-plane connection). Best-effort — a failure never fails the
 * profile update itself.
 */
@Service
public class MemberPhotoSyncService {

    private static final Logger log = LoggerFactory.getLogger(MemberPhotoSyncService.class);

    private final MemberRepository memberRepository;
    private final EntityManagerFactory entityManagerFactory;
    private final UserMembershipRepository userMembershipRepository;

    public MemberPhotoSyncService(MemberRepository memberRepository,
                                  EntityManagerFactory entityManagerFactory,
                                  UserMembershipRepository userMembershipRepository) {
        this.memberRepository = memberRepository;
        this.entityManagerFactory = entityManagerFactory;
        this.userMembershipRepository = userMembershipRepository;
    }

    /**
     * A changed photo: every gym this account is a member of (the control-plane
     * user_memberships index), plus the gym the app has selected in case the index
     * hasn't caught up. Each gym is synced on its own, so one failing gym doesn't
     * stop the rest.
     */
    public void syncToAllGyms(Long globalUserId, String selectedTenantSlug, String photoUrl) {
        java.util.Set<String> tenants = new java.util.LinkedHashSet<>();
        if (selectedTenantSlug != null && !selectedTenantSlug.isBlank()) tenants.add(selectedTenantSlug.trim());
        try {
            userMembershipRepository.findByGlobalUserId(globalUserId)
                    .forEach(entry -> tenants.add(entry.getTenantSlug()));
        } catch (Exception e) {
            log.warn("Could not read membership index for global user {}: {}", globalUserId, e.getMessage());
        }
        tenants.forEach(tenant -> syncToGym(globalUserId, tenant, photoUrl, false));
    }

    /**
     * @param onlyIfMissing true = fill the gym's photo only when it has none (used on
     *                      profile reads to heal members created before this fix).
     */
    public void syncToGym(Long globalUserId, String tenantSlug, String photoUrl, boolean onlyIfMissing) {
        if (globalUserId == null || tenantSlug == null || tenantSlug.isBlank()
                || photoUrl == null || photoUrl.isBlank()) {
            return;
        }
        String previousTenant = TenantContextHolder.getCurrentTenant();
        EntityManagerHolder requestEmHolder = TransactionSynchronizationManager.hasResource(entityManagerFactory)
                ? (EntityManagerHolder) TransactionSynchronizationManager.unbindResource(entityManagerFactory)
                : null;
        try {
            TenantContextHolder.setCurrentTenant(tenantSlug.trim());
            TransactionSynchronizationManager.bindResource(entityManagerFactory,
                    new EntityManagerHolder(entityManagerFactory.createEntityManager()));

            Member member = memberRepository.findByGlobalUserId(globalUserId).orElse(null);
            if (member == null) return;
            boolean hasPhoto = member.getPhotoUrl() != null && !member.getPhotoUrl().isBlank();
            if ((onlyIfMissing && hasPhoto) || Objects.equals(member.getPhotoUrl(), photoUrl)) return;
            member.setPhotoUrl(photoUrl);
            memberRepository.save(member);
        } catch (Exception e) {
            log.warn("Could not sync profile photo to gym '{}' for global user {}: {}",
                    tenantSlug, globalUserId, e.getMessage());
        } finally {
            if (TransactionSynchronizationManager.hasResource(entityManagerFactory)) {
                EntityManagerHolder tenantEmHolder = (EntityManagerHolder) TransactionSynchronizationManager.unbindResource(entityManagerFactory);
                EntityManagerFactoryUtils.closeEntityManager(tenantEmHolder.getEntityManager());
            }
            if (requestEmHolder != null) {
                TransactionSynchronizationManager.bindResource(entityManagerFactory, requestEmHolder);
            }
            if (previousTenant != null) {
                TenantContextHolder.setCurrentTenant(previousTenant);
            } else {
                TenantContextHolder.clear();
            }
        }
    }
}
