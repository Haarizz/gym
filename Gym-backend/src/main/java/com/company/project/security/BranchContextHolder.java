package com.company.project.security;

/**
 * ThreadLocal holder for the active branch context.
 * Set by {@link BranchContextFilter} on each request based on the
 * {@code X-Active-Branch-Id} header, and cleared after the request completes.
 *
 * A {@code null} value means "All Branches" mode (admin consolidated view).
 */
public final class BranchContextHolder {

    private static final ThreadLocal<Long> ACTIVE_BRANCH_ID = new ThreadLocal<>();

    private BranchContextHolder() {}

    public static void setActiveBranchId(Long branchId) {
        ACTIVE_BRANCH_ID.set(branchId);
    }

    /**
     * Returns the active branch ID for the current request.
     * {@code null} indicates "All Branches" mode.
     */
    public static Long getActiveBranchId() {
        return ACTIVE_BRANCH_ID.get();
    }

    /** Must be called after every request to prevent thread-pool leaks. */
    public static void clear() {
        ACTIVE_BRANCH_ID.remove();
    }
}
