package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;

/**
 * A member's chat with one staff member of their branch, or with the branch's shared
 * front desk (staffId null). One per member per staff member; either side can start it.
 * Who may send, and when, is ConversationPolicyService's call; this row only keeps
 * the state those rules need.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "conversations")
public class Conversation extends BaseEntity implements BranchAware {

    public static final String MEMBER = "MEMBER";
    public static final String STAFF = "STAFF";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    /** Null = front desk. */
    @Column(name = "staff_id")
    private Long staffId;

    @Column(name = "started_by", nullable = false, length = 10)
    private String startedBy;

    @Column(name = "started_by_staff_id")
    private Long startedByStaffId;

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    @Column(name = "last_message_preview", length = 120)
    private String lastMessagePreview;

    /** MEMBER | STAFF — who sent the latest message. */
    @Column(name = "last_sender", length = 10)
    private String lastSender;

    /** How many messages lastSender has sent in a row without an answer. */
    @Column(name = "trailing_count", nullable = false)
    private int trailingCount;

    @Column(name = "member_unread", nullable = false)
    private int memberUnread;

    @Column(name = "staff_unread", nullable = false)
    private int staffUnread;

    @Column(name = "staff_push_pending_since")
    private LocalDateTime staffPushPendingSince;

    @Column(name = "muted_until")
    private LocalDateTime mutedUntil;

    @Column(name = "muted_by_staff_id")
    private Long mutedByStaffId;

    @Column(name = "blocked_by_member_at")
    private LocalDateTime blockedByMemberAt;

    @Column(name = "blocked_by_admin_at")
    private LocalDateTime blockedByAdminAt;

    @Column(name = "blocked_by_admin")
    private String blockedByAdmin;

    public boolean isFrontDesk() { return staffId == null; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }

    public String getStartedBy() { return startedBy; }
    public void setStartedBy(String startedBy) { this.startedBy = startedBy; }

    public Long getStartedByStaffId() { return startedByStaffId; }
    public void setStartedByStaffId(Long startedByStaffId) { this.startedByStaffId = startedByStaffId; }

    public LocalDateTime getLastMessageAt() { return lastMessageAt; }
    public void setLastMessageAt(LocalDateTime lastMessageAt) { this.lastMessageAt = lastMessageAt; }

    public String getLastMessagePreview() { return lastMessagePreview; }
    public void setLastMessagePreview(String lastMessagePreview) { this.lastMessagePreview = lastMessagePreview; }

    public String getLastSender() { return lastSender; }
    public void setLastSender(String lastSender) { this.lastSender = lastSender; }

    public int getTrailingCount() { return trailingCount; }
    public void setTrailingCount(int trailingCount) { this.trailingCount = trailingCount; }

    public int getMemberUnread() { return memberUnread; }
    public void setMemberUnread(int memberUnread) { this.memberUnread = memberUnread; }

    public int getStaffUnread() { return staffUnread; }
    public void setStaffUnread(int staffUnread) { this.staffUnread = staffUnread; }

    public LocalDateTime getStaffPushPendingSince() { return staffPushPendingSince; }
    public void setStaffPushPendingSince(LocalDateTime staffPushPendingSince) { this.staffPushPendingSince = staffPushPendingSince; }

    public LocalDateTime getMutedUntil() { return mutedUntil; }
    public void setMutedUntil(LocalDateTime mutedUntil) { this.mutedUntil = mutedUntil; }

    public Long getMutedByStaffId() { return mutedByStaffId; }
    public void setMutedByStaffId(Long mutedByStaffId) { this.mutedByStaffId = mutedByStaffId; }

    public LocalDateTime getBlockedByMemberAt() { return blockedByMemberAt; }
    public void setBlockedByMemberAt(LocalDateTime blockedByMemberAt) { this.blockedByMemberAt = blockedByMemberAt; }

    public LocalDateTime getBlockedByAdminAt() { return blockedByAdminAt; }
    public void setBlockedByAdminAt(LocalDateTime blockedByAdminAt) { this.blockedByAdminAt = blockedByAdminAt; }

    public String getBlockedByAdmin() { return blockedByAdmin; }
    public void setBlockedByAdmin(String blockedByAdmin) { this.blockedByAdmin = blockedByAdmin; }

    @Override
    public Long getBranchId() { return branchId; }

    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
