package com.company.project.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Member KPIs and the member trend for the BiOS page, computed in the database
 * and scoped to the active branch (or every branch in "All Branches" mode).
 * Replaces the page downloading up to 5,000 members and counting them itself.
 * Statuses are effective as of today: an "active" member past their end date
 * counts as expired, as everywhere else in the app.
 */
public class BiosOverviewDTO {

    private LocalDate asOf;
    private long totalMembers;
    private long activeMembers;
    private long expiredMembers;
    private long suspendedMembers;
    private long overdueMembers;
    private long recentJoins;
    private List<MembershipTypeRow> membershipTypes;
    private List<MemberTrendPoint> memberTrend;

    public record MembershipTypeRow(String membershipType, long total, long active, long expired) {}

    /**
     * One month of the member trend. source is "live" (the current month),
     * "snapshot" (recorded at month end) or "estimated" (rebuilt from membership
     * periods and receipts, for months before snapshots started).
     */
    public record MemberTrendPoint(String period, long members, long activeMembers, long newMembers,
                                   double retention, double churn, String source) {}

    public LocalDate getAsOf() { return asOf; }
    public void setAsOf(LocalDate asOf) { this.asOf = asOf; }

    public long getTotalMembers() { return totalMembers; }
    public void setTotalMembers(long totalMembers) { this.totalMembers = totalMembers; }

    public long getActiveMembers() { return activeMembers; }
    public void setActiveMembers(long activeMembers) { this.activeMembers = activeMembers; }

    public long getExpiredMembers() { return expiredMembers; }
    public void setExpiredMembers(long expiredMembers) { this.expiredMembers = expiredMembers; }

    public long getSuspendedMembers() { return suspendedMembers; }
    public void setSuspendedMembers(long suspendedMembers) { this.suspendedMembers = suspendedMembers; }

    public long getOverdueMembers() { return overdueMembers; }
    public void setOverdueMembers(long overdueMembers) { this.overdueMembers = overdueMembers; }

    public long getRecentJoins() { return recentJoins; }
    public void setRecentJoins(long recentJoins) { this.recentJoins = recentJoins; }

    public List<MembershipTypeRow> getMembershipTypes() { return membershipTypes; }
    public void setMembershipTypes(List<MembershipTypeRow> membershipTypes) { this.membershipTypes = membershipTypes; }

    public List<MemberTrendPoint> getMemberTrend() { return memberTrend; }
    public void setMemberTrend(List<MemberTrendPoint> memberTrend) { this.memberTrend = memberTrend; }
}
