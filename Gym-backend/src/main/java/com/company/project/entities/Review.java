package com.company.project.entities;

import jakarta.persistence.*;
import com.company.project.converters.JsonStringListConverter;
import org.hibernate.annotations.Filter;

import java.util.ArrayList;
import java.util.List;

@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "reviews")
public class Review extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "global_user_id")
    private Long globalUserId;

    @Column(nullable = false)
    private Integer rating;

    @Column(columnDefinition = "TEXT")
    private String comment;

    /** "What stood out" keys picked in the app, e.g. ["clean","good_equipment"]. */
    @Convert(converter = JsonStringListConverter.class)
    @Column(columnDefinition = "TEXT")
    private List<String> tags = new ArrayList<>();

    /** Hidden from other members; gym staff and the platform admin still see who wrote it. */
    @Column(nullable = false)
    private boolean anonymous = false;

    public Review() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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
