package com.company.project.services;

import com.company.project.config.TenantRoutingDataSource;
import com.company.project.controlplane.entities.GlobalBranchDiscovery;
import com.company.project.controlplane.repositories.GlobalBranchDiscoveryRepository;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.entities.Branch;
import com.company.project.entities.Gym;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.GymRepository;
import com.company.project.security.TenantContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DiscoverySyncService {

    private static final Logger log = LoggerFactory.getLogger(DiscoverySyncService.class);

    private final GlobalBranchDiscoveryRepository discoveryRepository;
    private final TenantRepository tenantRepository;
    private final BranchRepository branchRepository;
    private final GymRepository gymRepository;
    private final TenantRoutingDataSource tenantDataSource;

    public DiscoverySyncService(
            GlobalBranchDiscoveryRepository discoveryRepository,
            TenantRepository tenantRepository,
            BranchRepository branchRepository,
            GymRepository gymRepository,
            TenantRoutingDataSource tenantDataSource) {
        this.discoveryRepository = discoveryRepository;
        this.tenantRepository = tenantRepository;
        this.branchRepository = branchRepository;
        this.gymRepository = gymRepository;
        this.tenantDataSource = tenantDataSource;
    }

    @Transactional("controlPlaneTransactionManager")
    public void syncBranch(Branch branch) {
        String tenantSlug = TenantContextHolder.getCurrentTenant();
        if (tenantSlug == null) return;
        
        Gym gym = gymRepository.findByIsDefaultTrue().orElse(null);
        String gymName = gym != null ? gym.getName() : "Unknown Gym";

        GlobalBranchDiscovery discovery = discoveryRepository
                .findByTenantSlugAndBranchId(tenantSlug, branch.getId())
                .orElseGet(GlobalBranchDiscovery::new);

        discovery.setTenantSlug(tenantSlug);
        discovery.setBranchId(branch.getId());
        discovery.setGymName(gymName);
        discovery.setBranchName(branch.getBranchName());
        discovery.setAddress(branch.getAddress());
        discovery.setLat(branch.getLat());
        discovery.setLng(branch.getLng());
        discovery.setPhone(branch.getPhone());
        discovery.setStatus(branch.getStatus());

        discoveryRepository.save(discovery);
    }

    public void backfillForTenant(String tenantSlug) {
        try {
            TenantContextHolder.setCurrentTenant(tenantSlug);
            
            Gym gym = gymRepository.findByIsDefaultTrue().orElse(null);
            if (gym == null) return;
            
            List<Branch> branches = branchRepository.findAll();
            
            // Write to control plane outside of tenant context
            for (Branch branch : branches) {
                syncBranch(branch);
            }
            log.info("Backfilled {} branches for tenant {}", branches.size(), tenantSlug);
        } catch (Exception e) {
            log.error("Failed to backfill discovery data for tenant {}", tenantSlug, e);
        } finally {
            TenantContextHolder.clear();
        }
    }

    public void backfillDiscoveryData() {
        tenantRepository.findAll().forEach(tenant -> {
            if ("PROVISIONING".equals(tenant.getStatus()) || "PROVISION_FAILED".equals(tenant.getStatus())) {
                return;
            }
            backfillForTenant(tenant.getSlug());
        });
    }
}
