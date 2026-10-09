package com.company.project.controllers.mobile.wallet;

import com.company.project.dto.WalletResponseDTO;
import com.company.project.entities.Member;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MemberRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.WalletService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * The signed-in member's own wallet — balance and history (refunds, rewards, spends).
 * Shown on the profile and offered at booking checkout.
 */
@RestController
@RequestMapping("/api/mobile/member/wallet")
public class MobileMemberWalletController {

    private final WalletService walletService;
    private final MemberRepository memberRepository;

    public MobileMemberWalletController(WalletService walletService, MemberRepository memberRepository) {
        this.walletService = walletService;
        this.memberRepository = memberRepository;
    }

    /** GET /api/mobile/member/wallet — an empty wallet if the user has no membership in this gym. */
    @GetMapping
    public ResponseEntity<WalletResponseDTO> getMyWallet(@AuthenticationPrincipal UserDetailsImpl principal) {
        Optional<Member> member = findMember(principal);
        if (member.isEmpty() || member.get().getMemberId() == null) {
            WalletResponseDTO empty = new WalletResponseDTO();
            empty.setBalance(BigDecimal.ZERO);
            empty.setTransactions(List.of());
            return ResponseEntity.ok(empty);
        }
        return ResponseEntity.ok(walletService.getWallet(member.get().getMemberId()));
    }

    private Optional<Member> findMember(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }
        Optional<Member> member = principal.isGlobal()
                ? memberRepository.findByGlobalUserId(principal.getId())
                : memberRepository.findByUserId(principal.getId());
        // Fallback for stale tokens with IS_GLOBAL_CLAIM=true but no globalUserId record
        if (member.isEmpty() && principal.isGlobal()) {
            member = memberRepository.findByUserId(principal.getId());
        }
        return member;
    }
}
