package com.company.project.entities;

import jakarta.persistence.*;

/**
 * A device in a hardware profile, in one role (one device per role).
 */
@Entity
@Table(name = "pos_hardware_profile_devices")
public class PosHardwareProfileDevice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "profile_id", nullable = false)
    private Long profileId;

    @Column(name = "device_id", nullable = false)
    private Long deviceId;

    @Column(name = "role", length = 30, nullable = false)
    private String role;

    public PosHardwareProfileDevice() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProfileId() { return profileId; }
    public void setProfileId(Long profileId) { this.profileId = profileId; }

    public Long getDeviceId() { return deviceId; }
    public void setDeviceId(Long deviceId) { this.deviceId = deviceId; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
