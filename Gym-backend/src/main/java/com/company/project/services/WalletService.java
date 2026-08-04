package com.company.project.services;

import com.company.project.dto.WalletResponseDTO;
import com.company.project.entities.Member;
import com.company.project.entities.WalletTransaction;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.WalletTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.stream.Collectors;

/**
 * Reward wallet balance + spend. Wallet *credits* happen only through
 * RewardRedemptionService (a reward being redeemed); this service handles the
 * *debit* side — a member spending their balance during checkout. The ledger
 * entry for a debit is posted by the receipt itself (its "Wallet" payment leg
 * now maps to the Reward Wallet Liability account — see FinancialEventService),
 * so this service only maintains the balance/history, never the ledger.
 */
@Service
@Transactional
public class WalletService {

    private final MemberRepository memberRepository;
    private final WalletTransactionRepository walletTransactionRepository;

    public WalletService(MemberRepository memberRepository, WalletTransactionRepository walletTransactionRepository) {
        this.memberRepository = memberRepository;
        this.walletTransactionRepository = walletTransactionRepository;
    }

    @Transactional(readOnly = true)
    public WalletResponseDTO getWallet(String memberId) {
        Member member = memberRepository.findByMemberId(memberId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found: " + memberId));

        WalletResponseDTO dto = new WalletResponseDTO();
        dto.setMemberId(memberId);
        dto.setBalance(member.getWalletBalance() != null ? member.getWalletBalance() : BigDecimal.ZERO);
        dto.setTransactions(walletTransactionRepository.findByMemberIdOrderByCreatedAtDesc(memberId).stream()
                .map(WalletResponseDTO.Entry::fromEntity)
                .collect(Collectors.toList()));
        return dto;
    }

    public WalletResponseDTO debit(String memberId, BigDecimal amount, String sourceType, Long sourceId, String remarks) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Debit amount must be positive");
        }
        Member member = memberRepository.findByMemberId(memberId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found: " + memberId));

        BigDecimal current = member.getWalletBalance() != null ? member.getWalletBalance() : BigDecimal.ZERO;
        if (current.compareTo(amount) < 0) {
            throw new BusinessRuleViolationException("Insufficient wallet balance");
        }

        BigDecimal newBalance = current.subtract(amount);
        member.setWalletBalance(newBalance);
        memberRepository.save(member);

        WalletTransaction tx = new WalletTransaction();
        tx.setMemberId(memberId);
        tx.setType("DEBIT");
        tx.setAmount(amount);
        tx.setBalanceAfter(newBalance);
        tx.setSourceType(sourceType);
        tx.setSourceId(sourceId);
        tx.setRemarks(remarks);
        walletTransactionRepository.save(tx);

        return getWallet(memberId);
    }
}
