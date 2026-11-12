package com.company.project.services.facedevice;

import com.company.project.entities.Member;
import com.company.project.services.MemberEffectiveStatus;

import java.time.LocalDateTime;

/** The member fields a face device needs (JPQL constructor projection). */
public record FaceDeviceMemberRow(
        Long id,
        String memberCode,
        String name,
        String membershipStatus,
        boolean membershipSuspended,
        LocalDateTime startDate,
        LocalDateTime endDate,
        LocalDateTime expiryDate,
        LocalDateTime joinDate,
        String photoUrl,
        Long branchId) {

    /** Today's status, by the same rule as everything shown to members (MemberEffectiveStatus). */
    public String effectiveStatus() {
        Member m = new Member();
        m.setMembershipStatus(membershipStatus);
        m.setMembershipSuspended(membershipSuspended);
        m.setMembershipEndDate(endDate);
        m.setExpiryDate(expiryDate);
        String s = MemberEffectiveStatus.of(m);
        return s == null ? "inactive" : s;
    }

    /** Only active members may walk in; expired, frozen, suspended and pending ones may not. */
    public boolean allowedIn() {
        return "active".equals(effectiveStatus());
    }

    /** Person serial on the device: the member code (kept from the old system on import). */
    public String personSn() {
        return memberCode != null && !memberCode.isBlank() ? memberCode.trim() : "M" + id;
    }

    public boolean hasPhoto() {
        return photoUrl != null && !photoUrl.isBlank();
    }

    public LocalDateTime validEnd() {
        return endDate != null ? endDate : expiryDate;
    }

    public LocalDateTime validStart() {
        return startDate != null ? startDate : joinDate;
    }
}
