package com.company.project.entities;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** A package's trainer changed: days before {@code effectiveDate} stay with the previous trainer. */
@Entity
@Table(name = "package_trainer_changes")
public class PackageTrainerChange {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "enrolment_id", nullable = false)
    private Long enrolmentId;

    @Column(name = "from_trainer_id")
    private Long fromTrainerId;

    @Column(name = "to_trainer_id")
    private Long toTrainerId;

    /** The new trainer's first day. */
    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    @Column(name = "changed_by")
    private String changedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public Long getEnrolmentId() { return enrolmentId; }
    public void setEnrolmentId(Long enrolmentId) { this.enrolmentId = enrolmentId; }
    public Long getFromTrainerId() { return fromTrainerId; }
    public void setFromTrainerId(Long fromTrainerId) { this.fromTrainerId = fromTrainerId; }
    public Long getToTrainerId() { return toTrainerId; }
    public void setToTrainerId(Long toTrainerId) { this.toTrainerId = toTrainerId; }
    public LocalDate getEffectiveDate() { return effectiveDate; }
    public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }
    public String getChangedBy() { return changedBy; }
    public void setChangedBy(String changedBy) { this.changedBy = changedBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
