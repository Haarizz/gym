package com.company.project.services;

import com.company.project.entities.Branch;
import com.company.project.exceptions.BusinessRuleViolationException;

/**
 * Branch "Access Type" (Branch Settings) — who may join or enter a branch, by gender.
 *
 *   Male                         → Men Only and Mixed
 *   Female                       → Ladies Only and Mixed
 *   Transgender / Other / blank  → Mixed only
 *
 * Staff who want to admit someone outside that rule set the member's gender on their
 * gym record; there is deliberately no per-member override.
 *
 * Both values are stored as free text ("Ladies Only", "MALE", "male", …), so they are
 * normalised here rather than compared as strings.
 */
public final class BranchAccessPolicy {

    public enum Access { MIXED, LADIES_ONLY, MEN_ONLY }

    public enum Gender { MALE, FEMALE, OTHER }

    private BranchAccessPolicy() {}

    public static Access access(String accessType) {
        if (accessType == null) return Access.MIXED;
        String a = accessType.trim().toLowerCase();
        // Check the female spellings first — "women" contains "men".
        if (a.contains("ladies") || a.contains("lady") || a.contains("women") || a.contains("female")) {
            return Access.LADIES_ONLY;
        }
        if (a.contains("men") || a.contains("male")) return Access.MEN_ONLY;
        return Access.MIXED;
    }

    public static Gender gender(String gender) {
        if (gender == null) return Gender.OTHER;
        return switch (gender.trim().toLowerCase()) {
            case "male", "m", "man" -> Gender.MALE;
            case "female", "f", "woman" -> Gender.FEMALE;
            default -> Gender.OTHER;
        };
    }

    public static boolean isAllowed(String accessType, String gender) {
        return switch (access(accessType)) {
            case MIXED -> true;
            case LADIES_ONLY -> gender(gender) == Gender.FEMALE;
            case MEN_ONLY -> gender(gender) == Gender.MALE;
        };
    }

    public static boolean isAllowed(Branch branch, String gender) {
        return branch == null || isAllowed(branch.getAccessType(), gender);
    }

    /** Why {@code gender} can't join {@code branch}, or null when it can. */
    public static String refusalReason(Branch branch, String gender, boolean forMember) {
        if (isAllowed(branch, gender)) return null;
        String name = branch.getBranchName() != null && !branch.getBranchName().isBlank()
                ? branch.getBranchName() : "This branch";
        String label = access(branch.getAccessType()) == Access.LADIES_ONLY ? "ladies only" : "men only";
        boolean blank = gender == null || gender.isBlank();
        if (blank) {
            return forMember
                    ? name + " is " + label + ". Add your gender in your profile to join."
                    : name + " is " + label + ". Select the member's gender to register them here.";
        }
        return forMember
                ? name + " is " + label + " and doesn't match the gender on your profile."
                : name + " is " + label + " — this member's gender doesn't match the branch's access type.";
    }

    /** Throws when {@code gender} may not join or enter {@code branch}. */
    public static void enforce(Branch branch, String gender, boolean forMember) {
        String reason = refusalReason(branch, gender, forMember);
        if (reason != null) throw new BusinessRuleViolationException(reason);
    }
}
