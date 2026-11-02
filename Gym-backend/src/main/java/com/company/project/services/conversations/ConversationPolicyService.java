package com.company.project.services.conversations;

import com.company.project.entities.Conversation;
import com.company.project.entities.Member;
import com.company.project.entities.Staff;
import com.company.project.entities.StaffScheduleSlot;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.ConversationMessageRepository;
import com.company.project.repositories.ConversationRepository;
import com.company.project.repositories.StaffBranchRepository;
import com.company.project.services.GlobalMembershipService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Every rule of member↔staff chat in one place: who may start a conversation with whom,
 * who may send in one, the caps, quiet hours and contact-detail masking. Services ask
 * here and never re-derive a rule; a refusal carries a stable code the app translates.
 *
 * The rules (agreed with the gym owner):
 *  - Members reach the front desk, or any active staff member of their branch who has
 *    app access and accepts member messages. Staff reach active members of their branch
 *    who allow staff-started chats. Either switch only stops new conversations.
 *  - At most MAX_UNANSWERED messages in a row from either side; members also have a
 *    daily cap, staff a daily cap on new conversations.
 *  - Minors, chat-banned members and lapsed memberships can't send. A lapsed member
 *    still reads their conversations for READ_ONLY_DAYS after the membership ends.
 *  - A staff member who left the branch or lost app access leaves read-only threads.
 */
@Service
public class ConversationPolicyService {

    public static final int MAX_BODY_LENGTH = 1000;
    public static final int MAX_UNANSWERED = 3;
    public static final int MEMBER_DAILY_MESSAGES = 20;
    public static final int STAFF_DAILY_NEW_CONVERSATIONS = 20;
    public static final int MUTE_DAYS = 7;
    public static final int READ_ONLY_DAYS = 30;

    /** Used when a staff member has no schedule at all: assume normal gym hours. */
    static final LocalTime DEFAULT_DUTY_START = LocalTime.of(6, 0);
    static final LocalTime DEFAULT_DUTY_END = LocalTime.of(22, 0);

    // Refusal codes. Must match the mobile app's conversation refusal keys.
    public static final String MINOR = "MINOR";
    public static final String CHAT_BANNED = "CHAT_BANNED";
    public static final String MEMBERSHIP_INACTIVE = "MEMBERSHIP_INACTIVE";
    public static final String STAFF_UNAVAILABLE = "STAFF_UNAVAILABLE";
    public static final String NOT_ACCEPTING = "NOT_ACCEPTING";
    public static final String MEMBER_UNAVAILABLE = "MEMBER_UNAVAILABLE";
    public static final String MEMBER_OPTED_OUT = "MEMBER_OPTED_OUT";
    public static final String NOT_AT_BRANCH = "NOT_AT_BRANCH";
    public static final String BLOCKED = "BLOCKED";
    public static final String BLOCKED_BY_YOU = "BLOCKED_BY_YOU";
    public static final String BLOCKED_BY_MEMBER = "BLOCKED_BY_MEMBER";
    public static final String MUTED = "MUTED";
    public static final String UNANSWERED_LIMIT = "UNANSWERED_LIMIT";
    public static final String DAILY_LIMIT = "DAILY_LIMIT";

    /** A rule's answer: allowed, or refused with a code and a message to show. */
    public record Verdict(boolean allowed, String code, String message) {
        static final Verdict OK = new Verdict(true, null, null);

        static Verdict no(String code, String message) {
            return new Verdict(false, code, message);
        }

        /** Throws the refusal as a 409 the app shows as is. */
        public void orThrow() {
            if (!allowed) throw new BusinessRuleViolationException(message);
        }
    }

    private final StaffBranchRepository staffBranchRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMessageRepository messageRepository;

    public ConversationPolicyService(
            StaffBranchRepository staffBranchRepository,
            ConversationRepository conversationRepository,
            ConversationMessageRepository messageRepository) {
        this.staffBranchRepository = staffBranchRepository;
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
    }

    // ── Who's who ───────────────────────────────────────────────────────────

    /** Role is free text ("Trainer", "Personal Trainer", "Yoga Coach"...); same test as the app. */
    public static boolean isTrainer(Staff staff) {
        String role = staff.getRole() == null ? "" : staff.getRole().toLowerCase(Locale.ROOT);
        return role.contains("trainer") || role.contains("coach") || role.contains("instructor");
    }

    /** Everyone who isn't a trainer works the front desk inbox. */
    public static boolean isDeskStaff(Staff staff) {
        return !isTrainer(staff);
    }

    /** Still working at this branch and able to sign in to the app to answer. */
    public boolean isReachable(Staff staff, Long branchId) {
        return "active".equalsIgnoreCase(staff.getStatus())
                && Boolean.TRUE.equals(staff.getAppAccessEnabled())
                && staff.getUserId() != null
                && staffBranchRepository.existsByStaffIdAndBranchId(staff.getId(), branchId);
    }

    /** A lapsed member keeps reading their conversations for READ_ONLY_DAYS after it ends. */
    public boolean memberCanSee(Member member, LocalDateTime now) {
        if (GlobalMembershipService.isActive(member)) return true;
        LocalDateTime lapsed = member.getExpiryDate() != null ? member.getExpiryDate()
                : member.getMembershipEndDate() != null ? member.getMembershipEndDate()
                : member.getSuspendedAt();
        return lapsed == null || !lapsed.plusDays(READ_ONLY_DAYS).isBefore(now);
    }

    // ── Starting a conversation ─────────────────────────────────────────────

    /** staff null = the front desk. */
    public Verdict canMemberStart(Member member, Staff staff, LocalDateTime now) {
        Verdict v = memberMaySend(member);
        if (!v.allowed()) return v;
        if (staff != null) {
            if (!isReachable(staff, member.getBranchId())) {
                return Verdict.no(STAFF_UNAVAILABLE, "This staff member can't receive messages.");
            }
            if (!staff.isAcceptsMemberMessages()) {
                return Verdict.no(NOT_ACCEPTING, staff.getName() + " isn't taking messages right now.");
            }
        }
        return memberDailyCap(member, now);
    }

    /**
     * The team list's cheap form of canMemberStart: memberLevel (the front-desk answer,
     * i.e. the member's own checks) is worked out once for the whole list, and the list
     * only holds active staff of the branch. Muted/blocked threads show once opened.
     */
    public Verdict teamCardVerdict(Verdict memberLevel, Staff staff, boolean hasThread) {
        if (!memberLevel.allowed()) return memberLevel;
        if (!Boolean.TRUE.equals(staff.getAppAccessEnabled()) || staff.getUserId() == null) {
            return Verdict.no(STAFF_UNAVAILABLE, "This staff member can't receive messages.");
        }
        if (!hasThread && !staff.isAcceptsMemberMessages()) {
            return Verdict.no(NOT_ACCEPTING, staff.getName() + " isn't taking messages right now.");
        }
        return Verdict.OK;
    }

    public Verdict canStaffStart(Staff staff, Member member, Long branchId, LocalDateTime now) {
        if (!"active".equalsIgnoreCase(staff.getStatus())
                || !staffBranchRepository.existsByStaffIdAndBranchId(staff.getId(), branchId)) {
            return Verdict.no(NOT_AT_BRANCH, "You aren't assigned to this branch.");
        }
        if (!branchId.equals(member.getBranchId()) || !memberMaySend(member).allowed()) {
            return Verdict.no(MEMBER_UNAVAILABLE, "This member can't receive messages.");
        }
        if (!member.isAllowStaffChats()) {
            return Verdict.no(MEMBER_OPTED_OUT, "This member doesn't accept chats started by staff.");
        }
        long startedToday = conversationRepository.countByStartedByStaffIdAndCreatedAtGreaterThanEqual(
                staff.getId(), now.toLocalDate().atStartOfDay());
        if (startedToday >= STAFF_DAILY_NEW_CONVERSATIONS) {
            return Verdict.no(DAILY_LIMIT, "You've started " + STAFF_DAILY_NEW_CONVERSATIONS
                    + " conversations today. Try again tomorrow.");
        }
        return Verdict.OK;
    }

    /**
     * The staff member list's cheap form of canStaffStart, part one: the checks about the
     * staff member alone (at the branch, daily cap on new conversations), worked out once
     * for the whole list.
     */
    public Verdict staffStartLevel(Staff staff, Long branchId, LocalDateTime now) {
        if (!"active".equalsIgnoreCase(staff.getStatus())
                || !staffBranchRepository.existsByStaffIdAndBranchId(staff.getId(), branchId)) {
            return Verdict.no(NOT_AT_BRANCH, "You aren't assigned to this branch.");
        }
        long startedToday = conversationRepository.countByStartedByStaffIdAndCreatedAtGreaterThanEqual(
                staff.getId(), now.toLocalDate().atStartOfDay());
        if (startedToday >= STAFF_DAILY_NEW_CONVERSATIONS) {
            return Verdict.no(DAILY_LIMIT, "You've started " + STAFF_DAILY_NEW_CONVERSATIONS
                    + " conversations today. Try again tomorrow.");
        }
        return Verdict.OK;
    }

    /**
     * Part two, per member. A member who already has a thread with this staff member is
     * always openable: what may be sent there shows once the chat is open (canStaffSend).
     */
    public Verdict staffDirectoryVerdict(Verdict staffLevel, Member member, Long branchId, boolean hasThread) {
        if (hasThread) return Verdict.OK;
        if (!staffLevel.allowed()) return staffLevel;
        if (!branchId.equals(member.getBranchId()) || !memberMaySend(member).allowed()) {
            return Verdict.no(MEMBER_UNAVAILABLE, "This member can't receive messages.");
        }
        if (!member.isAllowStaffChats()) {
            return Verdict.no(MEMBER_OPTED_OUT, "This member doesn't accept chats started by staff.");
        }
        return Verdict.OK;
    }

    // ── Sending in a conversation ───────────────────────────────────────────

    /** staff = the conversation's staff member, null for the front desk. */
    public Verdict canMemberSend(Member member, Conversation c, Staff staff, LocalDateTime now) {
        if (c.getBlockedByAdminAt() != null) {
            return Verdict.no(BLOCKED, "This conversation has been closed by the gym.");
        }
        Verdict v = memberMaySend(member);
        if (!v.allowed()) return v;
        if (staff != null && !isReachable(staff, c.getBranchId())) {
            return Verdict.no(STAFF_UNAVAILABLE, "This staff member can't receive messages any more.");
        }
        if (c.getBlockedByMemberAt() != null) {
            return Verdict.no(BLOCKED_BY_YOU, "You blocked this conversation. Unblock it to send a message.");
        }
        if (c.getMutedUntil() != null && c.getMutedUntil().isAfter(now)) {
            return Verdict.no(MUTED, "You can't send messages here for now.");
        }
        v = unansweredCap(c, Conversation.MEMBER);
        if (!v.allowed()) return v;
        return memberDailyCap(member, now);
    }

    public Verdict canStaffSend(Member member, Conversation c) {
        if (c.getBlockedByAdminAt() != null) {
            return Verdict.no(BLOCKED, "This conversation has been closed by the gym.");
        }
        if (c.getBlockedByMemberAt() != null) {
            return Verdict.no(BLOCKED_BY_MEMBER, "This member has blocked the conversation.");
        }
        if (!memberMaySend(member).allowed()) {
            return Verdict.no(MEMBER_UNAVAILABLE, "This member can't receive messages any more.");
        }
        return unansweredCap(c, Conversation.STAFF);
    }

    private Verdict memberMaySend(Member member) {
        if (Boolean.TRUE.equals(member.getIsMinor())) {
            return Verdict.no(MINOR, "Chat isn't available on this account.");
        }
        if (member.getChatBannedAt() != null) {
            return Verdict.no(CHAT_BANNED, "Chat has been turned off for your account by the gym.");
        }
        if (!GlobalMembershipService.isActive(member)) {
            return Verdict.no(MEMBERSHIP_INACTIVE, "You need an active membership to send messages.");
        }
        return Verdict.OK;
    }

    private static Verdict unansweredCap(Conversation c, String sender) {
        if (sender.equals(c.getLastSender()) && c.getTrailingCount() >= MAX_UNANSWERED) {
            return Verdict.no(UNANSWERED_LIMIT, "Please wait for a reply before sending more messages.");
        }
        return Verdict.OK;
    }

    private Verdict memberDailyCap(Member member, LocalDateTime now) {
        long sentToday = messageRepository.countMemberMessagesSince(member.getId(), now.toLocalDate().atStartOfDay());
        if (sentToday >= MEMBER_DAILY_MESSAGES) {
            return Verdict.no(DAILY_LIMIT, "You've reached today's message limit. Try again tomorrow.");
        }
        return Verdict.OK;
    }

    // ── Quiet hours ─────────────────────────────────────────────────────────

    /**
     * Whether a member's message should buzz this staff member now. Uses their weekly
     * schedule slots ("Morning (6am–12pm)" / "Afternoon (12pm–5pm)" / "Evening (5pm–10pm)");
     * no schedule at all means normal gym hours every day.
     */
    public static boolean isOnDuty(Staff staff, LocalDateTime now) {
        LocalTime time = now.toLocalTime();
        if (staff.getScheduleSlots() == null || staff.getScheduleSlots().isEmpty()) {
            return !time.isBefore(DEFAULT_DUTY_START) && time.isBefore(DEFAULT_DUTY_END);
        }
        String today = now.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
        for (StaffScheduleSlot slot : staff.getScheduleSlots()) {
            if (!sameDay(slot.getDay(), today)) continue;
            LocalTime[] range = slotRange(slot.getSlot());
            if (range != null && !time.isBefore(range[0]) && time.isBefore(range[1])) return true;
        }
        return false;
    }

    private static boolean sameDay(String raw, String fullName) {
        if (raw == null || raw.isBlank()) return false;
        String key = raw.trim().toLowerCase(Locale.ENGLISH);
        String full = fullName.toLowerCase(Locale.ENGLISH);
        return full.equals(key) || (key.length() >= 3 && full.startsWith(key));
    }

    private static LocalTime[] slotRange(String slot) {
        if (slot == null) return null;
        String s = slot.trim().toLowerCase(Locale.ENGLISH);
        if (s.startsWith("morning")) return new LocalTime[]{LocalTime.of(6, 0), LocalTime.of(12, 0)};
        if (s.startsWith("afternoon")) return new LocalTime[]{LocalTime.of(12, 0), LocalTime.of(17, 0)};
        if (s.startsWith("evening")) return new LocalTime[]{LocalTime.of(17, 0), LocalTime.of(22, 0)};
        return null;
    }

    // ── Contact details ─────────────────────────────────────────────────────

    public static final String HIDDEN = "[hidden]";

    private static final Pattern EMAIL = Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
    private static final Pattern URL = Pattern.compile(
            "(?i)\\b(?:https?://|www\\.)\\S+"
                    + "|\\b[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.(?:com|net|org|in|io|me|co|app|link|ly|gg|info|biz|xyz|site|online)\\b(?:/\\S*)?");
    /** 8+ digits, allowing spaces, dashes, dots and brackets between them: phone numbers, not prices or times. */
    private static final Pattern PHONE = Pattern.compile("\\+?\\d(?:[\\s\\-().]*\\d){7,}");

    /** What was typed with emails, links and phone numbers replaced; changed = something was hidden. */
    public record Masked(String text, boolean changed) {}

    public static Masked maskContactDetails(String text) {
        String out = replace(EMAIL, text);
        out = replace(URL, out);
        out = replace(PHONE, out);
        return new Masked(out, !out.equals(text));
    }

    private static String replace(Pattern pattern, String text) {
        Matcher m = pattern.matcher(text);
        return m.replaceAll(HIDDEN);
    }
}
