package com.company.project.dto;

/**
 * An add-on or facility access chosen at New Member Registration (MemberRequestDTO.addons).
 * Exactly one of {@code addonPlanId} / {@code facilityId} is set. The price is never taken
 * from the client: it comes from the add-on plan, or the facility's rate × {@code quantity}.
 */
public class RegistrationAddonDTO {
    private Long addonPlanId;
    private Long facilityId;
    /** Facility rate to sell, e.g. "Per Month" (FacilityRate.rateType). */
    private String rateType;
    /** Facility units (months / days / sessions), default 1. */
    private Integer quantity;

    public Long getAddonPlanId() { return addonPlanId; }
    public void setAddonPlanId(Long addonPlanId) { this.addonPlanId = addonPlanId; }
    public Long getFacilityId() { return facilityId; }
    public void setFacilityId(Long facilityId) { this.facilityId = facilityId; }
    public String getRateType() { return rateType; }
    public void setRateType(String rateType) { this.rateType = rateType; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
}
