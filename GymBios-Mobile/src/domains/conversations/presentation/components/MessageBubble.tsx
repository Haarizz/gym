import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Feather from '@expo/vector-icons/Feather';
import { Text } from '@/shared/components/AppText';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { formatDate } from '@/core/i18n';
import type { ChatMessage } from '../../domain/types';
import { dayLabel, parseChatDate } from '../chatUi';

interface MessageBubbleProps {
  message: ChatMessage;
  accent: string;
  onAccent: string;
  /** Shown above the bubble when this is the first message of its day. */
  showDay: boolean;
  /** Staff app, front desk / shared threads: which colleague wrote a staff-side message. */
  showSenderName: boolean;
  onLongPress: (message: ChatMessage) => void;
}

function MessageBubbleBase({ message, accent, onAccent, showDay, showSenderName, onLongPress }: MessageBubbleProps) {
  const { t } = useTranslation();
  const date = parseChatDate(message.createdAt);
  const mine = message.mine;

  return (
    <View>
      {showDay && date && (
        <View style={styles.dayWrap}>
          <Text style={styles.day}>{dayLabel(t, date)}</Text>
        </View>
      )}
      <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
        <Pressable
          onLongPress={message.deleted ? undefined : () => onLongPress(message)}
          delayLongPress={300}
          style={({ pressed }) => [
            styles.bubble,
            mine ? [styles.bubbleMine, { backgroundColor: accent }] : styles.bubbleTheirs,
            message.deleted && styles.bubbleDeleted,
            pressed && !message.deleted && styles.pressed,
          ]}
          accessibilityHint={message.deleted ? undefined : t('conversations.actions.title')}
        >
          {showSenderName && !!message.senderName && !message.deleted && (
            <Text style={[styles.sender, mine && { color: onAccent }]} numberOfLines={1}>
              {message.senderName}
            </Text>
          )}
          {message.deleted ? (
            <View style={styles.deletedRow}>
              <Feather name="slash" size={13} color={BrandColors.textSecondary} />
              <Text style={styles.deletedText}>{t('conversations.chat.deleted')}</Text>
            </View>
          ) : (
            <Text style={[styles.body, mine && { color: onAccent }]} selectable>
              {message.body}
            </Text>
          )}
          <View style={styles.meta}>
            {message.masked && !message.deleted && (
              <View style={styles.maskedRow}>
                <Feather name="eye-off" size={11} color={mine ? onAccent : BrandColors.textSecondary} />
                <Text style={[styles.metaText, mine && { color: onAccent }]}>{t('conversations.chat.masked')}</Text>
              </View>
            )}
            {date && (
              <Text style={[styles.metaText, mine && !message.deleted && { color: onAccent }]}>
                {formatDate(date, 'p')}
              </Text>
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

export const MessageBubble = memo(MessageBubbleBase);

const styles = StyleSheet.create({
  dayWrap: {
    alignItems: 'center',
    marginVertical: Spacing.three,
  },
  day: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.textSecondary,
    backgroundColor: 'rgba(30,41,59,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    marginVertical: 3,
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 18,
  },
  bubbleMine: {
    borderBottomEndRadius: 6,
  },
  bubbleTheirs: {
    backgroundColor: '#FFFFFF',
    borderBottomStartRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(30,41,59,0.06)',
  },
  bubbleDeleted: {
    backgroundColor: 'rgba(30,41,59,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(30,41,59,0.08)',
  },
  pressed: {
    opacity: 0.8,
  },
  sender: {
    fontSize: 11,
    fontWeight: '800',
    color: BrandColors.teal,
    marginBottom: 2,
  },
  body: {
    fontSize: TypographyScale.body,
    lineHeight: 21,
    color: BrandColors.textPrimary,
  },
  deletedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deletedText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: BrandColors.textSecondary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: 3,
  },
  maskedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 10,
    fontWeight: '600',
    color: BrandColors.textSecondary,
    opacity: 0.85,
  },
});
