package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import com.company.project.converters.JsonStringListConverter;

import java.util.ArrayList;
import java.util.List;

/**
 * A member's rating of one staff member. Separate from Review (branch ratings) and
 * WorkoutFeedback (per-session feedback). One row per (staff, member); rating again
 * replaces it.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "staff_ratings", uniqueConstraints = @UniqueConstraint(columnNames = {"staff_id", "member_id"}))
public class StaffRating extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(name = "staff_id", nullable = false)
    private Long staffId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "global_user_id")
    private Long globalUserId;

    @Column(nullable = false)
    private Integer rating;

    @Column(columnDefinition = "TEXT")
    private String comment;

    /** "What stood out" keys picked in the app, e.g. ["motivating","punctual"]. */
    @Convert(converter = JsonStringListConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<String> tags = new ArrayList<>();

    /** Hidden from other members; gym staff still see who wrote it. */
    @Column(nullable = false)
    private boolean anonymous = false;

    public StaffRating() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public Long getGlobalUserId() { return globalUserId; }
    public void setGlobalUserId(Long globalUserId) { this.globalUserId = globalUserId; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public boolean isAnonymous() { return anonymous; }
    public void setAnonymous(boolean anonymous) { this.anonymous = anonymous; }

    @Override
    public Long getBranchId() { return branchId; }

    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
