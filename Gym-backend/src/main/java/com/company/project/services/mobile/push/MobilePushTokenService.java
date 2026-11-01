package com.company.project.services.mobile.push;

import com.company.project.dto.mobile.push.MobilePushTokenRequestDTO;
import com.company.project.entities.Member;
import com.company.project.entities.MobilePushToken;
import com.company.project.entities.Staff;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.mobile.push.MobilePushTokenRepository;
import com.company.project.security.UserDetailsImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/** Registers/unregisters the authenticated member's or staff member's device for push notifications. */
@Service
@Transactional
public class MobilePushTokenService {

    private final MemberRepository memberRepository;
    private final MobilePushTokenRepository pushTokenRepository;
    private final StaffRepository staffRepository;

    public MobilePushTokenService(MemberRepository memberRepository, MobilePushTokenRepository pushTokenRepository,
                                  StaffRepository staffRepository) {
        this.memberRepository = memberRepository;
        this.pushTokenRepository = pushTokenRepository;
        this.staffRepository = staffRepository;
    }

    public void register(UserDetailsImpl principal, MobilePushTokenRequestDTO request) {
        Member member = getAuthenticatedMember(principal)
                .orElseThrow(() -> new EntityNotFoundException("Member not found"));

        // A device token belongs to whoever signed in on that device most recently.
        MobilePushToken token = pushTokenRepository.findByExpoPushToken(request.getExpoPushToken())
                .orElseGet(MobilePushToken::new);
        token.setExpoPushToken(request.getExpoPushToken());
        token.setMemberId(member.getId());
        token.setStaffId(null);
        token.setPlatform(request.getPlatform());
        token.setUpdatedAt(LocalDateTime.now());
        pushTokenRepository.save(token);
    }

    public void unregister(UserDetailsImpl principal, String expoPushToken) {
        getAuthenticatedMember(principal).ifPresent(member ->
                pushTokenRepository.deleteByMemberIdAndExpoPushToken(member.getId(), expoPushToken));
    }

    /** Staff and trainer app devices, for chat messages from members. */
    public void registerStaff(UserDetailsImpl principal, MobilePushTokenRequestDTO request) {
        Staff staff = getAuthenticatedStaff(principal);
        MobilePushToken token = pushTokenRepository.findByExpoPushToken(request.getExpoPushToken())
                .orElseGet(MobilePushToken::new);
        token.setExpoPushToken(request.getExpoPushToken());
        token.setStaffId(staff.getId());
        token.setMemberId(null);
        token.setPlatform(request.getPlatform());
        token.setUpdatedAt(LocalDateTime.now());
        pushTokenRepository.save(token);
    }

    public void unregisterStaff(UserDetailsImpl principal, String expoPushToken) {
        pushTokenRepository.deleteByStaffIdAndExpoPushToken(getAuthenticatedStaff(principal).getId(), expoPushToken);
    }

    private Staff getAuthenticatedStaff(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }
        return staffRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new EntityNotFoundException("No staff record linked to this account"));
    }

    private Optional<Member> getAuthenticatedMember(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }
        Optional<Member> memberOpt = principal.isGlobal()
                ? memberRepository.findByGlobalUserId(principal.getId())
                : memberRepository.findByUserId(principal.getId());
        // Fallback for stale tokens with IS_GLOBAL_CLAIM=true but no globalUserId record
        if (memberOpt.isEmpty() && principal.isGlobal()) {
            memberOpt = memberRepository.findByUserId(principal.getId());
        }
        return memberOpt;
    }
}
