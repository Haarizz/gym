package com.company.project.services.conversations;

import com.company.project.entities.Conversation;
import com.company.project.entities.Member;
import com.company.project.entities.Staff;
import com.company.project.entities.StaffScheduleSlot;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.ConversationMessageRepository;
import com.company.project.repositories.ConversationRepository;
import com.company.project.repositories.StaffBranchRepository;
import com.company.project.services.conversations.ConversationPolicyService.Verdict;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static com.company.project.services.conversations.ConversationPolicyService.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConversationPolicyServiceTest {

    private static final Long BRANCH = 7L;
    // A Wednesday, 10:00
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 28, 10, 0);

    @Mock
    private StaffBranchRepository staffBranchRepository;

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private ConversationMessageRepository messageRepository;

    @InjectMocks
    private ConversationPolicyService policy;

    private Member member;
    private Staff trainer;
    private Conversation thread;

    @BeforeEach
    void setUp() {
        member = new Member();
        member.setId(40L);
        member.setName("Sarah Johnson");
        member.setBranchId(BRANCH);
        member.setMembershipStatus("active");
        member.setExpiryDate(LocalDateTime.now().plusMonths(1));

        trainer = new Staff();
        trainer.setId(12L);
        trainer.setName("Arjun");
        trainer.setRole("Personal Trainer");
        trainer.setStatus("active");
        trainer.setAppAccessEnabled(true);
        trainer.setUserId(900L);

        thread = new Conversation();
        thread.setId(1L);
        thread.setBranchId(BRANCH);
        thread.setMemberId(40L);
        thread.setStaffId(12L);

        lenient().when(staffBranchRepository.existsByStaffIdAndBranchId(12L, BRANCH)).thenReturn(true);
        lenient().when(messageRepository.countMemberMessagesSince(eq(40L), any())).thenReturn(0L);
        lenient().when(conversationRepository.countByStartedByStaffIdAndCreatedAtGreaterThanEqual(eq(12L), any())).thenReturn(0L);
    }

    // ── Starting ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("An active member can start a chat with a reachable trainer and with the front desk")
    void memberStartsChat() {
        assertTrue(policy.canMemberStart(member, trainer, NOW).allowed());
        assertTrue(policy.canMemberStart(member, null, NOW).allowed());
    }

    @Test
    @DisplayName("A trainer's off switch stops new chats from members")
    void trainerNotAccepting() {
        trainer.setAcceptsMemberMessages(false);
        Verdict v = policy.canMemberStart(member, trainer, NOW);
        assertFalse(v.allowed());
        assertEquals(NOT_ACCEPTING, v.code());
    }

    @Test
    @DisplayName("Staff without app access, who left, or at another branch can't be messaged")
    void unreachableStaff() {
        trainer.setAppAccessEnabled(false);
        assertEquals(STAFF_UNAVAILABLE, policy.canMemberStart(member, trainer, NOW).code());

        trainer.setAppAccessEnabled(true);
        trainer.setStatus("inactive");
        assertEquals(STAFF_UNAVAILABLE, policy.canMemberStart(member, trainer, NOW).code());

        trainer.setStatus("active");
        when(staffBranchRepository.existsByStaffIdAndBranchId(12L, BRANCH)).thenReturn(false);
        assertEquals(STAFF_UNAVAILABLE, policy.canMemberStart(member, trainer, NOW).code());
    }

    @Test
    @DisplayName("Minors, chat-banned members and lapsed memberships can't start chats")
    void memberStates() {
        member.setIsMinor(true);
        assertEquals(MINOR, policy.canMemberStart(member, null, NOW).code());

        member.setIsMinor(false);
        member.setChatBannedAt(NOW.minusDays(1));
        assertEquals(CHAT_BANNED, policy.canMemberStart(member, null, NOW).code());

        member.setChatBannedAt(null);
        member.setMembershipStatus("expired");
        assertEquals(MEMBERSHIP_INACTIVE, policy.canMemberStart(member, null, NOW).code());
    }

    @Test
    @DisplayName("A member's daily cap applies across all their chats")
    void memberDailyCap() {
        when(messageRepository.countMemberMessagesSince(eq(40L), any())).thenReturn((long) MEMBER_DAILY_MESSAGES);
        assertEquals(DAILY_LIMIT, policy.canMemberStart(member, trainer, NOW).code());
    }

    @Test
    @DisplayName("Staff can start a chat with an active member of their branch")
    void staffStartsChat() {
        assertTrue(policy.canStaffStart(trainer, member, BRANCH, NOW).allowed());
    }

    @Test
    @DisplayName("A member's opt-out stops staff starting chats")
    void memberOptedOut() {
        member.setAllowStaffChats(false);
        assertEquals(MEMBER_OPTED_OUT, policy.canStaffStart(trainer, member, BRANCH, NOW).code());
    }

    @Test
    @DisplayName("Staff can't start chats with members of other branches, minors or lapsed members")
    void staffStartRefusals() {
        member.setBranchId(99L);
        assertEquals(MEMBER_UNAVAILABLE, policy.canStaffStart(trainer, member, BRANCH, NOW).code());

        member.setBranchId(BRANCH);
        member.setIsMinor(true);
        assertEquals(MEMBER_UNAVAILABLE, policy.canStaffStart(trainer, member, BRANCH, NOW).code());

        member.setIsMinor(false);
        when(staffBranchRepository.existsByStaffIdAndBranchId(12L, BRANCH)).thenReturn(false);
        assertEquals(NOT_AT_BRANCH, policy.canStaffStart(trainer, member, BRANCH, NOW).code());
    }

    @Test
    @DisplayName("Staff have a daily cap on new conversations")
    void staffDailyCap() {
        when(conversationRepository.countByStartedByStaffIdAndCreatedAtGreaterThanEqual(eq(12L), any()))
                .thenReturn((long) STAFF_DAILY_NEW_CONVERSATIONS);
        assertEquals(DAILY_LIMIT, policy.canStaffStart(trainer, member, BRANCH, NOW).code());
    }

    // ── Sending ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("At most 3 messages in a row from either side without a reply")
    void unansweredCap() {
        thread.setLastSender(Conversation.MEMBER);
        thread.setTrailingCount(MAX_UNANSWERED - 1);
        assertTrue(policy.canMemberSend(member, thread, trainer, NOW).allowed());

        thread.setTrailingCount(MAX_UNANSWERED);
        assertEquals(UNANSWERED_LIMIT, policy.canMemberSend(member, thread, trainer, NOW).code());
        // The other side can still answer
        assertTrue(policy.canStaffSend(member, thread).allowed());

        thread.setLastSender(Conversation.STAFF);
        assertEquals(UNANSWERED_LIMIT, policy.canStaffSend(member, thread).code());
        assertTrue(policy.canMemberSend(member, thread, trainer, NOW).allowed());
    }

    @Test
    @DisplayName("The off switch doesn't stop an existing conversation")
    void switchOffKeepsExistingThread() {
        trainer.setAcceptsMemberMessages(false);
        assertTrue(policy.canMemberSend(member, thread, trainer, NOW).allowed());
    }

    @Test
    @DisplayName("A mute stops the member until it runs out")
    void mute() {
        thread.setMutedUntil(NOW.plusDays(MUTE_DAYS));
        assertEquals(MUTED, policy.canMemberSend(member, thread, trainer, NOW).code());
        assertTrue(policy.canMemberSend(member, thread, trainer, NOW.plusDays(MUTE_DAYS + 1)).allowed());
    }

    @Test
    @DisplayName("A member's block stops staff; the member must unblock to send")
    void memberBlock() {
        thread.setBlockedByMemberAt(NOW);
        assertEquals(BLOCKED_BY_MEMBER, policy.canStaffSend(member, thread).code());
        assertEquals(BLOCKED_BY_YOU, policy.canMemberSend(member, thread, trainer, NOW).code());
    }

    @Test
    @DisplayName("An admin block closes the conversation for both sides")
    void adminBlock() {
        thread.setBlockedByAdminAt(NOW);
        assertEquals(BLOCKED, policy.canMemberSend(member, thread, trainer, NOW).code());
        assertEquals(BLOCKED, policy.canStaffSend(member, thread).code());
    }

    @Test
    @DisplayName("A thread with staff who left is read-only for the member; the front desk never is")
    void staffLeft() {
        trainer.setStatus("inactive");
        assertEquals(STAFF_UNAVAILABLE, policy.canMemberSend(member, thread, trainer, NOW).code());

        thread.setStaffId(null);
        assertTrue(policy.canMemberSend(member, thread, null, NOW).allowed());
    }

    @Test
    @DisplayName("Staff can't send to a member whose membership lapsed")
    void lapsedMemberReadOnlyForStaff() {
        member.setMembershipStatus("expired");
        assertEquals(MEMBER_UNAVAILABLE, policy.canStaffSend(member, thread).code());
    }

    @Test
    @DisplayName("Refusals throw a 409 with the message")
    void orThrow() {
        thread.setBlockedByAdminAt(NOW);
        BusinessRuleViolationException e = assertThrows(BusinessRuleViolationException.class,
                () -> policy.canStaffSend(member, thread).orThrow());
        assertTrue(e.getMessage().contains("closed by the gym"));
    }

    // ── Visibility ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("A lapsed member still reads their chats for 30 days")
    void readOnlyWindow() {
        member.setMembershipStatus("expired");
        member.setExpiryDate(NOW.minusDays(READ_ONLY_DAYS - 1));
        assertTrue(policy.memberCanSee(member, NOW));

        member.setExpiryDate(NOW.minusDays(READ_ONLY_DAYS + 1));
        assertFalse(policy.memberCanSee(member, NOW));
    }

    // ── Team list ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("Team cards: member refusal wins, then app access, then the switch unless a thread exists")
    void teamCards() {
        Verdict ok = policy.canMemberStart(member, null, NOW);
        assertTrue(policy.teamCardVerdict(ok, trainer, false).allowed());

        trainer.setAcceptsMemberMessages(false);
        assertEquals(NOT_ACCEPTING, policy.teamCardVerdict(ok, trainer, false).code());
        assertTrue(policy.teamCardVerdict(ok, trainer, true).allowed());

        trainer.setUserId(null);
        assertEquals(STAFF_UNAVAILABLE, policy.teamCardVerdict(ok, trainer, true).code());

        member.setIsMinor(true);
        Verdict minor = policy.canMemberStart(member, null, NOW);
        assertEquals(MINOR, policy.teamCardVerdict(minor, trainer, true).code());
    }

    @Test
    @DisplayName("Staff member list: matches canStaffStart, and an existing thread is always openable")
    void staffDirectory() {
        Verdict ok = policy.staffStartLevel(trainer, BRANCH, NOW);
        assertTrue(ok.allowed());
        assertTrue(policy.staffDirectoryVerdict(ok, member, BRANCH, false).allowed());

        member.setAllowStaffChats(false);
        assertEquals(MEMBER_OPTED_OUT, policy.staffDirectoryVerdict(ok, member, BRANCH, false).code());
        assertEquals(policy.canStaffStart(trainer, member, BRANCH, NOW).code(),
                policy.staffDirectoryVerdict(ok, member, BRANCH, false).code());
        assertTrue(policy.staffDirectoryVerdict(ok, member, BRANCH, true).allowed());

        member.setIsMinor(true);
        assertEquals(MEMBER_UNAVAILABLE, policy.staffDirectoryVerdict(ok, member, BRANCH, false).code());

        when(conversationRepository.countByStartedByStaffIdAndCreatedAtGreaterThanEqual(eq(12L), any()))
                .thenReturn((long) STAFF_DAILY_NEW_CONVERSATIONS);
        Verdict capped = policy.staffStartLevel(trainer, BRANCH, NOW);
        assertEquals(DAILY_LIMIT, capped.code());
        assertEquals(DAILY_LIMIT, policy.staffDirectoryVerdict(capped, member, BRANCH, false).code());
        assertTrue(policy.staffDirectoryVerdict(capped, member, BRANCH, true).allowed());
    }

    // ── Who's who ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("Trainers, coaches and instructors don't work the front desk")
    void deskStaff() {
        assertFalse(isDeskStaff(trainer));
        trainer.setRole("Yoga Coach");
        assertFalse(isDeskStaff(trainer));
        trainer.setRole("Receptionist");
        assertTrue(isDeskStaff(trainer));
        trainer.setRole(null);
        assertTrue(isDeskStaff(trainer));
    }

    // ── Quiet hours ─────────────────────────────────────────────────────────

    private static StaffScheduleSlot slot(Staff staff, String day, String name) {
        StaffScheduleSlot s = new StaffScheduleSlot();
        s.setStaff(staff);
        s.setDay(day);
        s.setSlot(name);
        return s;
    }

    @Test
    @DisplayName("No schedule = on duty 6am–10pm")
    void defaultHours() {
        assertTrue(isOnDuty(trainer, NOW));
        assertFalse(isOnDuty(trainer, NOW.withHour(23)));
        assertFalse(isOnDuty(trainer, NOW.withHour(5)));
    }

    @Test
    @DisplayName("Schedule slots decide duty, per weekday")
    void scheduledHours() {
        trainer.getScheduleSlots().add(slot(trainer, "Wednesday", "Evening (5pm–10pm)"));
        assertFalse(isOnDuty(trainer, NOW));                 // Wed 10:00
        assertTrue(isOnDuty(trainer, NOW.withHour(18)));     // Wed 18:00
        assertFalse(isOnDuty(trainer, NOW.plusDays(1).withHour(18))); // Thu 18:00

        trainer.getScheduleSlots().add(slot(trainer, "Thu", "Morning (6am–12pm)"));
        assertTrue(isOnDuty(trainer, NOW.plusDays(1)));      // Thu 10:00
    }

    // ── Contact details ─────────────────────────────────────────────────────

    @Test
    @DisplayName("Phone numbers, emails and links are hidden")
    void masking() {
        assertEquals("Call me on " + HIDDEN, maskContactDetails("Call me on +91 98765 43210").text());
        assertEquals("Mail " + HIDDEN + " please", maskContactDetails("Mail sarah.j@gmail.com please").text());
        assertEquals("See " + HIDDEN, maskContactDetails("See https://example.com/plan").text());
        assertEquals("Try " + HIDDEN, maskContactDetails("Try wa.me").text());
        assertEquals("DM " + HIDDEN, maskContactDetails("DM www.instagram.com/arjun").text());
        assertTrue(maskContactDetails("ping 98765-43210").changed());
    }

    @Test
    @DisplayName("Ordinary gym talk is left alone")
    void noFalsePositives() {
        for (String text : new String[]{
                "See you at 6:30 tomorrow",
                "The plan is 1500 for 3 months",
                "Did 3x12 at 40kg, then 5 km on the treadmill",
                "Session moved to 17.30. Thanks!"}) {
            ConversationPolicyService.Masked m = maskContactDetails(text);
            assertFalse(m.changed(), text);
            assertEquals(text, m.text());
        }
    }
}
