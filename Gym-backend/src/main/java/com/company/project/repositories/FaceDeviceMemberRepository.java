package com.company.project.repositories;

import com.company.project.entities.FaceDeviceMember;
import com.company.project.services.facedevice.FaceDeviceMemberRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface FaceDeviceMemberRepository extends JpaRepository<FaceDeviceMember, Long> {

    List<FaceDeviceMember> findByDeviceId(Long deviceId);

    Optional<FaceDeviceMember> findByDeviceIdAndMemberId(Long deviceId, Long memberId);

    /** Just the member fields a face device needs, for every member of a branch. */
    @Query("select new com.company.project.services.facedevice.FaceDeviceMemberRow("
            + "m.id, m.memberId, m.name, m.membershipStatus, m.membershipSuspended, "
            + "m.membershipStartDate, m.membershipEndDate, m.expiryDate, m.joinDate, m.photoUrl, m.branchId) "
            + "from Member m where m.branchId = :branchId")
    List<FaceDeviceMemberRow> findMemberRows(@Param("branchId") Long branchId);

    @Query("select new com.company.project.services.facedevice.FaceDeviceMemberRow("
            + "m.id, m.memberId, m.name, m.membershipStatus, m.membershipSuspended, "
            + "m.membershipStartDate, m.membershipEndDate, m.expiryDate, m.joinDate, m.photoUrl, m.branchId) "
            + "from Member m where m.id = :memberId")
    Optional<FaceDeviceMemberRow> findMemberRow(@Param("memberId") Long memberId);

    /** Forces the next run to push these members again. */
    @Transactional
    @Modifying
    @Query("update FaceDeviceMember f set f.fingerprint = null where f.deviceId = :deviceId")
    int clearFingerprints(@Param("deviceId") Long deviceId);

    @Transactional
    @Modifying
    @Query("update FaceDeviceMember f set f.fingerprint = null where f.deviceId = :deviceId and f.state = :state")
    int clearFingerprintsInState(@Param("deviceId") Long deviceId, @Param("state") String state);
}
