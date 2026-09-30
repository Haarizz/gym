package com.company.project.dto.mobile.bookings;

import com.fasterxml.jackson.annotation.JsonAlias;

public class CreateMemberBookingRequestDTO {
    
    @JsonAlias({"classId", "class_id"})
    private Long classId;

    // Optional Free PT / Class Reward Pass to pay for the booking.
    @JsonAlias({"rewardPassId", "reward_pass_id"})
    private Long rewardPassId;

    public CreateMemberBookingRequestDTO() {}

    public Long getClassId() { return classId; }
    public void setClassId(Long classId) { this.classId = classId; }

    public Long getRewardPassId() { return rewardPassId; }
    public void setRewardPassId(Long rewardPassId) { this.rewardPassId = rewardPassId; }
}
