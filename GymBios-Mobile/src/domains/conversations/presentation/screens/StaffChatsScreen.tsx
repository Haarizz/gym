import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { useRouter, useSegments, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { Text, TextInput } from '@/shared/components/AppText';
import { Loader } from '@/shared/components';
import { Avatar } from '@/shared/components/Avatar';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { MessagingFlowHeader } from '@/domains/messaging/presentation/components/MessagingFlowHeader';
import { avatarColor, initialsOf, type ChatMember, type Conversation } from '../../domain/types';
import { useDebouncedValue, useStaffChatMembers, useStaffInbox } from '../../hooks/useConversations';
import { chatAccent, listTime, refusalText } from '../chatUi';
import { ChatRulesSheet, useChatRules } from '../components/ChatRulesSheet';

type Tab = 'members' | 'frontDesk';

type Row =
  | { kind: 'conversation'; conversation: Conversation }
  | { kind: 'member'; member: ChatMember };

/** Mirrors the backend's list cap: past this, the hint says to search. */
const MEMBER_LIST_LIMIT = 100;

function matches(q: string, ...values: (string | null | undefined)[]): boolean {
  return !q || values.some((v) => !!v && v.toLowerCase().includes(q));
}

/**
 * Staff and trainer chats: their own conversations first, then every member of the
 * branch they could start one with. Staff (not trainers) also see the shared front desk.
 */
export function StaffChatsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const segments = useSegments();
  const roleGroup = (segments[0] as string) || '(staff)';
  const isDesk = roleGroup !== '(trainer)';
  const { accent, onAccent } = chatAccent(roleGroup);

  const rules = useChatRules('staff');
  const [tab, setTab] = useState<Tab>('members');
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const q = search.trim().toLowerCase();

  const mine = useStaffInbox('mine');
  const desk = useStaffInbox('front_desk', isDesk);
  const directory = useStaffChatMembers(debounced);

  const deskUnread = (desk.data ?? []).reduce((sum, c) => sum + c.unread, 0);

  const sections = useMemo(() => {
    if (tab === 'frontDesk') {
      const rows: Row[] = (desk.data ?? [])
        .filter((c) => matches(q, c.member?.name, c.member?.memberCode))
        .map((conversation) => ({ kind: 'conversation', conversation }));
      return rows.length ? [{ key: 'desk', title: null as string | null, data: rows }] : [];
    }
    const recent = (mine.data ?? []).filter(
      (c) => !c.frontDesk && matches(q, c.member?.name, c.member?.memberCode),
    );
    const withThread = new Set(recent.map((c) => c.member?.id));
    const others = (directory.data ?? []).filter((m) => !withThread.has(m.id));
    const out: { key: string; title: string | null; data: Row[] }[] = [];
    if (recent.length) {
      out.push({ key: 'recent', title: t('conversations.list.recent'), data: recent.map((conversation) => ({ kind: 'conversation', conversation })) });
    }
    if (others.length) {
      out.push({ key: 'members', title: t('conversations.list.allMembers'), data: others.map((member) => ({ kind: 'member', member })) });
    }
    return out;
  }, [tab, desk.data, mine.data, directory.data, q, t]);

  const openConversation = (c: Conversation) =>
    router.push({ pathname: `/${roleGroup}/messaging/chat`, params: { conversationId: String(c.id) } } as unknown as Href);

  const openMember = (m: ChatMember) =>
    router.push({
      pathname: `/${roleGroup}/messaging/chat`,
      params: m.conversationId
        ? { conversationId: String(m.conversationId) }
        : { memberId: String(m.id), name: m.name, photoUrl: m.photoUrl ?? '' },
    } as unknown as Href);

  const active = tab === 'frontDesk' ? [desk] : [mine, directory];
  const isLoading = active.some((x) => x.isLoading);
  const isError = active.every((x) => x.isError);
  const refreshing = active.some((x) => x.isRefetching);
  const refresh = () => active.forEach((x) => x.refetch());
  const showMoreHint = tab === 'members' && (directory.data?.length ?? 0) >= MEMBER_LIST_LIMIT;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace(`/${roleGroup}/messaging` as Href));

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <MessagingFlowHeader
        title={t('conversations.list.title')}
        subtitle={t('conversations.list.subtitle')}
        showStepper={false}
        onBack={goBack}
        onInfo={rules.open}
        infoLabel={t('conversations.rules.title')}
      />

      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <Feather name="search" size={15} color={BrandColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t('conversations.list.searchPlaceholder')}
            placeholderTextColor={BrandColors.textSecondary}
            autoCorrect={false}
            returnKeyType="search"
          />
          {!!search && (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityRole="button">
              <Feather name="x" size={15} color={BrandColors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {isDesk && (
        <View style={styles.tabs}>
          {(['members', 'frontDesk'] as const).map((key) => {
            const selected = tab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[styles.tab, selected && { backgroundColor: accent }]}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.tabText, selected && { color: onAccent }]}>
                  {t(`conversations.list.tabs.${key}`)}
                </Text>
                {key === 'frontDesk' && deskUnread > 0 && (
                  <View style={[styles.badge, selected && styles.badgeOnAccent]}>
                    <Text style={styles.badgeText}>{deskUnread > 99 ? '99+' : deskUnread}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}><Loader /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{t('conversations.list.loadFailed')}</Text>
          <Pressable onPress={refresh} style={[styles.retry, { backgroundColor: accent }]} accessibilityRole="button">
            <Text style={[styles.retryText, { color: onAccent }]}>{t('conversations.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(row) => (row.kind === 'conversation' ? `c${row.conversation.id}` : `m${row.member.id}`)}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={accent} colors={[accent]} />}
          renderSectionHeader={({ section }) =>
            section.title ? <Text style={styles.sectionTitle}>{section.title}</Text> : null
          }
          renderItem={({ item }) =>
            item.kind === 'conversation' ? (
              <ConversationRow conversation={item.conversation} onPress={() => openConversation(item.conversation)} />
            ) : (
              <MemberRow member={item.member} onPress={() => openMember(item.member)} />
            )
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name={tab === 'frontDesk' ? 'headphones' : 'users'} size={28} color={BrandColors.textSecondary} />
              <Text style={styles.muted}>
                {tab === 'frontDesk'
                  ? t('conversations.list.frontDeskEmpty')
                  : q ? t('conversations.list.noResults') : t('conversations.list.noMembers')}
              </Text>
            </View>
          }
          ListFooterComponent={showMoreHint ? <Text style={styles.hint}>{t('conversations.list.moreHint')}</Text> : null}
        />
      )}
      <ChatRulesSheet side="staff" isDesk={isDesk} visible={rules.visible} onClose={rules.close} />
    </SafeAreaView>
  );
}

function ConversationRow({ conversation: c, onPress }: { conversation: Conversation; onPress: () => void }) {
  const { t } = useTranslation();
  const name = c.member?.name ?? '';
  // On the front desk the last staff message may be a colleague's, so no "You:" there.
  const preview = c.lastMessagePreview
    ? c.lastSender === 'STAFF' && !c.frontDesk ? t('conversations.list.you', { text: c.lastMessagePreview }) : c.lastMessagePreview
    : '';
  const unread = c.unread > 0;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]} accessibilityRole="button">
      <Avatar size={46} initials={initialsOf(name)} imageUrl={c.member?.photoUrl ?? undefined} backgroundColor={avatarColor(c.member?.id ?? c.id)} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
          <Text style={[styles.rowTime, unread && styles.rowTimeUnread]}>{listTime(t, c.lastMessageAt)}</Text>
        </View>
        <View style={styles.rowTop}>
          <Text style={[styles.rowSub, unread && styles.rowSubUnread]} numberOfLines={1}>{preview}</Text>
          {unread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{c.unread > 99 ? '99+' : c.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function MemberRow({ member: m, onPress }: { member: ChatMember; onPress: () => void }) {
  const { t } = useTranslation();
  const openable = m.canStart || m.conversationId != null;
  const sub = openable
    ? m.memberCode ? t('conversations.chat.memberCode', { code: m.memberCode }) : t('conversations.list.startChat')
    : refusalText(t, 'staff', m.cannotStartCode, m.cannotStartMessage, m.name);
  return (
    <Pressable
      onPress={onPress}
      disabled={!openable}
      style={({ pressed }) => [styles.row, !openable && styles.rowDisabled, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !openable }}
      accessibilityHint={openable ? undefined : sub}
    >
      <Avatar size={46} initials={initialsOf(m.name)} imageUrl={m.photoUrl ?? undefined} backgroundColor={avatarColor(m.id)} />
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>{m.name}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>{sub}</Text>
      </View>
      {openable && <Feather name="message-circle" size={18} color={BrandColors.textSecondary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  searchWrap: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: Radius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(30,41,59,0.08)',
  },
  searchInput: {
    flex: 1,
    fontSize: TypographyScale.body,
    color: BrandColors.textPrimary,
    paddingVertical: 0,
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(30,41,59,0.08)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  listContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: BrandColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: 12,
    marginTop: Spacing.two,
    borderRadius: Radius.lg,
    backgroundColor: '#FFFFFF',
  },
  rowDisabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.8,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  rowTime: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  rowTimeUnread: {
    color: BrandColors.teal,
    fontWeight: '800',
  },
  rowSub: {
    flex: 1,
    fontSize: 13,
    color: BrandColors.textSecondary,
  },
  rowSubUnread: {
    color: BrandColors.textPrimary,
    fontWeight: '700',
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.danger,
  },
  badgeOnAccent: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  muted: {
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: BrandColors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.three,
  },
  retry: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
  },
  retryText: {
    fontWeight: '700',
  },
});
