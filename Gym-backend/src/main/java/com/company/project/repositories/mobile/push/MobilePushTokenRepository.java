package com.company.project.repositories.mobile.push;

import com.company.project.entities.MobilePushToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MobilePushTokenRepository extends JpaRepository<MobilePushToken, Long> {

    Optional<MobilePushToken> findByExpoPushToken(String expoPushToken);

    List<MobilePushToken> findByMemberId(Long memberId);

    @Modifying
    long deleteByMemberIdAndExpoPushToken(Long memberId, String expoPushToken);

    @Modifying
    long deleteByExpoPushTokenIn(List<String> expoPushTokens);
}
