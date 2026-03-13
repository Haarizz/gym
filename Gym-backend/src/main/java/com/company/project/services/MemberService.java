package com.company.project.services;

import com.company.project.dto.FreezeRequestDTO;
import com.company.project.dto.MemberRequestDTO;
import com.company.project.dto.MemberResponseDTO;
import com.company.project.dto.MembersPageResponseDTO;
import com.company.project.dto.PaginationDTO;
import com.company.project.dto.RenewalRequestDTO;
import com.company.project.entities.Member;
import com.company.project.repositories.MemberRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.context.annotation.Lazy;
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
public class MemberService {

    private final MemberRepository memberRepository;
    private final ReceiptService receiptService;

    public MemberService(MemberRepository memberRepository,
                         @Lazy ReceiptService receiptService) {
        this.memberRepository = memberRepository;
        this.receiptService   = receiptService;
    }

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public MembersPageResponseDTO getMembers(String search, String status,
                                             String membershipType, String paymentStatus,
                                             int page, int limit) {
        Specification<Member> spec = buildSpec(search, status, membershipType, paymentStatus);
        Pageable pageable = PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Member> memberPage = memberRepository.findAll(spec, pageable);

        List<MemberResponseDTO> dtos = memberPage.getContent().stream()
                .map(MemberResponseDTO::fromEntity)
                .collect(Collectors.toList());

        PaginationDTO pagination = new PaginationDTO(
                page, limit,
                memberPage.getTotalElements(),
                memberPage.getTotalPages()
        );

        return new MembersPageResponseDTO(dtos, pagination);
    }

    @Transactional(readOnly = true)
    public MemberResponseDTO getMemberById(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found with id: " + id));
        return MemberResponseDTO.fromEntity(member);
    }

    // ── Write ───────────────────────────────────────────────────────────────

    public MemberResponseDTO createMember(MemberRequestDTO request) {
        Member member = new Member();
        applyRequest(request, member);
        if (member.getTotalVisits() == null) member.setTotalVisits(0);

        // First save to get the auto-generated DB id
        Member saved = memberRepository.save(member);

        // Generate the business member ID: MBR-XXXXXXXXXX (zero-padded sequential)
        saved.setMemberId("MBR-" + String.format("%010d", saved.getId()));
        saved = memberRepository.save(saved);

        // Auto-create a receipt for the new member
        receiptService.createReceiptForMember(saved, "New", saved.getPaymentStatus());

        return MemberResponseDTO.fromEntity(saved);
    }

    public MemberResponseDTO updateMember(Long id, MemberRequestDTO request) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found with id: " + id));
        applyRequest(request, member);
        return MemberResponseDTO.fromEntity(memberRepository.save(member));
    }

    public void deleteMember(Long id) {
        if (!memberRepository.existsById(id)) {
            throw new RuntimeException("Member not found with id: " + id);
        }
        memberRepository.deleteById(id);
    }

    public MemberResponseDTO renewMember(Long id, RenewalRequestDTO request) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found with id: " + id));
        if (request.getPlanName()        != null) member.setMembershipPlan(request.getPlanName());
        if (request.getMembershipFee()   != null) member.setMembershipFee(request.getMembershipFee());
        if (request.getPaymentStatus()   != null) member.setPaymentStatus(request.getPaymentStatus());
        if (request.getMembershipType()  != null) member.setMembershipType(request.getMembershipType());
        if (request.getMembershipStatus() != null) member.setMembershipStatus(request.getMembershipStatus());
        if (request.getMembershipEndDate() != null) {
            LocalDateTime endDate = parseDateTime(request.getMembershipEndDate());
            member.setMembershipEndDate(endDate);
            member.setExpiryDate(endDate);
        }
        Member saved = memberRepository.save(member);

        // Auto-create a receipt for the renewal
        receiptService.createReceiptForMember(saved, "Renewal", "Paid");

        return MemberResponseDTO.fromEntity(saved);
    }

    public MemberResponseDTO freezeMember(Long id, FreezeRequestDTO request) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found with id: " + id));
        LocalDateTime freezeUntil = parseDateTime(request.getFreezeUntil());
        member.setMembershipStatus("frozen");
        member.setFreezeStartDate(LocalDateTime.now());
        member.setFreezeEndDate(freezeUntil);
        if (request.getReason() != null) member.setFreezeReason(request.getReason());
        return MemberResponseDTO.fromEntity(memberRepository.save(member));
    }

    public MemberResponseDTO unfreezeMember(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found with id: " + id));
        member.setMembershipStatus("active");
        member.setFreezeStartDate(null);
        member.setFreezeEndDate(null);
        member.setFreezeReason(null);
        return MemberResponseDTO.fromEntity(memberRepository.save(member));
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Apply non-null fields from the request DTO onto the entity.
     * Null fields are skipped so partial updates (PUT) work correctly.
     */
    private void applyRequest(MemberRequestDTO r, Member m) {
        if (r.getName()                != null) m.setName(r.getName());
        if (r.getEmail()               != null) m.setEmail(r.getEmail());
        if (r.getPhone()               != null) m.setPhone(r.getPhone());
        if (r.getMembershipType()      != null) m.setMembershipType(r.getMembershipType());
        if (r.getMembershipStatus()    != null) m.setMembershipStatus(r.getMembershipStatus());
        if (r.getMembershipPlan()      != null) m.setMembershipPlan(r.getMembershipPlan());
        if (r.getJoinDate()            != null) m.setJoinDate(parseDateTime(r.getJoinDate()));
        if (r.getMembershipStartDate() != null) m.setMembershipStartDate(parseDateTime(r.getMembershipStartDate()));
        if (r.getMembershipEndDate()   != null) m.setMembershipEndDate(parseDateTime(r.getMembershipEndDate()));
        if (r.getExpiryDate()          != null) m.setExpiryDate(parseDateTime(r.getExpiryDate()));
        if (r.getMonthlyFee()          != null) m.setMonthlyFee(r.getMonthlyFee());
        if (r.getMembershipFee()       != null) m.setMembershipFee(r.getMembershipFee());
        if (r.getTotalVisits()         != null) m.setTotalVisits(r.getTotalVisits());
        if (r.getPaymentStatus()       != null) m.setPaymentStatus(r.getPaymentStatus());
        if (r.getEmergencyContact()    != null) m.setEmergencyContact(r.getEmergencyContact());
        if (r.getEmergencyPhone()      != null) m.setEmergencyPhone(r.getEmergencyPhone());
        if (r.getEmergencyContactName()!= null) m.setEmergencyContactName(r.getEmergencyContactName());
        if (r.getEmergencyContactPhone()!= null) m.setEmergencyContactPhone(r.getEmergencyContactPhone());
        if (r.getDateOfBirth()         != null) m.setDateOfBirth(parseDate(r.getDateOfBirth()));
        if (r.getBloodType()           != null) m.setBloodType(r.getBloodType());
        if (r.getMedicalConditions()   != null) m.setMedicalConditions(r.getMedicalConditions());
        if (r.getAllergies()           != null) m.setAllergies(r.getAllergies());
        if (r.getCurrentMedications()  != null) m.setCurrentMedications(r.getCurrentMedications());
        if (r.getHealthNotes()         != null) m.setHealthNotes(r.getHealthNotes());
    }

    /**
     * Build a JPA Specification from optional filter parameters.
     * Only non-blank filters are added as predicates.
     */
    private Specification<Member> buildSpec(String search, String status,
                                            String membershipType, String paymentStatus) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("email")), pattern),
                        cb.like(cb.lower(root.get("phone")), pattern),
                        cb.like(cb.lower(root.get("memberId")), pattern)
                ));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("membershipStatus"), status));
            }
            if (membershipType != null && !membershipType.isBlank()) {
                predicates.add(cb.equal(root.get("membershipType"), membershipType));
            }
            if (paymentStatus != null && !paymentStatus.isBlank()) {
                predicates.add(cb.equal(root.get("paymentStatus"), paymentStatus));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    // ── Date parsers ────────────────────────────────────────────────────────

    private LocalDateTime parseDateTime(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            // Remove trailing Z and parse as local date-time
            String normalized = raw.endsWith("Z") ? raw.substring(0, raw.length() - 1) : raw;
            return LocalDateTime.parse(normalized, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (DateTimeParseException e) {
            // Try date-only format "YYYY-MM-DD"
            try {
                return LocalDate.parse(raw.substring(0, 10)).atStartOfDay();
            } catch (DateTimeParseException ignored) {
                return null;
            }
        }
    }

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return LocalDate.parse(raw.substring(0, 10));
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }
}
