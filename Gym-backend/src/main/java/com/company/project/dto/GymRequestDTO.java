package com.company.project.dto;

public class GymRequestDTO {
    private String name;
    private String slug;
    private String address;
    private String phone;
    private String email;
    private String contactPerson;
    private Double lat;
    private Double lng;
    private String status;

    // Required on create (Phase 3: POST /api/gyms always provisions a full tenant
    // database with its owner login as part of the same job — there is no more
    // "create the gym now, issue a login later" path). Still optional on updateGym/
    // issueOrResetOwnerLogin call sites that reuse this DTO shape.
    private String ownerUsername;
    private String ownerPassword;
    private String ownerEmail;

    public GymRequestDTO() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }

    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getOwnerUsername() { return ownerUsername; }
    public void setOwnerUsername(String ownerUsername) { this.ownerUsername = ownerUsername; }

    public String getOwnerPassword() { return ownerPassword; }
    public void setOwnerPassword(String ownerPassword) { this.ownerPassword = ownerPassword; }

    public String getOwnerEmail() { return ownerEmail; }
    public void setOwnerEmail(String ownerEmail) { this.ownerEmail = ownerEmail; }
}
