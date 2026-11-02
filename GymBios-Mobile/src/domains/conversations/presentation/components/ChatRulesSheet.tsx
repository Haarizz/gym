import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Feather from '@expo/vector-icons/Feather';
import { Text } from '@/shared/components/AppText';
import { AppBottomSheet, Button } from '@/shared/components';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { secureStorage } from '@/core/platform/storage';
import { useAuthStore } from '@/domains/auth/store/authStore';
import type { ChatSide } from '../../domain/types';

type Rule = { key: string; icon: keyof typeof Feather.glyphMap };

/** Order matters: who you can reach, how to behave, what's private, what the gym can see. */
const MEMBER_RULES: Rule[] = [
  { key: 'who', icon: 'users' },
  { key: 'appOnly', icon: 'eye-off' },
  { key: 'limits', icon: 'repeat' },
  { key: 'shifts', icon: 'moon' },
  { key: 'block', icon: 'slash' },
  { key: 'report', icon: 'flag' },
  { key: 'privacy', icon: 'lock' },
  { key: 'membership', icon: 'calendar' },
  { key: 'switch', icon: 'settings' },
];

const STAFF_RULES: Rule[] = [
  { key: 'who', icon: 'users' },
  { key: 'frontDesk', icon: 'headphones' },
  { key: 'professional', icon: 'briefcase' },
  { key: 'appOnly', icon: 'eye-off' },
  { key: 'limits', icon: 'repeat' },
  { key: 'shifts', icon: 'moon' },
  { key: 'mute', icon: 'volume-x' },
  { key: 'privacy', icon: 'lock' },
  { key: 'leaving', icon: 'log-out' },
  { key: 'switch', icon: 'settings' },
];

interface ChatRulesSheetProps {
  side: ChatSide;
  /** Staff who work the front desk (everyone but trainers) get the shared-inbox rule. */
  isDesk?: boolean;
  visible: boolean;
  onClose: () => void;
}

/** How chat works and what's expected, for members or for staff and trainers. */
export function ChatRulesSheet({ side, isDesk = false, visible, onClose }: ChatRulesSheetProps) {
  const { t } = useTranslation();
  const rules = side === 'member' ? MEMBER_RULES : STAFF_RULES.filter((r) => r.key !== 'frontDesk' || isDesk);

  return (
    <AppBottomSheet
      visible={visible}
      title={t('conversations.rules.title')}
      subtitle={t(`conversations.rules.${side}.subtitle`)}
      onClose={onClose}
      footer={<Button title={t('conversations.rules.gotIt')} onPress={onClose} />}
    >
      <View style={styles.list}>
        {rules.map((rule) => (
          <View key={rule.key} style={styles.rule}>
            <View style={styles.icon}>
              <Feather name={rule.icon} size={17} color={BrandColors.teal} />
            </View>
            <View style={styles.text}>
              <Text style={styles.ruleTitle}>{t(`conversations.rules.${side}.${rule.key}.title` as never)}</Text>
              <Text style={styles.ruleBody}>{t(`conversations.rules.${side}.${rule.key}.body` as never)}</Text>
            </View>
          </View>
        ))}
      </View>
    </AppBottomSheet>
  );
}

const seenKey = (side: ChatSide, userId: string) => `gymbios.chat_rules_seen.${side}.${userId}`;

/**
 * The rules sheet's state: opens by itself the first time this user uses chat on this
 * device, and on demand after that. Closing it marks it seen.
 */
export function useChatRules(side: ChatSide) {
  const userId = useAuthStore((s) => s.user?.id);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    secureStorage.getItem(seenKey(side, userId))
      .then((seen) => { if (!cancelled && !seen) setVisible(true); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [side, userId]);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => {
    setVisible(false);
    if (userId) secureStorage.setItem(seenKey(side, userId), '1').catch(() => undefined);
  }, [side, userId]);

  return { visible, open, close };
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  rule: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E1F3EE',
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  ruleTitle: {
    fontSize: TypographyScale.body,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  ruleBody: {
    fontSize: 13,
    lineHeight: 19,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
});
