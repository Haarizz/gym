import { useState } from 'react';
import { ActivityIndicator, I18nManager, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Feather from '@expo/vector-icons/Feather';
import { Text, TextInput } from '@/shared/components/AppText';
import { BrandColors, Spacing, TypographyScale } from '@/core/theme';
import { MESSAGE_MAX_LENGTH } from '../../domain/types';

interface ChatComposerProps {
  accent: string;
  onAccent: string;
  /** Set when sending isn't allowed: shown instead of the input. */
  disabledReason: string | null;
  sending: boolean;
  /** Resolves true once sent, so the text is only cleared then. */
  onSend: (text: string) => Promise<boolean>;
  bottomInset: number;
}

const COUNTER_FROM = MESSAGE_MAX_LENGTH - 100;

export function ChatComposer({ accent, onAccent, disabledReason, sending, onSend, bottomInset }: ChatComposerProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const trimmed = text.trim();
  const canSend = !sending && trimmed.length > 0 && trimmed.length <= MESSAGE_MAX_LENGTH;

  const submit = async () => {
    if (!canSend) return;
    if (await onSend(trimmed)) setText('');
  };

  if (disabledReason) {
    return (
      <View style={[styles.bar, styles.disabledBar, { paddingBottom: Math.max(bottomInset, Spacing.three) }]}>
        <Feather name="lock" size={15} color={BrandColors.textSecondary} />
        <Text style={styles.disabledText}>{disabledReason}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(bottomInset, Spacing.two) }]}>
      <View style={styles.inputWrap}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('conversations.chat.placeholder')}
          placeholderTextColor={BrandColors.textSecondary}
          style={styles.input}
          multiline
          maxLength={MESSAGE_MAX_LENGTH}
          accessibilityLabel={t('conversations.chat.placeholder')}
        />
        {text.length >= COUNTER_FROM && (
          <Text style={styles.counter}>
            {t('conversations.chat.charsLeft', { count: MESSAGE_MAX_LENGTH - text.length })}
          </Text>
        )}
      </View>
      <Pressable
        onPress={submit}
        disabled={!canSend}
        style={({ pressed }) => [
          styles.send,
          { backgroundColor: accent },
          !canSend && styles.sendDisabled,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('conversations.chat.send')}
        accessibilityState={{ disabled: !canSend, busy: sending }}
      >
        {sending ? (
          <ActivityIndicator size="small" color={onAccent} />
        ) : (
          <Feather
            name="send"
            size={18}
            color={onAccent}
            style={I18nManager.isRTL ? styles.flip : undefined}
          />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(30,41,59,0.08)',
  },
  inputWrap: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    borderRadius: 22,
    backgroundColor: BrandColors.screenBackground,
    paddingHorizontal: 14,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  input: {
    fontSize: TypographyScale.body,
    color: BrandColors.textPrimary,
    paddingVertical: 8,
    maxHeight: 120,
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.textSecondary,
    paddingBottom: 4,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
  },
  flip: {
    transform: [{ scaleX: -1 }],
  },
  disabledBar: {
    alignItems: 'center',
    paddingTop: Spacing.three,
  },
  disabledText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
});
