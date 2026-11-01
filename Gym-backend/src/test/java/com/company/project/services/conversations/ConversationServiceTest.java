package com.company.project.services.conversations;

import com.company.project.dto.conversations.ConversationMessageDTO;
import com.company.project.dto.conversations.ConversationRequestDTO;
import com.company.project.entities.*;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.*;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.UserDetailsImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConversationServiceTest {

    private static final Long BRANCH = 7L;

    @Mock private ConversationRepository conversationRepository;
    @Mock private ConversationMessageRepository messageRepository;
    @Mock private ConversationReportRepository reportRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private StaffRepository staffRepository;
    @Mock private StaffBranchRepository staffBranchRepository;
    @Mock private ConversationNotifier notifier;

    private ConversationService service;

    private Member member;
    private Staff trainer;
    private Staff receptionist;
    private Conversation trainerThread;
    private Conversation deskThread;

    private final UserDetailsImpl memberUser = principal(500L);
    private final UserDetailsImpl trainerUser = principal(900L);
    private final UserDetailsImpl receptionistUser = principal(901L);

    private static UserDetailsImpl principal(Long userId) {
        return new UserDetailsImpl(userId, "u" + userId, null, "x", Collections.emptyList(), true);
    }

    private static Staff staff(Long id, Long userId, String role) {
        Staff s = new Staff();
        s.setId(id);
        s.setName(role + " " + id);
        s.setRole(role);
        s.setStatus("active");
        s.setAppAccessEnabled(true);
        s.setUserId(userId);
        return s;
    }

    private static Conversation thread(Long id, Long staffId) {
        Conversation c = new Conversation();
        c.setId(id);
        c.setBranchId(BRANCH);
        c.setMemberId(40L);
        c.setStaffId(staffId);
        c.setStartedBy(Conversation.MEMBER);
        c.setLastMessageAt(LocalDateTime.now().minusHours(1));
        return c;
    }

    @BeforeEach
    void setUp() {
        ConversationPolicyService policy = new ConversationPolicyService(
                staffBranchRepository, conversationRepository, messageRepository);
        service = new ConversationService(conversationRepository, messageRepository, reportRepository,
                memberRepository, staffRepository, staffBranchRepository, policy, notifier);
        BranchContextHolder.setActiveBranchId(BRANCH);

        member = new Member();
        member.setId(40L);
        member.setName("Sarah Johnson");
        member.setBranchId(BRANCH);
        member.setMembershipStatus("active");
        member.setExpiryDate(LocalDateTime.now().plusMonths(1));

        trainer = staff(12L, 900L, "Trainer");
        receptionist = staff(13L, 901L, "Receptionist");
        trainerThread = thread(1L, 12L);
        deskThread = thread(2L, null);

        lenient().when(memberRepository.findByUserId(500L)).thenReturn(Optional.of(member));
        lenient().when(memberRepository.findById(40L)).thenReturn(Optional.of(member));
        lenient().when(staffRepository.findByUserId(900L)).thenReturn(Optional.of(trainer));
        lenient().when(staffRepository.findByUserId(901L)).thenReturn(Optional.of(receptionist));
        lenient().when(staffRepository.findById(12L)).thenReturn(Optional.of(trainer));
        lenient().when(staffBranchRepository.existsByStaffIdAndBranchId(anyLong(), eq(BRANCH))).thenReturn(true);
        for (Conversation c : new Conversation[]{trainerThread, deskThread}) {
            lenient().when(conversationRepository.findById(c.getId())).thenReturn(Optional.of(c));
            lenient().when(conversationRepository.findByIdForUpdate(c.getId())).thenReturn(Optional.of(c));
        }
        lenient().when(messageRepository.save(any())).thenAnswer(inv -> {
            ConversationMessage m = inv.getArgument(0);
            if (m.getId() == null) m.setId(77L);
            return m;
        });
    }

    @AfterEach
    void tearDown() {
        BranchContextHolder.clear();
    }

    private static ConversationRequestDTO body(String text) {
        return new ConversationRequestDTO(null, null, text, null, null);
    }

    private static ConversationMessage message(Long id, Long conversationId, String senderType) {
        ConversationMessage m = new ConversationMessage();
        m.setId(id);
        m.setConversationId(conversationId);
        m.setSenderType(senderType);
        m.setBody("hi");
        return m;
    }

    @Test
    @DisplayName("A member's message is masked, the original kept for reports, and the counters move")
    void memberSendMasks() {
        ConversationMessageDTO dto = service.memberSend(memberUser, 1L, body("Call me on 98765 43210"));

        ArgumentCaptor<ConversationMessage> saved = ArgumentCaptor.forClass(ConversationMessage.class);
        verify(messageRepository).save(saved.capture());
        assertEquals("Call me on " + ConversationPolicyService.HIDDEN, saved.getValue().getBody());
        assertEquals("Call me on 98765 43210", saved.getValue().getOriginalBody());

        assertTrue(dto.mine());
        assertTrue(dto.masked());
        assertNull(dto.originalBody(), "The unmasked text is for admins only");

        assertEquals(1, trainerThread.getStaffUnread());
        assertEquals(Conversation.MEMBER, trainerThread.getLastSender());
        assertEquals(1, trainerThread.getTrailingCount());
        verify(notifier).memberMessaged(eq(trainerThread), eq(member), eq(trainer), anyString(), any());
    }

    @Test
    @DisplayName("Empty and over-long messages are refused")
    void bodyValidation() {
        assertThrows(IllegalArgumentException.class, () -> service.memberSend(memberUser, 1L, body("   ")));
        String tooLong = "a".repeat(ConversationPolicyService.MAX_BODY_LENGTH + 1);
        assertThrows(IllegalArgumentException.class, () -> service.memberSend(memberUser, 1L, body(tooLong)));
    }

    @Test
    @DisplayName("A staff reply resets the unanswered count and clears a held push")
    void staffReply() {
        trainerThread.setLastSender(Conversation.MEMBER);
        trainerThread.setTrailingCount(3);
        trainerThread.setStaffPushPendingSince(LocalDateTime.now().minusHours(8));

        service.staffSend(trainerUser, 1L, body("See you at 6"));

        assertEquals(Conversation.STAFF, trainerThread.getLastSender());
        assertEquals(1, trainerThread.getTrailingCount());
        assertEquals(1, trainerThread.getMemberUnread());
        assertNull(trainerThread.getStaffPushPendingSince());
        verify(notifier).staffMessaged(eq(trainerThread), eq(trainer), anyString());
    }

    @Test
    @DisplayName("Trainers don't see the front desk; desk staff do")
    void frontDeskAccess() {
        assertThrows(EntityNotFoundException.class, () -> service.staffGet(trainerUser, 2L));
        assertNotNull(service.staffGet(receptionistUser, 2L));
    }

    @Test
    @DisplayName("Staff can't open another staff member's conversation")
    void otherStaffThread() {
        assertThrows(EntityNotFoundException.class, () -> service.staffGet(receptionistUser, 1L));
    }

    @Test
    @DisplayName("Staff can't open a conversation from another branch")
    void otherBranch() {
        trainerThread.setBranchId(99L);
        assertThrows(EntityNotFoundException.class, () -> service.staffGet(trainerUser, 1L));
    }

    @Test
    @DisplayName("A member can't open someone else's conversation")
    void otherMember() {
        trainerThread.setMemberId(41L);
        assertThrows(EntityNotFoundException.class, () -> service.memberGet(memberUser, 1L));
    }

    @Test
    @DisplayName("Reporting: only the other side's messages, once, and admins hear about it")
    void report() {
        when(messageRepository.findById(5L)).thenReturn(Optional.of(message(5L, 1L, Conversation.MEMBER)));
        assertThrows(BusinessRuleViolationException.class,
                () -> service.memberReport(memberUser, 1L, 5L, new ConversationRequestDTO(null, null, null, "SPAM", null)));

        when(messageRepository.findById(6L)).thenReturn(Optional.of(message(6L, 1L, Conversation.STAFF)));
        assertThrows(IllegalArgumentException.class,
                () -> service.memberReport(memberUser, 1L, 6L, new ConversationRequestDTO(null, null, null, "RUDE", null)));

        when(reportRepository.saveAndFlush(any())).thenAnswer(inv -> {
            ConversationReport r = inv.getArgument(0);
            r.setId(3L);
            return r;
        });
        service.memberReport(memberUser, 1L, 6L, new ConversationRequestDTO(null, null, null, "harassment", "late at night"));
        ArgumentCaptor<ConversationReport> saved = ArgumentCaptor.forClass(ConversationReport.class);
        verify(reportRepository).saveAndFlush(saved.capture());
        assertEquals("HARASSMENT", saved.getValue().getReason());
        assertEquals(BRANCH, saved.getValue().getBranchId());
        verify(notifier).reportFiled(3L, "Sarah Johnson", "HARASSMENT");

        when(reportRepository.existsByMessageIdAndReportedByTypeAndReportedByIdAndStatus(
                6L, Conversation.MEMBER, 40L, ConversationReport.OPEN)).thenReturn(true);
        assertThrows(BusinessRuleViolationException.class,
                () -> service.memberReport(memberUser, 1L, 6L, new ConversationRequestDTO(null, null, null, "SPAM", null)));
    }

    @Test
    @DisplayName("A message from another conversation can't be reported or deleted through this one")
    void messageFromAnotherThread() {
        when(messageRepository.findById(8L)).thenReturn(Optional.of(message(8L, 2L, Conversation.STAFF)));
        assertThrows(EntityNotFoundException.class,
                () -> service.memberReport(memberUser, 1L, 8L, new ConversationRequestDTO(null, null, null, "SPAM", null)));
        assertThrows(EntityNotFoundException.class, () -> service.memberDelete(memberUser, 1L, 8L));
    }

    @Test
    @DisplayName("Members delete only their own messages; the row stays")
    void delete() {
        when(messageRepository.findById(6L)).thenReturn(Optional.of(message(6L, 1L, Conversation.STAFF)));
        assertThrows(BusinessRuleViolationException.class, () -> service.memberDelete(memberUser, 1L, 6L));

        ConversationMessage own = message(5L, 1L, Conversation.MEMBER);
        when(messageRepository.findById(5L)).thenReturn(Optional.of(own));
        when(messageRepository.findPage(eq(1L), isNull(), any())).thenReturn(java.util.List.of(own));
        service.memberDelete(memberUser, 1L, 5L);
        assertNotNull(own.getDeletedAt());
        verify(messageRepository, never()).delete(any());
        assertEquals("Message deleted", trainerThread.getLastMessagePreview());
    }

    @Test
    @DisplayName("The front desk can't be blocked; a staff member can, and admins hear about it")
    void block() {
        assertThrows(BusinessRuleViolationException.class, () -> service.memberBlock(memberUser, 2L, true));

        service.memberBlock(memberUser, 1L, true);
        assertNotNull(trainerThread.getBlockedByMemberAt());
        verify(notifier).memberBlocked(trainerThread, member, trainer);

        service.memberBlock(memberUser, 1L, false);
        assertNull(trainerThread.getBlockedByMemberAt());
    }

    @Test
    @DisplayName("Sending past the unanswered cap is refused before anything is saved")
    void capRefusedBeforeSave() {
        trainerThread.setLastSender(Conversation.MEMBER);
        trainerThread.setTrailingCount(ConversationPolicyService.MAX_UNANSWERED);
        assertThrows(BusinessRuleViolationException.class, () -> service.memberSend(memberUser, 1L, body("hello?")));
        verify(messageRepository, never()).save(any());
    }
}
