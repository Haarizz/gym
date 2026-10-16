package com.company.project.services;

import com.company.project.dto.enquiries.MemberEnquiryDTO;
import com.company.project.entities.Branch;
import com.company.project.entities.Member;
import com.company.project.entities.MemberEnquiry;
import com.company.project.entities.MobilePushToken;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.MemberEnquiryRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.mobile.push.MobilePushTokenRepository;
import com.company.project.services.mobile.push.ExpoPushClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The web Enquiries page: members' enquiries for the active branch (every branch in
 * "All branches" mode, read-only there like every other page), one reply each, and
 * closing them. A reply reaches the member as an in-app notification and a push.
 */
@Service
@Transactional(readOnly = true)
public class MemberEnquiryService {

    private static final Logger log = LoggerFactory.getLogger(MemberEnquiryService.class);

    public static final int MAX_SUBJECT_LENGTH = 150;
    public static final int MAX_TEXT_LENGTH = 2000;
    private static final int MAX_PAGE_SIZE = 100;

    // Must match the mobile app's MEMBER_ENQUIRY_* constants.
    public static final String NOTIFICATION_MODULE = "MEMBER_ENQUIRY";
    public static final String PUSH_TYPE = "member_enquiry_replied";
    // The app maps this to Profile → Enquiries, opened on the enquiry (referenceId).
    private static final String ACTION_URL = "/enquiries";
    private static final String TITLE = "Your enquiry has a reply";

    private final MemberEnquiryRepository enquiryRepository;
    private final MemberRepository memberRepository;
    private final BranchRepository branchRepository;
    private final MobilePushTokenRepository pushTokenRepository;
    private final NotificationService notificationService;
    private final ExpoPushClient expoPushClient;
    private final TransactionTemplate isolatedTx;

    public MemberEnquiryService(
            MemberEnquiryRepository enquiryRepository,
            MemberRepository memberRepository,
            BranchRepository branchRepository,
            MobilePushTokenRepository pushTokenRepository,
            NotificationService notificationService,
            ExpoPushClient expoPushClient,
            PlatformTransactionManager transactionManager) {
        this.enquiryRepository = enquiryRepository;
        this.memberRepository = memberRepository;
        this.branchRepository = branchRepository;
        this.pushTokenRepository = pushTokenRepository;
        this.notificationService = notificationService;
        this.expoPushClient = expoPushClient;
        this.isolatedTx = new TransactionTemplate(transactionManager);
        this.isolatedTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public record PageResult(List<MemberEnquiryDTO> items, long total, int page, int size,
                             Map<String, Long> statusCounts) {}

    public PageResult list(String status, String category, int page, int size) {
        String s = blankToNull(status);
        String c = blankToNull(category);
        int safeSize = Math.max(1, Math.min(size, MAX_PAGE_SIZE));
        Page<MemberEnquiry> result = enquiryRepository.search(
                s == null ? null : s.toUpperCase(), c == null ? null : c.toUpperCase(),
                PageRequest.of(Math.max(0, page), safeSize));

        List<MemberEnquiry> rows = result.getContent();
        Map<Long, Member> members = memberRepository.findAllById(
                        rows.stream().map(MemberEnquiry::getMemberId).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(Member::getId, Function.identity()));
        Map<Long, String> branches = branchRepository.findAllById(
                        rows.stream().map(MemberEnquiry::getBranchId).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(Branch::getId, b -> Objects.toString(b.getBranchName(), "")));

        Map<String, Long> counts = new LinkedHashMap<>();
        for (String st : List.of(MemberEnquiry.OPEN, MemberEnquiry.REPLIED, MemberEnquiry.CLOSED)) {
            counts.put(st, enquiryRepository.countByStatus(st));
        }
        return new PageResult(rows.stream().map(e -> toDto(e, members.get(e.getMemberId()), branches.get(e.getBranchId()))).toList(),
                result.getTotalElements(), result.getNumber(), safeSize, counts);
    }

    /** The one reply an enquiry gets; it stays open to closing afterwards. */
    @Transactional
    public MemberEnquiryDTO reply(Long id, String replyText, String repliedBy) {
        MemberEnquiry enquiry = require(id);
        if (!MemberEnquiry.OPEN.equals(enquiry.getStatus())) {
            throw new BusinessRuleViolationException(MemberEnquiry.CLOSED.equals(enquiry.getStatus())
                    ? "This enquiry is closed." : "This enquiry has already been replied to.");
        }
        enquiry.setReply(requireText(replyText, "Reply", MAX_TEXT_LENGTH));
        enquiry.setRepliedBy(repliedBy);
        enquiry.setRepliedAt(LocalDateTime.now());
        enquiry.setStatus(MemberEnquiry.REPLIED);
        enquiry = enquiryRepository.saveAndFlush(enquiry);

        Member member = memberRepository.findById(enquiry.getMemberId()).orElse(null);
        if (member != null) notifyReplied(member, enquiry);
        return toDto(enquiry, member, branchName(enquiry.getBranchId()));
    }

    @Transactional
    public MemberEnquiryDTO close(Long id, String closedBy) {
        MemberEnquiry enquiry = require(id);
        if (MemberEnquiry.CLOSED.equals(enquiry.getStatus())) {
            throw new BusinessRuleViolationException("This enquiry is already closed.");
        }
        enquiry.setStatus(MemberEnquiry.CLOSED);
        enquiry.setClosedBy(closedBy);
        enquiry.setClosedAt(LocalDateTime.now());
        enquiry = enquiryRepository.saveAndFlush(enquiry);
        return toDto(enquiry, memberRepository.findById(enquiry.getMemberId()).orElse(null), branchName(enquiry.getBranchId()));
    }

    // ── Shared with MobileMemberEnquiryService ──────────────────────────────

    public static MemberEnquiryDTO baseDto(MemberEnquiry e) {
        MemberEnquiryDTO dto = new MemberEnquiryDTO();
        dto.setId(e.getId());
        dto.setBranchId(e.getBranchId());
        dto.setMemberId(e.getMemberId());
        dto.setCategory(e.getCategory());
        dto.setSubject(e.getSubject());
        dto.setMessage(e.getMessage());
        dto.setStatus(e.getStatus());
        dto.setReply(e.getReply());
        dto.setRepliedBy(e.getRepliedBy());
        dto.setRepliedAt(e.getRepliedAt());
        dto.setClosedBy(e.getClosedBy());
        dto.setClosedAt(e.getClosedAt());
        dto.setCreatedAt(e.getCreatedAt());
        return dto;
    }

    public static String requireText(String value, String field, int maxLength) {
        String text = value == null ? "" : value.trim();
        if (text.isEmpty()) {
            throw new IllegalArgumentException(field + " is required");
        }
        if (text.length() > maxLength) {
            throw new IllegalArgumentException(field + " must be at most " + maxLength + " characters");
        }
        return text;
    }

    // ── Internals ───────────────────────────────────────────────────────────

    private MemberEnquiry require(Long id) {
        return enquiryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Enquiry not found"));
    }

    private String branchName(Long branchId) {
        return branchRepository.findById(branchId).map(Branch::getBranchName).orElse(null);
    }

    private static MemberEnquiryDTO toDto(MemberEnquiry e, Member member, String branchName) {
        MemberEnquiryDTO dto = baseDto(e);
        dto.setBranchName(branchName);
        if (member != null) {
            dto.setMemberName(member.getName());
            dto.setMemberCode(member.getMemberId());
            dto.setMemberPhone(member.getPhone());
        }
        return dto;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    /** In-app notification + push, only after the reply commits. */
    private void notifyReplied(Member member, MemberEnquiry enquiry) {
        // Mobile members sign in with their global account (same fallback as MemberPaymentApprovalNotifier).
        Long targetUserId = member.getGlobalUserId() != null ? member.getGlobalUserId() : member.getUserId();
        Long memberId = member.getId();
        Long enquiryId = enquiry.getId();
        String message = "The gym replied to \"" + enquiry.getSubject() + "\".";
        List<String> tokens = pushTokenRepository.findByMemberId(memberId).stream()
                .map(MobilePushToken::getExpoPushToken)
                .toList();

        runAfterCommit(() -> {
            if (targetUserId != null) {
                notificationService.notifyUser(targetUserId, TITLE, message,
                        "INFO", "MEDIUM", NOTIFICATION_MODULE,
                        enquiryId, ACTION_URL, "MEMBER_ENQUIRY_REPLIED_" + enquiryId);
            }
            if (tokens.isEmpty()) return;
            ExpoPushClient.SendResult result = expoPushClient.send(tokens, TITLE, message,
                    Map.of("type", PUSH_TYPE, "enquiryId", enquiryId));
            if (!result.unregisteredTokens().isEmpty()) {
                isolatedTx.executeWithoutResult(s -> pushTokenRepository.deleteByExpoPushTokenIn(result.unregisteredTokens()));
            }
        });
    }

    private static void runAfterCommit(Runnable action) {
        Runnable safe = () -> {
            try {
                action.run();
            } catch (Exception e) {
                // Never surface a notification failure on a reply that already committed.
                log.error("Enquiry-reply notification failed: {}", e.getMessage(), e);
            }
        };
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            safe.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                safe.run();
            }
        });
    }
}
