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
import java.util.List;
import java.util.stream.Collectors;

/**
 * Reward wallet balance + spend. Wallet credits come from RewardRedemptionService
 * (a reward being redeemed) and from booking refunds (credit() below); debits are
 * a member spending their balance during checkout. The ledger
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

    /**
     * Puts money back on a member's wallet — e.g. a POS return of goods paid from the wallet,
     * or a cancelled booking refunded to the wallet. The ledger side is posted by the caller
     * (the POS refund's Wallet leg, or FinancialEventService.onBookingRefundedToWallet);
     * this keeps balance and history.
     */
    public WalletResponseDTO credit(String memberId, BigDecimal amount, String sourceType, Long sourceId, String remarks) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Credit amount must be positive");
        }
        Member member = memberRepository.findByMemberId(memberId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found: " + memberId));

        BigDecimal current = member.getWalletBalance() != null ? member.getWalletBalance() : BigDecimal.ZERO;
        BigDecimal newBalance = current.add(amount);
        member.setWalletBalance(newBalance);
        memberRepository.save(member);

        WalletTransaction tx = new WalletTransaction();
        tx.setMemberId(memberId);
        tx.setType("CREDIT");
        tx.setAmount(amount);
        tx.setBalanceAfter(newBalance);
        tx.setSourceType(sourceType);
        tx.setSourceId(sourceId);
        tx.setRemarks(remarks);
        walletTransactionRepository.save(tx);

        return getWallet(memberId);
    }

    // ── Customer credits (Billing › Member Receipts › Customer Credits) ──────

    /** A credit put on a member wallet, with what is still unspent. */
    public record CreditRow(long id, String creditNo, java.time.LocalDateTime date, String memberId, Long memberDbId,
                            String memberName, String memberPhone, String memberEmail, String creditType, String sourceType,
                            BigDecimal amount, BigDecimal used, BigDecimal balance, String status, String remarks, String processedBy) {}

    /**
     * Wallet credits as a ledger, newest first. A wallet is one pooled balance, so spending
     * is applied to the member's oldest credits first — each credit then shows what of it is
     * used and what is left, and the balances add up to the member's wallet. Credits never
     * expire. type / status filter on the labels shown ("Refund as credit", "Active"...).
     */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> credits(String search, String type, String status, int page, int size) {
        List<WalletTransaction> all = walletTransactionRepository.findAll(
                org.springframework.data.domain.Sort.by("createdAt").and(org.springframework.data.domain.Sort.by("id")));
        java.util.Map<Long, BigDecimal> remaining = new java.util.HashMap<>();
        java.util.List<WalletTransaction> credits = new java.util.ArrayList<>();
        java.util.Map<String, java.util.ArrayDeque<WalletTransaction>> open = new java.util.HashMap<>();
        for (WalletTransaction t : all) {
            BigDecimal amt = t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO;
            if ("CREDIT".equalsIgnoreCase(t.getType())) {
                credits.add(t);
                remaining.put(t.getId(), amt);
                open.computeIfAbsent(t.getMemberId(), k -> new java.util.ArrayDeque<>()).add(t);
            } else if ("DEBIT".equalsIgnoreCase(t.getType())) {
                java.util.ArrayDeque<WalletTransaction> queue = open.get(t.getMemberId());
                BigDecimal left = amt;
                while (queue != null && !queue.isEmpty() && left.signum() > 0) {
                    WalletTransaction oldest = queue.peek();
                    BigDecimal r = remaining.get(oldest.getId());
                    BigDecimal take = r.min(left);
                    remaining.put(oldest.getId(), r.subtract(take));
                    left = left.subtract(take);
                    if (remaining.get(oldest.getId()).signum() <= 0) queue.poll();
                }
            }
        }
        java.util.Map<String, Member> members = memberRepository.findByMemberIdIn(
                        credits.stream().map(WalletTransaction::getMemberId).filter(java.util.Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Member::getMemberId, m -> m, (a, b) -> a));

        String q = search == null ? "" : search.trim().toLowerCase(java.util.Locale.ROOT);
        java.util.List<CreditRow> rows = new java.util.ArrayList<>();
        for (int i = credits.size() - 1; i >= 0; i--) {
            WalletTransaction t = credits.get(i);
            Member m = members.get(t.getMemberId());
            BigDecimal amount = t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO;
            BigDecimal balance = remaining.getOrDefault(t.getId(), BigDecimal.ZERO).max(BigDecimal.ZERO);
            CreditRow row = new CreditRow(t.getId(), String.format("CR-%06d", t.getId()), t.getCreatedAt(), t.getMemberId(),
                    m != null ? m.getId() : null, m != null ? m.getName() : t.getMemberId(),
                    m != null ? m.getPhone() : null, m != null ? m.getEmail() : null,
                    creditTypeLabel(t.getSourceType()), t.getSourceType(), amount, amount.subtract(balance), balance,
                    balance.signum() > 0 ? "Active" : "Fully Used", t.getRemarks(), t.getCreatedBy());
            if (!q.isEmpty() && java.util.stream.Stream.of(row.creditNo(), row.memberId(), row.memberName(), row.memberPhone(), row.remarks())
                    .noneMatch(v -> v != null && v.toLowerCase(java.util.Locale.ROOT).contains(q))) continue;
            if (type != null && !type.isBlank() && !"all".equalsIgnoreCase(type) && !row.creditType().equalsIgnoreCase(type)) continue;
            if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status) && !row.status().equalsIgnoreCase(status)) continue;
            rows.add(row);
        }

        int safeSize = Math.min(Math.max(size, 1), 100);
        int from = Math.min((Math.max(page, 1) - 1) * safeSize, rows.size());
        java.util.Map<String, Object> summary = new java.util.LinkedHashMap<>();
        summary.put("total_credits", rows.size());
        summary.put("active", rows.stream().filter(r -> "Active".equals(r.status())).count());
        summary.put("fully_used", rows.stream().filter(r -> "Fully Used".equals(r.status())).count());
        summary.put("total_issued", rows.stream().map(CreditRow::amount).reduce(BigDecimal.ZERO, BigDecimal::add));
        summary.put("total_balance", rows.stream().map(CreditRow::balance).reduce(BigDecimal.ZERO, BigDecimal::add));
        summary.put("members_with_balance", rows.stream().filter(r -> r.balance().signum() > 0).map(CreditRow::memberId).distinct().count());

        java.util.Map<String, Object> out = new java.util.LinkedHashMap<>();
        out.put("credits", rows.subList(from, Math.min(from + safeSize, rows.size())));
        out.put("total", rows.size());
        out.put("page", Math.max(page, 1));
        out.put("size", safeSize);
        out.put("summary", summary);
        return out;
    }

    /** What a wallet credit came from, as Billing shows it. */
    static String creditTypeLabel(String sourceType) {
        if (sourceType == null) return "Manual credit";
        return switch (sourceType) {
            case "BOOKING_REFUND", "POS_RETURN" -> "Refund as credit";
            case "REFERRAL_REWARD" -> "Referral reward";
            default -> "Manual credit";
        };
    }
}
