import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as Clipboard from 'expo-clipboard';
import { Text } from '@/shared/components/AppText';
import { AppBottomSheet, ConfirmationModal, Loader } from '@/shared/components';
import { Avatar } from '@/shared/components/Avatar';
import { toast } from '@/shared/components/Toasts/toastStore';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { formatDate } from '@/core/i18n';
import {
  avatarColor,
  initialsOf,
  type ChatMessage,
  type ChatSide,
  type ChatTarget,
} from '../../domain/types';
import {
  useChatLookup,
  useChatMessages,
  useConversation,
  useDeleteChatMessage,
  useMarkChatRead,
  useReportChatMessage,
  useSendChatMessage,
  useSetChatBlocked,
  useSetChatMuted,
} from '../../hooks/useConversations';
import { chatAccent, isSameDay, parseChatDate, refusalText } from '../chatUi';
import { MessageBubble } from '../components/MessageBubble';
import { ChatComposer } from '../components/ChatComposer';
import { ReportMessageSheet } from '../components/ReportMessageSheet';
import { ChatRulesSheet, useChatRules } from '../components/ChatRulesSheet';

export interface ChatScreenProps {
  side: ChatSide;
  target: ChatTarget;
  /** '(member)' / '(staff)' / '(trainer)': picks the accent colour. */
  roleGroup: string;
  /** Shown until the conversation itself loads (e.g. from the card that opened it). */
  fallbackName?: string;
  fallbackPhotoUrl?: string;
  onBack: () => void;
}

type Confirm = 'delete' | 'block' | 'mute' | null;

/** One member ↔ staff conversation, for either app. With no thread yet, the first message starts it. */
export function ChatScreen({ side, target, roleGroup, fallbackName, fallbackPhotoUrl, onBack }: ChatScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { accent, onAccent, tint } = chatAccent(roleGroup);

  const lookup = useChatLookup(side, target);
  // Set once the first message creates the conversation.
  const [startedId, setStartedId] = useState<number | null>(null);
  const conversationId =
    target.kind === 'conversation' ? target.conversationId : startedId ?? lookup.data?.conversation?.id ?? null;

  const detail = useConversation(side, conversationId);
  const conversation = detail.data ?? (lookup.data?.conversation?.id === conversationId ? lookup.data?.conversation : null) ?? null;
  const messagesQuery = useChatMessages(side, conversationId);
  const messages = useMemo(() => messagesQuery.data?.pages.flat() ?? [], [messagesQuery.data]);

  const send = useSendChatMessage(side, target, conversationId);
  const markRead = useMarkChatRead(side);
  const deleteMessage = useDeleteChatMessage(side, conversationId ?? 0);
  const report = useReportChatMessage(side, conversationId ?? 0);
  const setBlocked = useSetChatBlocked(conversationId ?? 0);
  const setMuted = useSetChatMuted(conversationId ?? 0);

  const [selected, setSelected] = useState<ChatMessage | null>(null);
  const [reporting, setReporting] = useState<ChatMessage | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // First chat on this device: explain the rules before anything is sent.
  const rules = useChatRules(side);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [pendingDelete, setPendingDelete] = useState<ChatMessage | null>(null);

  // ── Who it's with ─────────────────────────────────────────────────────
  const frontDesk = target.kind === 'frontDesk' || !!conversation?.frontDesk;
  const other = side === 'member' ? conversation?.staff : conversation?.member;
  const isMemberFrontDesk = side === 'member' && frontDesk;
  const name = isMemberFrontDesk ? t('conversations.frontDesk') : other?.name ?? fallbackName ?? '';
  const photoUrl = isMemberFrontDesk ? undefined : other?.photoUrl ?? fallbackPhotoUrl;
  const avatarId = other?.id ?? (target.kind === 'staff' ? target.staffId : target.kind === 'member' ? target.memberId : 0);
  const subtitle = isMemberFrontDesk
    ? t('conversations.frontDeskDesc')
    : side === 'member'
      ? other?.role ?? ''
      : [
          other?.memberCode ? t('conversations.chat.memberCode', { code: other.memberCode }) : null,
          frontDesk ? t('conversations.chat.viaFrontDesk') : null,
        ].filter(Boolean).join(' · ');

  // ── Can I send? ───────────────────────────────────────────────────────
  const ready = conversationId != null ? !!conversation : !!lookup.data;
  let disabledReason: string | null = null;
  if (conversation && !conversation.canSend) {
    disabledReason = refusalText(t, side, conversation.cannotSendCode, conversation.cannotSendMessage, name);
  } else if (!conversation && lookup.data && !lookup.data.canStart) {
    disabledReason = refusalText(t, side, lookup.data.cannotStartCode, lookup.data.cannotStartMessage, name);
  }

  // ── Read receipts: clear the unread count while the chat is open ─────
  const newestId = messages[0]?.id;
  const unread = conversation?.unread ?? 0;
  const { mutate: markReadMutate } = markRead;
  useEffect(() => {
    if (conversationId != null && unread > 0) markReadMutate(conversationId);
  }, [conversationId, unread, newestId, markReadMutate]);

  // ── Actions ───────────────────────────────────────────────────────────
  const onSend = useCallback(async (text: string) => {
    try {
      const result = await send.mutateAsync(text);
      if (result.conversation) setStartedId(result.conversation.id);
      return true;
    } catch {
      // The API client has already shown the reason (e.g. the unanswered cap).
      return false;
    }
  }, [send]);

  const mySenderType = side === 'member' ? 'MEMBER' : 'STAFF';
  const canReport = (m: ChatMessage) => !m.deleted && m.senderType !== mySenderType;

  const onLongPress = useCallback((m: ChatMessage) => setSelected(m), []);

  const copySelected = async () => {
    const body = selected?.body;
    setSelected(null);
    if (body) await Clipboard.setStringAsync(body);
  };

  const confirmDelete = () => {
    setPendingDelete(selected);
    setSelected(null);
    setConfirm('delete');
  };

  const toggleBlocked = async () => {
    if (!conversation) return;
    const blocked = !conversation.blockedByMember;
    await setBlocked.mutateAsync(blocked);
    toast.success(t(blocked ? 'conversations.actions.blocked' : 'conversations.actions.unblocked'));
  };

  const toggleMuted = async () => {
    if (!conversation) return;
    const muted = !conversation.mutedUntil;
    await setMuted.mutateAsync(muted);
    toast.success(t(muted ? 'conversations.actions.muted' : 'conversations.actions.unmuted'));
  };

  /** Runs an action, leaving error reporting to the API client's toast. */
  const quietly = (action: () => Promise<unknown>) => action().catch(() => undefined);

  const closeConfirm = () => {
    setConfirm(null);
    setPendingDelete(null);
  };

  const runConfirm = async () => {
    if (confirm === 'delete' && pendingDelete) await quietly(() => deleteMessage.mutateAsync(pendingDelete.id));
    else if (confirm === 'block') await quietly(toggleBlocked);
    else if (confirm === 'mute') await quietly(toggleMuted);
    closeConfirm();
  };

  const submitReport = async (reason: Parameters<typeof report.mutateAsync>[0]['reason'], details: string) => {
    if (!reporting) return;
    try {
      await report.mutateAsync({ messageId: reporting.id, reason, details });
      setReporting(null);
      toast.success(t('conversations.report.sent'));
    } catch {
      // Already toasted (e.g. "You've already reported this message.").
    }
  };

  // Blocking / muting asks first; lifting one is harmless and happens straight away.
  const fromMenu = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };
  const menuItems: { key: string; label: string; icon: keyof typeof Feather.glyphMap; danger?: boolean; onPress: () => void }[] = [];
  if (conversation && side === 'member' && !conversation.frontDesk) {
    menuItems.push(conversation.blockedByMember
      ? { key: 'unblock', label: t('conversations.actions.unblock'), icon: 'unlock', onPress: fromMenu(() => quietly(toggleBlocked)) }
      : { key: 'block', label: t('conversations.actions.block'), icon: 'slash', danger: true, onPress: fromMenu(() => setConfirm('block')) });
  }
  if (conversation && side === 'staff') {
    menuItems.push(conversation.mutedUntil
      ? { key: 'unmute', label: t('conversations.actions.unmute'), icon: 'volume-2', onPress: fromMenu(() => quietly(toggleMuted)) }
      : { key: 'mute', label: t('conversations.actions.mute'), icon: 'volume-x', danger: true, onPress: fromMenu(() => setConfirm('mute')) });
  }
  menuItems.push({ key: 'rules', label: t('conversations.rules.title'), icon: 'info', onPress: fromMenu(rules.open) });

  // ── Banner under the header ───────────────────────────────────────────
  let banner: { icon: keyof typeof Feather.glyphMap; text: string } | null = null;
  if (side === 'member' && conversation?.recipientOnDuty === false && conversation.canSend) {
    banner = { icon: 'moon', text: t(frontDesk ? 'conversations.chat.frontDeskOffShift' : 'conversations.chat.offShift') };
  } else if (side === 'staff' && conversation?.mutedUntil) {
    const until = parseChatDate(conversation.mutedUntil);
    banner = { icon: 'volume-x', text: t('conversations.chat.mutedUntil', { date: until ? formatDate(until, 'PP p') : '' }) };
  }

  const failed = (target.kind !== 'conversation' && lookup.isError) || (conversationId != null && detail.isError && !conversation);
  const loading = !failed && (!ready || (conversationId != null && messagesQuery.isLoading));

  const renderItem = useCallback(({ item, index }: { item: ChatMessage; index: number }) => {
    const older = messages[index + 1];
    const showDay = !older || !isSameDay(item.createdAt, older.createdAt);
    const showSenderName = frontDesk && item.senderType === 'STAFF' && (side === 'staff' || !item.mine);
    return (
      <MessageBubble
        message={item}
        accent={accent}
        onAccent={onAccent}
        showDay={showDay}
        showSenderName={showSenderName}
        onLongPress={onLongPress}
      />
    );
  }, [messages, frontDesk, side, accent, onAccent, onLongPress]);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <Pressable
          onPress={onBack}
          hitSlop={8}
          style={({ pressed }) => [styles.round, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t('conversations.back')}
        >
          <Feather name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'} size={22} color={BrandColors.textPrimary} />
        </Pressable>
        {isMemberFrontDesk ? (
          <View style={[styles.deskAvatar, { backgroundColor: tint }]}>
            <Feather name="headphones" size={18} color={BrandColors.textPrimary} />
          </View>
        ) : (
          <Avatar size={40} initials={initialsOf(name)} imageUrl={photoUrl} backgroundColor={avatarColor(avatarId)} />
        )}
        <View style={styles.headerText}>
          <Text style={styles.headerName} numberOfLines={1} accessibilityRole="header">{name}</Text>
          {!!subtitle && <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text>}
        </View>
        {menuItems.length > 0 && (
          <Pressable
            onPress={() => setMenuOpen(true)}
            hitSlop={8}
            style={({ pressed }) => [styles.round, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t('conversations.chat.menu')}
          >
            <Feather name="more-vertical" size={20} color={BrandColors.textPrimary} />
          </Pressable>
        )}
      </View>

      {banner && (
        <View style={[styles.banner, { backgroundColor: tint }]}>
          <Feather name={banner.icon} size={14} color={BrandColors.textPrimary} />
          <Text style={styles.bannerText}>{banner.text}</Text>
        </View>
      )}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {failed ? (
          <View style={styles.center}>
            <Text style={styles.muted}>{t('conversations.loadFailed')}</Text>
            <Pressable
              onPress={() => (conversationId != null ? detail.refetch() : lookup.refetch())}
              style={[styles.retry, { backgroundColor: accent }]}
              accessibilityRole="button"
            >
              <Text style={[styles.retryText, { color: onAccent }]}>{t('conversations.retry')}</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={styles.center}><Loader /></View>
        ) : messages.length === 0 ? (
          <View style={styles.center}>
            <View style={[styles.emptyIcon, { backgroundColor: tint }]}>
              <Feather name="message-circle" size={26} color={BrandColors.textPrimary} />
            </View>
            <Text style={styles.muted}>
              {t(isMemberFrontDesk ? 'conversations.chat.emptyFrontDesk' : 'conversations.chat.empty')}
            </Text>
          </View>
        ) : (
          <FlatList
            inverted
            data={messages}
            keyExtractor={(m) => String(m.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onEndReached={() => {
              if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) messagesQuery.fetchNextPage();
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={messagesQuery.isFetchingNextPage ? (
              <View style={styles.older}>
                <ActivityIndicator size="small" color={BrandColors.textSecondary} />
              </View>
            ) : null}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          />
        )}

        {!failed && (
          <ChatComposer
            accent={accent}
            onAccent={onAccent}
            disabledReason={ready ? disabledReason : null}
            sending={send.isPending || !ready}
            onSend={onSend}
            bottomInset={insets.bottom}
          />
        )}
      </KeyboardAvoidingView>

      {/* Long-press on a message */}
      <AppBottomSheet visible={!!selected} title={t('conversations.actions.title')} onClose={() => setSelected(null)}>
        <View style={styles.sheetList}>
          {!!selected?.body && (
            <SheetRow icon="copy" label={t('conversations.actions.copy')} onPress={copySelected} />
          )}
          {selected?.mine && (
            <SheetRow icon="trash-2" danger label={t('conversations.actions.delete')} onPress={confirmDelete} />
          )}
          {selected && canReport(selected) && (
            <SheetRow
              icon="flag"
              danger
              label={t('conversations.actions.report')}
              onPress={() => { setReporting(selected); setSelected(null); }}
            />
          )}
        </View>
      </AppBottomSheet>

      {/* Header menu */}
      <AppBottomSheet visible={menuOpen} title={name} onClose={() => setMenuOpen(false)}>
        <View style={styles.sheetList}>
          {menuItems.map((item) => (
            <SheetRow key={item.key} icon={item.icon} danger={item.danger} label={item.label} onPress={item.onPress} />
          ))}
        </View>
      </AppBottomSheet>

      <ChatRulesSheet
        side={side}
        isDesk={roleGroup !== '(trainer)'}
        visible={rules.visible}
        onClose={rules.close}
      />

      <ReportMessageSheet
        visible={!!reporting}
        submitting={report.isPending}
        onClose={() => setReporting(null)}
        onSubmit={submitReport}
      />

      <ConfirmationModal
        visible={confirm !== null}
        title={
          confirm === 'delete' ? t('conversations.actions.deleteConfirmTitle')
            : confirm === 'block' ? t('conversations.actions.blockConfirmTitle', { name })
              : t('conversations.actions.muteConfirmTitle', { name })
        }
        message={
          confirm === 'delete' ? t('conversations.actions.deleteConfirmBody')
            : confirm === 'block' ? t('conversations.actions.blockConfirmBody')
              : t('conversations.actions.muteConfirmBody')
        }
        confirmText={
          confirm === 'delete' ? t('conversations.actions.delete')
            : confirm === 'block' ? t('conversations.actions.block')
              : t('conversations.actions.mute')
        }
        cancelText={t('conversations.actions.cancel')}
        variant="danger"
        icon={confirm === 'delete' ? 'trash-2' : confirm === 'block' ? 'slash' : 'volume-x'}
        loading={deleteMessage.isPending || setBlocked.isPending || setMuted.isPending}
        onConfirm={runConfirm}
        onClose={closeConfirm}
      />
    </View>
  );
}

function SheetRow({ icon, label, danger, onPress }: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const color = danger ? BrandColors.danger : BrandColors.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <Feather name={icon} size={18} color={color} />
      <Text style={[styles.sheetRowText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,41,59,0.08)',
  },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  deskAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.textSecondary,
    marginTop: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
    textAlign: 'center',
  },
  retry: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
  },
  retryText: {
    fontWeight: '700',
  },
  listContent: {
    paddingVertical: Spacing.three,
  },
  older: {
    paddingVertical: Spacing.three,
  },
  sheetList: {
    gap: Spacing.one,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: 14,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.md,
  },
  sheetRowText: {
    fontSize: TypographyScale.body,
    fontWeight: '700',
  },
});
