package com.company.project.controlplane.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/** A scheduled call/email/meeting against a PlatformLead. See PlatformLead's javadoc. */
@Entity
@Table(name = "platform_lead_follow_ups")
public class PlatformLeadFollowUp extends ControlPlaneAuditableEntity {

    public static final String TYPE_CALL = "CALL";
    public static final String TYPE_EMAIL = "EMAIL";
    public static final String TYPE_MEETING = "MEETING";

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_COMPLETED = "COMPLETED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "platform_lead_id", nullable = false)
    private PlatformLead platformLead;

    @Column(nullable = false)
    private String type;

    @Column(name = "due_date", nullable = false)
    private LocalDateTime dueDate;

    private String notes;

    @Column(nullable = false)
    private String status = STATUS_PENDING;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public PlatformLead getPlatformLead() { return platformLead; }
    public void setPlatformLead(PlatformLead platformLead) { this.platformLead = platformLead; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public LocalDateTime getDueDate() { return dueDate; }
    public void setDueDate(LocalDateTime dueDate) { this.dueDate = dueDate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
