package com.company.project.dto.mobile.schedule;

import java.util.List;

public class MobileAvailabilityDTO {
    private List<MobileScheduleSlotDTO> slots;

    public List<MobileScheduleSlotDTO> getSlots() { return slots; }
    public void setSlots(List<MobileScheduleSlotDTO> slots) { this.slots = slots; }
}
