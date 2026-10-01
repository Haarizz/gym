package com.company.project.dto.mobile.profile;

/** Staff-editable subset of the employee record (see StaffService.updateMyContact). */
public class MobileStaffContactUpdateDTO {
    private String phone;
    private String address;

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
}
