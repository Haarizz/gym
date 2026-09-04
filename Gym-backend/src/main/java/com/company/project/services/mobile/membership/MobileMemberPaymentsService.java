package com.company.project.services.mobile.membership;

import com.company.project.dto.mobile.membership.MobilePaymentHistoryDTO;
import com.company.project.entities.Member;
import com.company.project.entities.Receipt;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.security.UserDetailsImpl;
import org.springframework.stereotype.Service;

import com.company.project.exceptions.EntityNotFoundException;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class MobileMemberPaymentsService {

    private final ReceiptRepository receiptRepository;
    private final MemberRepository memberRepository;

    public MobileMemberPaymentsService(ReceiptRepository receiptRepository, MemberRepository memberRepository) {
        this.receiptRepository = receiptRepository;
        this.memberRepository = memberRepository;
    }

    private java.util.Optional<Member> getAuthenticatedMember(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }
        return memberRepository.findByUserId(principal.getId());
    }

    public List<MobilePaymentHistoryDTO> getPaymentHistory(UserDetailsImpl principal) {
        java.util.Optional<Member> memberOpt = getAuthenticatedMember(principal);
        if (memberOpt.isEmpty()) return java.util.Collections.emptyList();
        
        Member member = memberOpt.get();

        List<Receipt> receipts = receiptRepository.findByMemberDbIdOrderByTransactionDateAsc(member.getId());

        return receipts.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private MobilePaymentHistoryDTO mapToDTO(Receipt receipt) {
        MobilePaymentHistoryDTO dto = new MobilePaymentHistoryDTO();
        dto.setId(receipt.getId());
        dto.setReceiptNo(receipt.getReceiptNo());
        dto.setTransactionDate(receipt.getTransactionDate());
        dto.setTransactionType(receipt.getTransactionType());
        dto.setAmount(receipt.getAmount());
        dto.setPaidAmount(receipt.getPaidAmount());
        dto.setPaymentMethod(receipt.getPaymentMethod());
        dto.setStatus(receipt.getStatus());
        return dto;
    }
}
