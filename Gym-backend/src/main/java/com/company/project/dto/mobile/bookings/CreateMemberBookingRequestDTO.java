package com.company.project.dto.mobile.bookings;

import com.fasterxml.jackson.annotation.JsonAlias;

public class CreateMemberBookingRequestDTO {
    
    @JsonAlias({"classId", "class_id"})
    private Long classId;

    public CreateMemberBookingRequestDTO() {}

    public Long getClassId() { return classId; }
    public void setClassId(Long classId) { this.classId = classId; }
}
