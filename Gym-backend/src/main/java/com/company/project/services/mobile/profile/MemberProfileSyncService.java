package com.company.project.services.mobile.profile;

import com.company.project.controlplane.repositories.UserMembershipRepository;
import com.company.project.entities.Member;
import com.company.project.repositories.MemberRepository;
import com.company.project.security.TenantContextHolder;
import com.company.project.services.accounts.IdentityField;
import jakarta.persistence.EntityManagerFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.orm.jpa.EntityManagerFactoryUtils;
import org.springframework.orm.jpa.EntityManagerHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Predicate;

/**
 * A GymBios account's details live on its profile (main database), but each gym's web
 * panel reads its own members row (tenant database). An app edit to the person's own
 * details is copied to the members row of every gym they belong to
 * (docs/global-accounts-for-gym-created-members-plan.md §3; photos since BG_82). The row
 * is found by the caller's own globalUserId, so nobody can touch another member's record.
 *
 * Deliberately not @Transactional and called after the profile save has committed: it
 * swaps the request's EntityManager for one bound to each gym's database, the same way
 * MobileDiscoveryController reads each gym (OSIV would otherwise keep using the first
 * connection). Best-effort — one failing gym never fails the edit or stops the others.
 */
@Service
public class MemberProfileSyncService {

    private static final Logger log = LoggerFactory.getLogger(MemberProfileSyncService.class);

    private final MemberRepository memberRepository;
    private final EntityManagerFactory entityManagerFactory;
    private final UserMembershipRepository userMembershipRepository;

    public MemberProfileSyncService(MemberRepository memberRepository,
                                    EntityManagerFactory entityManagerFactory,
                                    UserMembershipRepository userMembershipRepository) {
        this.memberRepository = memberRepository;
        this.entityManagerFactory = entityManagerFactory;
        this.userMembershipRepository = userMembershipRepository;
    }

    /**
     * Copies the fields an app edit changed to every gym this account is a member of (the
     * control-plane user_memberships index), plus the gym the app has selected in case
     * the index hasn't caught up.
     */
    public void syncToAllGyms(Long globalUserId, String selectedTenantSlug,
                              Map<IdentityField, Object> values, Set<IdentityField> fields) {
        if (globalUserId == null || fields.isEmpty()) {
            return;
        }
        Set<String> tenants = new LinkedHashSet<>();
        if (selectedTenantSlug != null && !selectedTenantSlug.isBlank()) tenants.add(selectedTenantSlug.trim());
        try {
            userMembershipRepository.findByGlobalUserId(globalUserId)
                    .forEach(entry -> tenants.add(entry.getTenantSlug()));
        } catch (Exception e) {
            log.warn("Could not read membership index for global user {}: {}", globalUserId, e.getMessage());
        }
        tenants.forEach(tenant -> inGym(globalUserId, tenant,
                member -> IdentityField.apply(values, fields, member)));
    }

    /**
     * BG_82 heal for members created before photos were copied at purchase time: fills
     * the selected gym's photo only when it has none.
     */
    public void fillMissingPhoto(Long globalUserId, String tenantSlug, String photoUrl) {
        if (photoUrl == null || photoUrl.isBlank()) {
            return;
        }
        inGym(globalUserId, tenantSlug, member -> {
            boolean hasPhoto = member.getPhotoUrl() != null && !member.getPhotoUrl().isBlank();
            if (hasPhoto || Objects.equals(member.getPhotoUrl(), photoUrl)) return false;
            member.setPhotoUrl(photoUrl);
            return true;
        });
    }

    /** Runs the change against this account's members row in one gym; saves when it reports a change. */
    private void inGym(Long globalUserId, String tenantSlug, Predicate<Member> change) {
        if (globalUserId == null || tenantSlug == null || tenantSlug.isBlank()) {
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
            if (member != null && change.test(member)) {
                memberRepository.save(member);
            }
        } catch (Exception e) {
            log.warn("Could not sync profile to gym '{}' for global user {}: {}",
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
