package com.company.project.services;

import com.company.project.entities.Branch;
import com.company.project.entities.Member;
import com.company.project.entities.MemberAddon;
import com.company.project.repositories.BranchRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * What a membership freeze does to the member's add-ons and facility access — a branch
 * setting (Branch Settings › Membership freeze), each side on its own: paused with the
 * membership (end date moves out by the frozen days on unfreeze) or left running.
 *
 * The rule is copied onto the member when the freeze starts, so changing the setting
 * doesn't change a freeze already running. A member with no branch (or a branch that is
 * gone) uses the default branch; with no branch at all both pause.
 */
@Component
public class FreezeAddonPolicy {

    public record Rule(boolean pausesAddons, boolean pausesFacilities) {
        public static final Rule PAUSE_ALL = new Rule(true, true);

        public boolean pauses(MemberAddon addon) {
            return isFacility(addon) ? pausesFacilities : pausesAddons;
        }
    }

    private final BranchRepository branchRepository;

    public FreezeAddonPolicy(BranchRepository branchRepository) {
        this.branchRepository = branchRepository;
    }

    /** Facility access is a MemberAddon sold from a facility (RegistrationAddonService). */
    public static boolean isFacility(MemberAddon addon) {
        return addon.getFacilityId() != null
                || RegistrationAddonService.FACILITY_CATEGORY.equalsIgnoreCase(addon.getCategory());
    }

    /** Cancelled / rejected / refunded ones, or ones already over, have nothing to pause. */
    public static boolean isRunning(MemberAddon addon, LocalDateTime at) {
        String st = addon.getStatus() == null ? "" : addon.getStatus().toLowerCase();
        if (st.contains("cancel") || st.contains("reject") || st.contains("refund")) return false;
        return addon.getExpiryDate() == null || at == null || !addon.getExpiryDate().isBefore(at);
    }

    public Rule forBranch(Long branchId) {
        Branch branch = branchId != null ? branchRepository.findById(branchId).orElse(null) : null;
        if (branch == null) branch = branchRepository.findByIsDefaultTrue().orElse(null);
        return branch == null ? Rule.PAUSE_ALL : new Rule(branch.isFreezePausesAddons(), branch.isFreezePausesFacilities());
    }

    /** The running freeze's rule, or the branch's current one if the member has none recorded. */
    public Rule forMember(Member member) {
        if (member.getFreezePausesAddons() != null && member.getFreezePausesFacilities() != null) {
            return new Rule(member.getFreezePausesAddons(), member.getFreezePausesFacilities());
        }
        Rule branch = forBranch(member.getBranchId());
        return new Rule(member.getFreezePausesAddons() != null ? member.getFreezePausesAddons() : branch.pausesAddons(),
                member.getFreezePausesFacilities() != null ? member.getFreezePausesFacilities() : branch.pausesFacilities());
    }

    /** Called as the freeze starts. */
    public void recordOnFreeze(Member member) {
        Rule rule = forBranch(member.getBranchId());
        member.setFreezePausesAddons(rule.pausesAddons());
        member.setFreezePausesFacilities(rule.pausesFacilities());
    }

    public static void clearOnUnfreeze(Member member) {
        member.setFreezePausesAddons(null);
        member.setFreezePausesFacilities(null);
    }

    /** For display: is this add-on standing still right now because the membership is frozen? */
    public static boolean isPaused(Member member, MemberAddon addon) {
        if (member == null || !MemberSuspension.isFrozen(member)) return false;
        // Running when the freeze began — it may pass its old end date mid-freeze and still get the days back.
        LocalDateTime since = member.getFreezeStartDate() != null ? member.getFreezeStartDate() : LocalDateTime.now();
        if (!isRunning(addon, since)) return false;
        return isFacility(addon)
                ? !Boolean.FALSE.equals(member.getFreezePausesFacilities())
                : !Boolean.FALSE.equals(member.getFreezePausesAddons());
    }
}
