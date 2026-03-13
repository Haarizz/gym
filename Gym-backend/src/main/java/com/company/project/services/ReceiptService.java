package com.company.project.services;

import com.company.project.dto.PaginationDTO;
import com.company.project.dto.ReceiptResponseDTO;
import com.company.project.dto.ReceiptsPageResponseDTO;
import com.company.project.entities.Member;
import com.company.project.entities.Receipt;
import com.company.project.repositories.ReceiptRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ReceiptService {

    private final ReceiptRepository receiptRepository;

    public ReceiptService(ReceiptRepository receiptRepository) {
        this.receiptRepository = receiptRepository;
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ReceiptsPageResponseDTO getReceipts(String search, String transactionType,
                                               String status, int page, int limit) {
        Specification<Receipt> spec = buildSpec(search, transactionType, status);
        Pageable pageable = PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Receipt> receiptPage = receiptRepository.findAll(spec, pageable);

        List<ReceiptResponseDTO> dtos = receiptPage.getContent().stream()
                .map(ReceiptResponseDTO::fromEntity)
                .collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO(
                page, limit,
                receiptPage.getTotalElements(),
                receiptPage.getTotalPages()
        );

        return new ReceiptsPageResponseDTO(dtos, pagination);
    }

    @Transactional(readOnly = true)
    public ReceiptResponseDTO getReceiptById(Long id) {
        Receipt receipt = receiptRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Receipt not found with id: " + id));
        return ReceiptResponseDTO.fromEntity(receipt);
    }

    // ── Write ───────────────────────────────────────────────────────────────

    public ReceiptResponseDTO createReceipt(Receipt receipt) {
        // First save to get the auto-generated DB id
        Receipt saved = receiptRepository.save(receipt);

        // Generate the business receipt number: RCPT-XXXXXXXXXX (zero-padded sequential)
        saved.setReceiptNo("RCPT-" + String.format("%010d", saved.getId()));
        saved = receiptRepository.save(saved);

        return ReceiptResponseDTO.fromEntity(saved);
    }

    /**
     * Called from MemberService after creating or renewing a member.
     * Returns the saved Receipt entity (not DTO) so the caller can inspect it if needed.
     */
    public Receipt createReceiptForMember(Member member, String transactionType, String paymentStatus) {
        Receipt r = new Receipt();
        r.setTransactionDate(LocalDateTime.now());
        r.setMemberDbId(member.getId());
        r.setMemberId(member.getMemberId());
        r.setMemberName(member.getName());
        r.setMemberPhone(member.getPhone());
        r.setTransactionType(transactionType);
        r.setAmount(member.getMembershipFee() != null ? member.getMembershipFee() : BigDecimal.ZERO);
        r.setPaymentMethod("Cash"); // default
        r.setStatus("paid".equalsIgnoreCase(paymentStatus) ? "Paid" : "Pending");
        r.setPlanName(member.getMembershipPlan());
        r.setValidFrom(member.getMembershipStartDate());
        r.setValidTill(member.getMembershipEndDate());
        r.setProcessedBy("Admin");

        Receipt saved = receiptRepository.save(r);
        saved.setReceiptNo("RCPT-" + String.format("%010d", saved.getId()));
        return receiptRepository.save(saved);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private Specification<Receipt> buildSpec(String search, String transactionType, String status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("receiptNo")), pattern),
                        cb.like(cb.lower(root.get("memberId")), pattern),
                        cb.like(cb.lower(root.get("memberName")), pattern),
                        cb.like(cb.lower(root.get("memberPhone")), pattern)
                ));
            }
            if (transactionType != null && !transactionType.isBlank()) {
                predicates.add(cb.equal(root.get("transactionType"), transactionType));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
