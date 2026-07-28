package com.company.project.services;

import com.company.project.dto.MemberAddonPageResponseDTO;
import com.company.project.dto.MemberAddonRequestDTO;
import com.company.project.dto.MemberAddonResponseDTO;
import com.company.project.dto.PaginationDTO;
import com.company.project.entities.MemberAddon;
import com.company.project.repositories.MemberAddonRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class MemberAddonService {

    private final MemberAddonRepository memberAddonRepository;
    private final ReceiptVoucherService receiptVoucherService;
    private final FinancialEventService financialEventService;

    public MemberAddonService(MemberAddonRepository memberAddonRepository,
                               ReceiptVoucherService receiptVoucherService,
                               FinancialEventService financialEventService) {
        this.memberAddonRepository = memberAddonRepository;
        this.receiptVoucherService = receiptVoucherService;
        this.financialEventService = financialEventService;
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public MemberAddonPageResponseDTO getAddons(String search, String status, int page, int limit) {
        Specification<MemberAddon> spec = buildSpec(search, status);
        Pageable pageable = PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<MemberAddon> addonPage = memberAddonRepository.findAll(spec, pageable);

        List<MemberAddonResponseDTO> dtos = addonPage.getContent().stream()
                .map(MemberAddonResponseDTO::fromEntity)
                .collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO(
                page, limit,
                addonPage.getTotalElements(),
                addonPage.getTotalPages()
        );

        return new MemberAddonPageResponseDTO(dtos, pagination);
    }

    @Transactional(readOnly = true)
    public MemberAddonResponseDTO getAddonById(Long id) {
        MemberAddon addon = memberAddonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("MemberAddon not found with id: " + id));
        return MemberAddonResponseDTO.fromEntity(addon);
    }

    // ── Write ───────────────────────────────────────────────────────────────

    public MemberAddonResponseDTO createAddon(MemberAddonRequestDTO request) {
        MemberAddon addon = new MemberAddon();
        applyRequest(request, addon);

        // Set purchase date to now if not provided via start date logic
        if (addon.getPurchaseDate() == null) {
            addon.setPurchaseDate(LocalDateTime.now());
        }

        // Default status to Active on creation
        if (addon.getStatus() == null) {
            addon.setStatus("Active");
        }

        // First save to get the auto-generated DB id
        MemberAddon saved = memberAddonRepository.save(addon);

        // Generate the business transaction ID: TXN-XXXXXXXXXX (zero-padded sequential)
        saved.setTransactionId("TXN-" + String.format("%010d", saved.getId()));
        saved = memberAddonRepository.save(saved);

        // Post to General Ledger
        financialEventService.onAddonPaymentReceived(saved);
        receiptVoucherService.createVoucherFromModule(
                "Add-on Purchase – " + (saved.getAddonName() != null ? saved.getAddonName() : "Add-on"),
                "Add-on",
                saved.getMemberName(),
                saved.getMemberDbId(),
                saved.getAmount(),
                saved.getPaymentMode(),
                saved.getTransactionId(),
                saved.getTransactionId(),
                saved.getNotes(),
                saved.getPaymentBreakdown()
        );

        return MemberAddonResponseDTO.fromEntity(saved);
    }

    public MemberAddonResponseDTO updateAddonStatus(Long id, String status) {
        MemberAddon addon = memberAddonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("MemberAddon not found with id: " + id));
        addon.setStatus(status);
        return MemberAddonResponseDTO.fromEntity(memberAddonRepository.save(addon));
    }

    public void deleteAddon(Long id) {
        if (!memberAddonRepository.existsById(id)) {
            throw new RuntimeException("MemberAddon not found with id: " + id);
        }
        memberAddonRepository.deleteById(id);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private void applyRequest(MemberAddonRequestDTO r, MemberAddon a) {
        if (r.getMemberDbId()       != null) a.setMemberDbId(r.getMemberDbId());
        if (r.getMemberId()         != null) a.setMemberId(r.getMemberId());
        if (r.getMemberName()       != null) a.setMemberName(r.getMemberName());
        if (r.getAddonName()        != null) a.setAddonName(r.getAddonName());
        if (r.getAddonDescription() != null) a.setAddonDescription(r.getAddonDescription());
        if (r.getCategory()         != null) a.setCategory(r.getCategory());
        if (r.getAmount()           != null) a.setAmount(r.getAmount());
        if (r.getPaymentMode()      != null) a.setPaymentMode(r.getPaymentMode());
        if (r.getStartDate()        != null) a.setStartDate(parseDateTime(r.getStartDate()));
        if (r.getExpiryDate()       != null) a.setExpiryDate(parseDateTime(r.getExpiryDate()));
        if (r.getNotes()            != null) a.setNotes(r.getNotes());
        if (r.getPaymentBreakdown() != null) a.setPaymentBreakdown(r.getPaymentBreakdown());
    }

    private Specification<MemberAddon> buildSpec(String search, String status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("transactionId")), pattern),
                        cb.like(cb.lower(root.get("memberId")), pattern),
                        cb.like(cb.lower(root.get("memberName")), pattern),
                        cb.like(cb.lower(root.get("addonName")), pattern)
                ));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private LocalDateTime parseDateTime(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            String normalized = raw.endsWith("Z") ? raw.substring(0, raw.length() - 1) : raw;
            return LocalDateTime.parse(normalized, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (DateTimeParseException e) {
            try {
                return LocalDate.parse(raw.substring(0, 10)).atStartOfDay();
            } catch (DateTimeParseException ignored) {
                return null;
            }
        }
    }
}
