package com.company.project.services;

import com.company.project.entities.Branch;
import com.company.project.repositories.BranchRepository;
import com.company.project.security.BranchContextHolder;
import org.springframework.stereotype.Service;

/**
 * Shared branch-resolution rule for the settings tables that used to be one
 * global singleton row (BiosSettings, AttendanceReportSettings,
 * CompanyTaxDetails, ReferralSettings, and the COMPANY/APP_PREFERENCES rows
 * of FinancialSetting) and are now one row per branch.
 */
@Service
public class BranchSettingsResolver {

    private final BranchRepository branchRepository;

    public BranchSettingsResolver(BranchRepository branchRepository) {
        this.branchRepository = branchRepository;
    }

    /**
     * For GET endpoints: the caller's active branch, or — while viewing "All
     * Branches" — the default branch as a read-only reference, so the page still
     * shows something instead of an error. Null only if literally no branch
     * exists yet (fresh install).
     */
    public Long resolveForRead() {
        Long activeBranchId = BranchContextHolder.getActiveBranchId();
        if (activeBranchId != null) {
            return activeBranchId;
        }
        return branchRepository.findByIsDefaultTrue()
                .map(Branch::getId)
                .orElseGet(() -> branchRepository.findAll().stream().findFirst().map(Branch::getId).orElse(null));
    }

    /** For PUT/POST endpoints: requires one concrete branch — no ambiguous "which branch gets this edit" in All Branches mode. */
    public Long resolveForWrite() {
        Long activeBranchId = BranchContextHolder.getActiveBranchId();
        if (activeBranchId == null) {
            throw new IllegalStateException("Select a specific branch to edit these settings.");
        }
        return activeBranchId;
    }
}
