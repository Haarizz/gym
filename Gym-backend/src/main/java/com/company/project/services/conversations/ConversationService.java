package com.company.project.services.conversations;

import com.company.project.dto.conversations.*;
import com.company.project.entities.*;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.*;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.conversations.ConversationPolicyService.Verdict;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Member↔staff chat for both apps. The member side works on the member's own branch;
 * the staff side on the staff member's active branch, where they see their own
 * conversations plus the front desk's when they work the desk. Every "may they?"
 * question goes to ConversationPolicyService.
 *
 * Messages pages come newest first; the app pages back with beforeId = the oldest id it has.
 */
@Service
@Transactional(readOnly = true)
public class ConversationService {

    private static final int DEFAULT_PAGE_SIZE = 30;
    private static final int MAX_PAGE_SIZE = 100;
    private static final int PREVIEW_LENGTH = 120;
    private static final int MAX_REPORT_DETAILS = 500;
    private static final String DELETED_PREVIEW = "Message deleted";

    public static final String INBOX_ALL = "all";
    public static final String INBOX_MINE = "mine";
    public static final String INBOX_FRONT_DESK = "front_desk";

    private final ConversationRepository conversationRepository;
    private final ConversationMessageRepository messageRepository;
    private final ConversationReportRepository reportRepository;
    private final MemberRepository memberRepository;
    private final StaffRepository staffRepository;
    private final StaffBranchRepository staffBranchRepository;
    private final ConversationPolicyService policy;
    private final ConversationNotifier notifier;

    public ConversationService(
            ConversationRepository conversationRepository,
            ConversationMessageRepository messageRepository,
            ConversationReportRepository reportRepository,
            MemberRepository memberRepository,
            StaffRepository staffRepository,
            StaffBranchRepository staffBranchRepository,
            ConversationPolicyService policy,
            ConversationNotifier notifier) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.reportRepository = reportRepository;
        this.memberRepository = memberRepository;
        this.staffRepository = staffRepository;
        this.staffBranchRepository = staffBranchRepository;
        this.policy = policy;
        this.notifier = notifier;
    }

    /** The signed-in staff member and the branch they're working in. */
    private record StaffActor(Staff staff, Long branchId) {}

    // ══ Member side ═════════════════════════════════════════════════════════

    public List<ConversationDTO> memberList(UserDetailsImpl principal) {
        Member member = requireMember(principal);
        LocalDateTime now = LocalDateTime.now();
        if (!policy.memberCanSee(member, now)) return List.of();
        List<Conversation> rows = conversationRepository
                .findByMemberIdAndBranchIdOrderByLastMessageAtDesc(member.getId(), member.getBranchId()).stream()
                .filter(c -> c.getLastMessageAt() != null)
                .toList();
        Map<Long, Staff> staff = staffById(rows.stream().map(Conversation::getStaffId));
        return rows.stream().map(c -> memberView(c, member, staff.get(c.getStaffId()), now)).toList();
    }

    public int memberUnreadTotal(UserDetailsImpl principal) {
        return memberList(principal).stream().mapToInt(ConversationDTO::unread).sum();
    }

    /** staffId null = the front desk. */
    public ConversationLookupDTO memberLookup(UserDetailsImpl principal, Long staffId) {
        Member member = requireMember(principal);
        Staff staff = staffId == null ? null : requireBranchStaff(member, staffId);
        LocalDateTime now = LocalDateTime.now();
        Conversation existing = findMemberThread(member, staffId).orElse(null);
        if (existing != null && existing.getLastMessageAt() != null) {
            ConversationDTO dto = memberView(existing, member, staff, now);
            return new ConversationLookupDTO(dto, dto.canSend(), dto.cannotSendCode(), dto.cannotSendMessage());
        }
        Verdict v = policy.canMemberStart(member, staff, now);
        return new ConversationLookupDTO(null, v.allowed(), v.code(), v.message());
    }

    /** Whether the Message button on a staff card works, and why not if it doesn't. */
    public Verdict memberMessageAvailability(Member member, Staff staff) {
        LocalDateTime now = LocalDateTime.now();
        Conversation existing = findMemberThread(member, staff.getId()).orElse(null);
        return existing != null
                ? policy.canMemberSend(member, existing, staff, now)
                : policy.canMemberStart(member, staff, now);
    }

    /** The team list: the member's own checks once, then each card's switches. */
    public Map<Long, Verdict> memberTeamAvailability(Member member, List<Staff> staff) {
        Verdict memberLevel = policy.canMemberStart(member, null, LocalDateTime.now());
        Set<Long> withThread = conversationRepository
                .findByMemberIdAndBranchIdOrderByLastMessageAtDesc(member.getId(), member.getBranchId()).stream()
                .map(Conversation::getStaffId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, Verdict> out = new HashMap<>();
        for (Staff s : staff) {
            out.put(s.getId(), policy.teamCardVerdict(memberLevel, s, withThread.contains(s.getId())));
        }
        return out;
    }

    /** Opens the conversation with a first message, or adds to the existing one. */
    @Transactional
    public ConversationDTO memberStart(UserDetailsImpl principal, ConversationRequestDTO request) {
        Member member = requireMember(principal);
        Staff staff = request.staffId() == null ? null : requireBranchStaff(member, request.staffId());
        LocalDateTime now = LocalDateTime.now();
        Conversation c = findMemberThread(member, request.staffId())
                .map(existing -> conversationRepository.findByIdForUpdate(existing.getId()).orElseThrow())
                .orElse(null);
        if (c == null) {
            policy.canMemberStart(member, staff, now).orThrow();
            c = new Conversation();
            c.setBranchId(member.getBranchId());
            c.setMemberId(member.getId());
            c.setStaffId(request.staffId());
            c.setStartedBy(Conversation.MEMBER);
            c = conversationRepository.saveAndFlush(c);
        } else {
            policy.canMemberSend(member, c, staff, now).orThrow();
        }
        memberAppend(c, member, staff, request.body(), now);
        return memberView(c, member, staff, now);
    }

    public ConversationDTO memberGet(UserDetailsImpl principal, Long id) {
        Member member = requireMember(principal);
        Conversation c = requireMemberThread(member, id);
        return memberView(c, member, staffOf(c), LocalDateTime.now());
    }

    public List<ConversationMessageDTO> memberMessages(UserDetailsImpl principal, Long id, Long beforeId, Integer limit) {
        Member member = requireMember(principal);
        Conversation c = requireMemberThread(member, id);
        return page(c, beforeId, limit, Conversation.MEMBER, null, member);
    }

    @Transactional
    public ConversationMessageDTO memberSend(UserDetailsImpl principal, Long id, ConversationRequestDTO request) {
        Member member = requireMember(principal);
        Conversation c = lockForUpdate(requireMemberThread(member, id));
        Staff staff = staffOf(c);
        LocalDateTime now = LocalDateTime.now();
        policy.canMemberSend(member, c, staff, now).orThrow();
        ConversationMessage msg = memberAppend(c, member, staff, request.body(), now);
        return toMessage(msg, Conversation.MEMBER, null, member, Map.of());
    }

    @Transactional
    public void memberRead(UserDetailsImpl principal, Long id) {
        Member member = requireMember(principal);
        Conversation c = requireMemberThread(member, id);
        if (c.getMemberUnread() != 0) {
            c.setMemberUnread(0);
            conversationRepository.save(c);
        }
    }

    @Transactional
    public void memberDelete(UserDetailsImpl principal, Long id, Long messageId) {
        Member member = requireMember(principal);
        Conversation c = lockForUpdate(requireMemberThread(member, id));
        ConversationMessage msg = requireMessage(c, messageId);
        if (!Conversation.MEMBER.equals(msg.getSenderType())) {
            throw new BusinessRuleViolationException("You can only delete your own messages.");
        }
        softDelete(c, msg);
    }

    /** Blocking stops the staff side sending; the member can undo it. The front desk can't be blocked. */
    @Transactional
    public ConversationDTO memberBlock(UserDetailsImpl principal, Long id, boolean block) {
        Member member = requireMember(principal);
        Conversation c = lockForUpdate(requireMemberThread(member, id));
        if (c.isFrontDesk()) {
            throw new BusinessRuleViolationException("The front desk can't be blocked. Report a message instead.");
        }
        Staff staff = staffOf(c);
        if (block && c.getBlockedByMemberAt() == null) {
            c.setBlockedByMemberAt(LocalDateTime.now());
            notifier.memberBlocked(c, member, staff);
        } else if (!block) {
            c.setBlockedByMemberAt(null);
        }
        conversationRepository.save(c);
        return memberView(c, member, staff, LocalDateTime.now());
    }

    @Transactional
    public void memberReport(UserDetailsImpl principal, Long id, Long messageId, ConversationRequestDTO request) {
        Member member = requireMember(principal);
        Conversation c = requireMemberThread(member, id);
        report(c, requireMessage(c, messageId), Conversation.MEMBER, member.getId(), member.getName(), request);
    }

    public ChatSettingsDTO memberSettings(UserDetailsImpl principal) {
        return new ChatSettingsDTO(requireMember(principal).isAllowStaffChats(), null);
    }

    @Transactional
    public ChatSettingsDTO updateMemberSettings(UserDetailsImpl principal, ChatSettingsDTO request) {
        Member member = requireMember(principal);
        if (request.allowStaffChats() == null) throw new IllegalArgumentException("allow_staff_chats is required");
        memberRepository.updateAllowStaffChats(member.getId(), request.allowStaffChats());
        return new ChatSettingsDTO(request.allowStaffChats(), null);
    }

    // ══ Staff side ══════════════════════════════════════════════════════════

    /** inbox: all (own + front desk) | mine | front_desk. Trainers only ever see their own. */
    public List<ConversationDTO> staffList(UserDetailsImpl principal, String inbox) {
        StaffActor actor = requireStaffActor(principal);
        String which = inbox == null || inbox.isBlank() ? INBOX_ALL : inbox.trim().toLowerCase(Locale.ROOT);
        if (!List.of(INBOX_ALL, INBOX_MINE, INBOX_FRONT_DESK).contains(which)) {
            throw new IllegalArgumentException("Unknown inbox");
        }
        boolean desk = ConversationPolicyService.isDeskStaff(actor.staff()) && !INBOX_MINE.equals(which);
        List<Conversation> rows = conversationRepository.findStaffInbox(actor.branchId(), actor.staff().getId(), desk).stream()
                .filter(c -> !INBOX_FRONT_DESK.equals(which) || c.isFrontDesk())
                .toList();
        Map<Long, Member> members = memberRepository.findAllById(
                        rows.stream().map(Conversation::getMemberId).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(Member::getId, Function.identity()));
        return rows.stream()
                .filter(c -> members.containsKey(c.getMemberId()))
                .map(c -> staffView(c, members.get(c.getMemberId()), actor.staff()))
                .toList();
    }

    public int staffUnreadTotal(UserDetailsImpl principal) {
        return staffList(principal, INBOX_ALL).stream().mapToInt(ConversationDTO::unread).sum();
    }

    public ConversationLookupDTO staffLookup(UserDetailsImpl principal, Long memberId) {
        StaffActor actor = requireStaffActor(principal);
        Member member = requireBranchMember(actor.branchId(), memberId);
        Conversation existing = conversationRepository
                .findByBranchIdAndMemberIdAndStaffId(actor.branchId(), member.getId(), actor.staff().getId())
                .filter(c -> c.getLastMessageAt() != null)
                .orElse(null);
        if (existing != null) {
            ConversationDTO dto = staffView(existing, member, actor.staff());
            return new ConversationLookupDTO(dto, dto.canSend(), dto.cannotSendCode(), dto.cannotSendMessage());
        }
        Verdict v = policy.canStaffStart(actor.staff(), member, actor.branchId(), LocalDateTime.now());
        return new ConversationLookupDTO(null, v.allowed(), v.code(), v.message());
    }

    /** Staff start conversations as themselves, never as the front desk. */
    @Transactional
    public ConversationDTO staffStart(UserDetailsImpl principal, ConversationRequestDTO request) {
        StaffActor actor = requireStaffActor(principal);
        if (request.memberId() == null) throw new IllegalArgumentException("member_id is required");
        Member member = requireBranchMember(actor.branchId(), request.memberId());
        Staff staff = actor.staff();
        Conversation c = conversationRepository
                .findByBranchIdAndMemberIdAndStaffId(actor.branchId(), member.getId(), staff.getId())
                .map(existing -> conversationRepository.findByIdForUpdate(existing.getId()).orElseThrow())
                .orElse(null);
        if (c == null) {
            policy.canStaffStart(staff, member, actor.branchId(), LocalDateTime.now()).orThrow();
            c = new Conversation();
            c.setBranchId(actor.branchId());
            c.setMemberId(member.getId());
            c.setStaffId(staff.getId());
            c.setStartedBy(Conversation.STAFF);
            c.setStartedByStaffId(staff.getId());
            c = conversationRepository.saveAndFlush(c);
        } else {
            policy.canStaffSend(member, c).orThrow();
        }
        staffAppend(c, staff, request.body(), LocalDateTime.now());
        return staffView(c, member, staff);
    }

    public ConversationDTO staffGet(UserDetailsImpl principal, Long id) {
        StaffActor actor = requireStaffActor(principal);
        Conversation c = requireStaffThread(actor, id);
        return staffView(c, memberOf(c), actor.staff());
    }

    public List<ConversationMessageDTO> staffMessages(UserDetailsImpl principal, Long id, Long beforeId, Integer limit) {
        StaffActor actor = requireStaffActor(principal);
        Conversation c = requireStaffThread(actor, id);
        return page(c, beforeId, limit, Conversation.STAFF, actor.staff().getId(), memberOf(c));
    }

    @Transactional
    public ConversationMessageDTO staffSend(UserDetailsImpl principal, Long id, ConversationRequestDTO request) {
        StaffActor actor = requireStaffActor(principal);
        Conversation c = lockForUpdate(requireStaffThread(actor, id));
        Member member = memberOf(c);
        policy.canStaffSend(member, c).orThrow();
        ConversationMessage msg = staffAppend(c, actor.staff(), request.body(), LocalDateTime.now());
        return toMessage(msg, Conversation.STAFF, actor.staff().getId(), member,
                Map.of(actor.staff().getId(), actor.staff()));
    }

    @Transactional
    public void staffRead(UserDetailsImpl principal, Long id) {
        StaffActor actor = requireStaffActor(principal);
        Conversation c = requireStaffThread(actor, id);
        if (c.getStaffUnread() != 0 || c.getStaffPushPendingSince() != null) {
            c.setStaffUnread(0);
            c.setStaffPushPendingSince(null);
            conversationRepository.save(c);
        }
    }

    @Transactional
    public void staffDelete(UserDetailsImpl principal, Long id, Long messageId) {
        StaffActor actor = requireStaffActor(principal);
        Conversation c = lockForUpdate(requireStaffThread(actor, id));
        ConversationMessage msg = requireMessage(c, messageId);
        if (!Conversation.STAFF.equals(msg.getSenderType()) || !actor.staff().getId().equals(msg.getSenderStaffId())) {
            throw new BusinessRuleViolationException("You can only delete your own messages.");
        }
        softDelete(c, msg);
    }

    /** Muting stops the member sending here for MUTE_DAYS; unmuting lifts it early. */
    @Transactional
    public ConversationDTO staffMute(UserDetailsImpl principal, Long id, boolean mute) {
        StaffActor actor = requireStaffActor(principal);
        Conversation c = lockForUpdate(requireStaffThread(actor, id));
        if (mute) {
            c.setMutedUntil(LocalDateTime.now().plusDays(ConversationPolicyService.MUTE_DAYS));
            c.setMutedByStaffId(actor.staff().getId());
        } else {
            c.setMutedUntil(null);
            c.setMutedByStaffId(null);
        }
        conversationRepository.save(c);
        return staffView(c, memberOf(c), actor.staff());
    }

    @Transactional
    public void staffReport(UserDetailsImpl principal, Long id, Long messageId, ConversationRequestDTO request) {
        StaffActor actor = requireStaffActor(principal);
        Conversation c = requireStaffThread(actor, id);
        report(c, requireMessage(c, messageId), Conversation.STAFF, actor.staff().getId(), actor.staff().getName(), request);
    }

    public ChatSettingsDTO staffSettings(UserDetailsImpl principal) {
        return new ChatSettingsDTO(null, requireStaffActor(principal).staff().isAcceptsMemberMessages());
    }

    @Transactional
    public ChatSettingsDTO updateStaffSettings(UserDetailsImpl principal, ChatSettingsDTO request) {
        StaffActor actor = requireStaffActor(principal);
        if (request.acceptsMemberMessages() == null) throw new IllegalArgumentException("accepts_member_messages is required");
        staffRepository.updateAcceptsMemberMessages(actor.staff().getId(), request.acceptsMemberMessages());
        return new ChatSettingsDTO(null, request.acceptsMemberMessages());
    }

    // ══ Messages ════════════════════════════════════════════════════════════

    private ConversationMessage memberAppend(Conversation c, Member member, Staff staff, String rawBody, LocalDateTime now) {
        ConversationMessage msg = append(c, Conversation.MEMBER, null, rawBody, now);
        c.setStaffUnread(c.getStaffUnread() + 1);
        notifier.memberMessaged(c, member, staff, msg.getBody(), now);
        conversationRepository.save(c);
        return msg;
    }

    private ConversationMessage staffAppend(Conversation c, Staff sender, String rawBody, LocalDateTime now) {
        ConversationMessage msg = append(c, Conversation.STAFF, sender.getId(), rawBody, now);
        c.setMemberUnread(c.getMemberUnread() + 1);
        // Someone on the staff side answered: nothing is waiting for a shift any more.
        c.setStaffPushPendingSince(null);
        notifier.staffMessaged(c, sender, msg.getBody());
        conversationRepository.save(c);
        return msg;
    }

    private ConversationMessage append(Conversation c, String senderType, Long senderStaffId, String rawBody, LocalDateTime now) {
        String text = rawBody == null ? "" : rawBody.trim();
        if (text.isEmpty()) throw new IllegalArgumentException("Message is required");
        if (text.length() > ConversationPolicyService.MAX_BODY_LENGTH) {
            throw new IllegalArgumentException("Message must be at most " + ConversationPolicyService.MAX_BODY_LENGTH + " characters");
        }
        ConversationPolicyService.Masked masked = ConversationPolicyService.maskContactDetails(text);

        ConversationMessage msg = new ConversationMessage();
        msg.setConversationId(c.getId());
        msg.setSenderType(senderType);
        msg.setSenderStaffId(senderStaffId);
        msg.setBody(masked.text());
        msg.setOriginalBody(masked.changed() ? text : null);
        msg.setCreatedAt(now);
        msg = messageRepository.save(msg);

        c.setLastMessageAt(now);
        c.setLastMessagePreview(truncate(masked.text(), PREVIEW_LENGTH));
        if (senderType.equals(c.getLastSender())) {
            c.setTrailingCount(c.getTrailingCount() + 1);
        } else {
            c.setLastSender(senderType);
            c.setTrailingCount(1);
        }
        return msg;
    }

    /** Hidden from both sides, kept for reports. */
    private void softDelete(Conversation c, ConversationMessage msg) {
        if (msg.getDeletedAt() != null) return;
        msg.setDeletedAt(LocalDateTime.now());
        messageRepository.save(msg);
        List<ConversationMessage> latest = messageRepository.findPage(c.getId(), null, PageRequest.of(0, 1));
        if (!latest.isEmpty() && latest.get(0).getId().equals(msg.getId())) {
            c.setLastMessagePreview(DELETED_PREVIEW);
            conversationRepository.save(c);
        }
    }

    private List<ConversationMessageDTO> page(Conversation c, Long beforeId, Integer limit,
                                              String viewerType, Long viewerStaffId, Member member) {
        int size = limit == null ? DEFAULT_PAGE_SIZE : Math.max(1, Math.min(limit, MAX_PAGE_SIZE));
        List<ConversationMessage> rows = messageRepository.findPage(c.getId(), beforeId, PageRequest.of(0, size));
        Map<Long, Staff> senders = staffById(rows.stream().map(ConversationMessage::getSenderStaffId));
        return rows.stream().map(m -> toMessage(m, viewerType, viewerStaffId, member, senders)).toList();
    }

    private void report(Conversation c, ConversationMessage msg, String reporterType, Long reporterId,
                        String reporterName, ConversationRequestDTO request) {
        if (reporterType.equals(msg.getSenderType())) {
            throw new BusinessRuleViolationException(Conversation.MEMBER.equals(reporterType)
                    ? "You can only report messages you received." : "You can only report a member's messages.");
        }
        String reason = request.reason() == null ? "" : request.reason().trim().toUpperCase(Locale.ROOT);
        if (!ConversationReport.REASONS.contains(reason)) throw new IllegalArgumentException("Unknown reason");
        String details = request.details() == null ? null : request.details().trim();
        if (details != null && details.length() > MAX_REPORT_DETAILS) {
            throw new IllegalArgumentException("Details must be at most " + MAX_REPORT_DETAILS + " characters");
        }
        if (reportRepository.existsByMessageIdAndReportedByTypeAndReportedByIdAndStatus(
                msg.getId(), reporterType, reporterId, ConversationReport.OPEN)) {
            throw new BusinessRuleViolationException("You've already reported this message.");
        }
        ConversationReport r = new ConversationReport();
        r.setBranchId(c.getBranchId());
        r.setConversationId(c.getId());
        r.setMessageId(msg.getId());
        r.setReportedByType(reporterType);
        r.setReportedById(reporterId);
        r.setReason(reason);
        r.setDetails(details == null || details.isEmpty() ? null : details);
        r = reportRepository.saveAndFlush(r);
        notifier.reportFiled(r.getId(), reporterName, reason);
    }

    // ══ Views ═══════════════════════════════════════════════════════════════

    private ConversationDTO memberView(Conversation c, Member member, Staff staff, LocalDateTime now) {
        Verdict v = policy.canMemberSend(member, c, staff, now);
        boolean onDuty = notifier.recipients(c, staff).stream().anyMatch(s -> ConversationPolicyService.isOnDuty(s, now));
        ParticipantDTO staffP = staff == null ? null
                : new ParticipantDTO(staff.getId(), staff.getName(), staff.getRole(), staff.getPhotoUrl(), null);
        return new ConversationDTO(c.getId(), c.isFrontDesk(), null, staffP, c.getStartedBy(),
                c.getLastMessageAt(), c.getLastMessagePreview(), c.getLastSender(), c.getMemberUnread(),
                v.allowed(), v.code(), v.message(), onDuty, activeMute(c, now),
                c.getBlockedByMemberAt() != null, c.getBlockedByAdminAt() != null);
    }

    private ConversationDTO staffView(Conversation c, Member member, Staff viewer) {
        Verdict v = policy.canStaffSend(member, c);
        Staff staff = c.isFrontDesk() ? null
                : c.getStaffId().equals(viewer.getId()) ? viewer : staffRepository.findById(c.getStaffId()).orElse(null);
        ParticipantDTO staffP = staff == null ? null
                : new ParticipantDTO(staff.getId(), staff.getName(), staff.getRole(), staff.getPhotoUrl(), null);
        ParticipantDTO memberP = new ParticipantDTO(member.getId(), member.getName(), null, member.getPhotoUrl(), member.getMemberId());
        return new ConversationDTO(c.getId(), c.isFrontDesk(), memberP, staffP, c.getStartedBy(),
                c.getLastMessageAt(), c.getLastMessagePreview(), c.getLastSender(), c.getStaffUnread(),
                v.allowed(), v.code(), v.message(), null, activeMute(c, LocalDateTime.now()),
                c.getBlockedByMemberAt() != null, c.getBlockedByAdminAt() != null);
    }

    /** Shared with ConversationReportService, which passes includeOriginal = true. */
    static ConversationMessageDTO toMessage(ConversationMessage m, String viewerType, Long viewerStaffId,
                                            Member member, Map<Long, Staff> staff, boolean includeOriginal) {
        boolean mine = viewerType != null && viewerType.equals(m.getSenderType())
                && (Conversation.MEMBER.equals(viewerType) || Objects.equals(viewerStaffId, m.getSenderStaffId()));
        String senderName = Conversation.MEMBER.equals(m.getSenderType())
                ? (member != null ? member.getName() : null)
                : Optional.ofNullable(staff.get(m.getSenderStaffId())).map(Staff::getName).orElse(null);
        boolean deleted = m.getDeletedAt() != null;
        return new ConversationMessageDTO(m.getId(), m.getSenderType(), senderName, mine,
                deleted && !includeOriginal ? null : m.getBody(), deleted, m.getOriginalBody() != null,
                includeOriginal ? m.getOriginalBody() : null, m.getCreatedAt());
    }

    private static ConversationMessageDTO toMessage(ConversationMessage m, String viewerType, Long viewerStaffId,
                                                    Member member, Map<Long, Staff> staff) {
        return toMessage(m, viewerType, viewerStaffId, member, staff, false);
    }

    private static LocalDateTime activeMute(Conversation c, LocalDateTime now) {
        return c.getMutedUntil() != null && c.getMutedUntil().isAfter(now) ? c.getMutedUntil() : null;
    }

    // ══ Lookups ═════════════════════════════════════════════════════════════

    private Optional<Conversation> findMemberThread(Member member, Long staffId) {
        return staffId == null
                ? conversationRepository.findByBranchIdAndMemberIdAndStaffIdIsNull(member.getBranchId(), member.getId())
                : conversationRepository.findByBranchIdAndMemberIdAndStaffId(member.getBranchId(), member.getId(), staffId);
    }

    /** The member's own conversation at their branch, while they can still see it; 404 otherwise. */
    private Conversation requireMemberThread(Member member, Long id) {
        return conversationRepository.findById(id)
                .filter(c -> c.getMemberId().equals(member.getId()) && c.getBranchId().equals(member.getBranchId()))
                .filter(c -> policy.memberCanSee(member, LocalDateTime.now()))
                .orElseThrow(() -> new EntityNotFoundException("Conversation not found"));
    }

    /** Their own conversation at the active branch, or a front-desk one when they work the desk; 404 otherwise. */
    private Conversation requireStaffThread(StaffActor actor, Long id) {
        return conversationRepository.findById(id)
                .filter(c -> c.getBranchId().equals(actor.branchId()))
                .filter(c -> actor.staff().getId().equals(c.getStaffId())
                        || (c.isFrontDesk() && ConversationPolicyService.isDeskStaff(actor.staff())))
                .orElseThrow(() -> new EntityNotFoundException("Conversation not found"));
    }

    private Conversation lockForUpdate(Conversation c) {
        return conversationRepository.findByIdForUpdate(c.getId())
                .orElseThrow(() -> new EntityNotFoundException("Conversation not found"));
    }

    private ConversationMessage requireMessage(Conversation c, Long messageId) {
        return messageRepository.findById(messageId)
                .filter(m -> m.getConversationId().equals(c.getId()))
                .orElseThrow(() -> new EntityNotFoundException("Message not found"));
    }

    private Staff staffOf(Conversation c) {
        return c.isFrontDesk() ? null : staffRepository.findById(c.getStaffId()).orElse(null);
    }

    private Member memberOf(Conversation c) {
        return memberRepository.findById(c.getMemberId())
                .orElseThrow(() -> new EntityNotFoundException("Member not found"));
    }

    private Map<Long, Staff> staffById(java.util.stream.Stream<Long> ids) {
        Set<Long> set = ids.filter(Objects::nonNull).collect(Collectors.toSet());
        if (set.isEmpty()) return Map.of();
        return staffRepository.findAllById(set).stream().collect(Collectors.toMap(Staff::getId, Function.identity()));
    }

    /** Someone at the member's branch, or someone who left but already has a thread with them. */
    private Staff requireBranchStaff(Member member, Long staffId) {
        Staff staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new EntityNotFoundException("Staff member not found"));
        if (!staffBranchRepository.existsByStaffIdAndBranchId(staffId, member.getBranchId())
                && findMemberThread(member, staffId).isEmpty()) {
            throw new EntityNotFoundException("Staff member not found");
        }
        return staff;
    }

    private Member requireBranchMember(Long branchId, Long memberId) {
        return memberRepository.findById(memberId)
                .filter(m -> branchId.equals(m.getBranchId()))
                .orElseThrow(() -> new EntityNotFoundException("Member not found"));
    }

    private Member requireMember(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }
        Optional<Member> member = principal.isGlobal()
                ? memberRepository.findByGlobalUserId(principal.getId())
                : memberRepository.findByUserId(principal.getId());
        // Stale tokens with IS_GLOBAL_CLAIM=true but no globalUserId record
        if (member.isEmpty() && principal.isGlobal()) {
            member = memberRepository.findByUserId(principal.getId());
        }
        Member m = member.orElseThrow(() -> new EntityNotFoundException("No member profile linked to this user account"));
        if (m.getBranchId() == null) {
            throw new EntityNotFoundException("Member has no branch");
        }
        return m;
    }

    private StaffActor requireStaffActor(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }
        Staff staff = staffRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new EntityNotFoundException("No staff record linked to this account"));
        Long branchId = BranchContextHolder.getActiveBranchId();
        if (branchId == null) {
            // "All branches" (admins): fine when they only work at one.
            List<Long> branches = staffBranchRepository.findBranchIdsByStaffId(staff.getId());
            if (branches.size() != 1) throw new BusinessRuleViolationException("Select a branch to open chats.");
            branchId = branches.get(0);
        }
        if (!staffBranchRepository.existsByStaffIdAndBranchId(staff.getId(), branchId)) {
            throw new EntityNotFoundException("You aren't assigned to this branch");
        }
        return new StaffActor(staff, branchId);
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }
}
