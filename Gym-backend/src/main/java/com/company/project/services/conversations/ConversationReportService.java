package com.company.project.services.conversations;

import com.company.project.dto.conversations.ConversationMessageDTO;
import com.company.project.dto.conversations.ConversationReportDTO;
import com.company.project.dto.conversations.ResolveReportRequestDTO;
import com.company.project.entities.*;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The gym admins' side of chat: reports, and nothing else. Admins can't browse
 * conversations; a report opens the whole conversation up to the moment it was filed,
 * deleted messages and unmasked text included. Resolving it can close that conversation
 * for good or ban the member from chat at the branch.
 */
@Service
@Transactional(readOnly = true)
public class ConversationReportService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_NOTE_LENGTH = 500;

    private final ConversationReportRepository reportRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMessageRepository messageRepository;
    private final MemberRepository memberRepository;
    private final StaffRepository staffRepository;
    private final BranchRepository branchRepository;

    public ConversationReportService(
            ConversationReportRepository reportRepository,
            ConversationRepository conversationRepository,
            ConversationMessageRepository messageRepository,
            MemberRepository memberRepository,
            StaffRepository staffRepository,
            BranchRepository branchRepository) {
        this.reportRepository = reportRepository;
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.memberRepository = memberRepository;
        this.staffRepository = staffRepository;
        this.branchRepository = branchRepository;
    }

    public record PageResult(List<ConversationReportDTO> items, long total, int page, int size,
                             Map<String, Long> statusCounts) {}

    /** The list shows the reported message only; the transcript is on the detail view. */
    public PageResult list(String status, int page, int size) {
        String s = status == null || status.isBlank() ? null : status.trim().toUpperCase(Locale.ROOT);
        int safeSize = Math.max(1, Math.min(size, MAX_PAGE_SIZE));
        Page<ConversationReport> result = reportRepository.search(s, PageRequest.of(Math.max(0, page), safeSize));
        List<ConversationReportDTO> items = result.getContent().stream().map(r -> toDto(r, false)).toList();

        Map<String, Long> counts = new LinkedHashMap<>();
        for (String st : List.of(ConversationReport.OPEN, ConversationReport.ACTIONED, ConversationReport.DISMISSED)) {
            counts.put(st, reportRepository.countByStatus(st));
        }
        return new PageResult(items, result.getTotalElements(), result.getNumber(), safeSize, counts);
    }

    public ConversationReportDTO get(Long id) {
        return toDto(require(id), true);
    }

    @Transactional
    public ConversationReportDTO resolve(Long id, ResolveReportRequestDTO request, String resolvedBy) {
        ConversationReport r = require(id);
        if (!ConversationReport.OPEN.equals(r.getStatus())) {
            throw new BusinessRuleViolationException("This report has already been resolved.");
        }
        String action = request.action() == null ? "" : request.action().trim().toUpperCase(Locale.ROOT);
        if (!ConversationReport.RESOLUTIONS.contains(action)) throw new IllegalArgumentException("Unknown action");
        String note = request.note() == null ? null : request.note().trim();
        if (note != null && note.length() > MAX_NOTE_LENGTH) {
            throw new IllegalArgumentException("Note must be at most " + MAX_NOTE_LENGTH + " characters");
        }
        LocalDateTime now = LocalDateTime.now();

        Conversation c = conversation(r);
        if (ConversationReport.BLOCK_CONVERSATION.equals(action) && c.getBlockedByAdminAt() == null) {
            c.setBlockedByAdminAt(now);
            c.setBlockedByAdmin(resolvedBy);
            conversationRepository.save(c);
        }
        if (ConversationReport.BAN_MEMBER.equals(action)) {
            memberRepository.updateChatBan(c.getMemberId(), now, resolvedBy);
        }

        r.setStatus(ConversationReport.DISMISS.equals(action) ? ConversationReport.DISMISSED : ConversationReport.ACTIONED);
        r.setResolution(action);
        r.setResolutionNote(note == null || note.isEmpty() ? null : note);
        r.setResolvedBy(resolvedBy);
        r.setResolvedAt(now);
        reportRepository.saveAndFlush(r);
        return toDto(require(id), true);
    }

    /** Lifting a chat ban is its own step: it isn't tied to any one report. */
    @Transactional
    public void liftMemberBan(Long memberId) {
        memberRepository.findById(memberId).orElseThrow(() -> new EntityNotFoundException("Member not found"));
        memberRepository.updateChatBan(memberId, null, null);
    }

    private ConversationReport require(Long id) {
        return reportRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Report not found"));
    }

    private Conversation conversation(ConversationReport r) {
        return conversationRepository.findById(r.getConversationId())
                .orElseThrow(() -> new EntityNotFoundException("Conversation not found"));
    }

    private ConversationReportDTO toDto(ConversationReport r, boolean withTranscript) {
        Conversation c = conversation(r);
        Member member = memberRepository.findById(c.getMemberId()).orElse(null);
        Staff staff = c.isFrontDesk() ? null : staffRepository.findById(c.getStaffId()).orElse(null);

        List<ConversationMessage> messages = withTranscript
                ? messageRepository.findByConversationIdAndCreatedAtLessThanEqualOrderByIdAsc(c.getId(), r.getCreatedAt())
                : messageRepository.findById(r.getMessageId()).map(List::of).orElse(List.of());
        Map<Long, Staff> senders = staffRepository.findAllById(messages.stream()
                        .map(ConversationMessage::getSenderStaffId).filter(Objects::nonNull).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(Staff::getId, Function.identity()));
        // viewerType null: an admin is neither side, so nothing is "mine".
        List<ConversationMessageDTO> transcript = messages.stream()
                .map(m -> ConversationService.toMessage(m, null, null, member, senders, true))
                .toList();
        ConversationMessageDTO reported = transcript.stream()
                .filter(m -> m.id().equals(r.getMessageId())).findFirst().orElse(null);

        String reporterName = Conversation.MEMBER.equals(r.getReportedByType())
                ? (member != null ? member.getName() : null)
                : staffRepository.findById(r.getReportedById()).map(Staff::getName).orElse(null);

        return new ConversationReportDTO(r.getId(), r.getBranchId(),
                branchRepository.findById(r.getBranchId()).map(Branch::getBranchName).orElse(null),
                c.getId(),
                c.getMemberId(),
                member != null ? member.getName() : null,
                member != null ? member.getMemberId() : null,
                c.isFrontDesk() ? "Front desk" : staff != null ? staff.getName() : null,
                r.getReportedByType(), reporterName, r.getReason(), r.getDetails(), r.getStatus(),
                r.getResolution(), r.getResolutionNote(), r.getResolvedBy(), r.getResolvedAt(), r.getCreatedAt(),
                reported,
                c.getBlockedByAdminAt() != null,
                member != null && member.getChatBannedAt() != null,
                withTranscript ? transcript : null);
    }
}
