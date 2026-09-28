package com.company.project.controllers.mobile.family;

import com.company.project.entities.Member;
import com.company.project.entities.MobileFamilyInvitation;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.mobile.family.MobileFamilyInvitationRepository;
import com.company.project.security.UserDetailsImpl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** The caller's family group in the X-Tenant-ID gym (tenant-routed like any member endpoint). */
@RestController
@RequestMapping("/api/mobile/family")
public class MobileFamilyViewController {

    private final MemberRepository memberRepository;
    private final MobileFamilyInvitationRepository invitationRepository;

    public MobileFamilyViewController(MemberRepository memberRepository,
                                      MobileFamilyInvitationRepository invitationRepository) {
        this.memberRepository = memberRepository;
        this.invitationRepository = invitationRepository;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getFamilyGroup(@AuthenticationPrincipal UserDetailsImpl user) {
        Member member = memberRepository.findByGlobalUserId(user.getId()).orElse(null);
        if (member == null) {
            return ResponseEntity.notFound().build();
        }
        boolean isHead = Boolean.TRUE.equals(member.getIsFamilyHead());
        String familyHeadId = isHead ? member.getMemberId() : member.getFamilyHeadId();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("isFamilyHead", isHead);
        if (familyHeadId == null) {
            response.put("members", List.of());
            return ResponseEntity.ok(response);
        }

        Map<String, MobileFamilyInvitation> invitationByMember = new HashMap<>();
        if (isHead) {
            for (String status : List.of("PENDING", "CLAIMED", "SKIPPED", "REVOKED", "EXPIRED")) {
                invitationRepository.findByPrimaryMemberIdAndStatus(familyHeadId, status)
                        .forEach(inv -> invitationByMember.put(inv.getDependentMemberId(), inv));
            }
        }

        List<Map<String, Object>> members = memberRepository.findByFamilyHeadId(familyHeadId).stream()
                .map(dep -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("memberId", dep.getMemberId());
                    row.put("name", dep.getName());
                    row.put("relationship", dep.getRelationshipToHead());
                    row.put("isMinor", Boolean.TRUE.equals(dep.getIsMinor()));
                    row.put("membershipStatus", dep.getMembershipStatus());
                    row.put("hasAppAccount", dep.getGlobalUserId() != null);
                    MobileFamilyInvitation inv = invitationByMember.get(dep.getMemberId());
                    if (inv != null) {
                        row.put("invitationId", inv.getId());
                        row.put("invitationStatus", inv.getStatus());
                        row.put("invitationEmail", inv.getRecipientEmail());
                    }
                    return row;
                })
                .toList();
        response.put("members", members);
        return ResponseEntity.ok(response);
    }
}
