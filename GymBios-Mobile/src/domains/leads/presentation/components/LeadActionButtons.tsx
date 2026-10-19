import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';

import { Spacing } from '@/core/theme';
import type { Lead } from '../../domain/Lead';

interface LeadActionButtonsProps {
  lead: Lead;
  onCall?: (lead: Lead) => void;
  onEmail?: (lead: Lead) => void;
  onMessage?: (lead: Lead) => void;
  onView?: (lead: Lead) => void;
  onEdit?: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
}

export function LeadActionButtons({
  lead,
  onCall,
  onEmail,
  onMessage,
  onView,
  onEdit,
  onDelete,
}: LeadActionButtonsProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {onCall && (
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          onPress={() => onCall(lead)}
          hitSlop={8}
          accessibilityLabel={t('leads.actions.callA11y')}
        >
          <Feather name="phone" size={17} color="#94a3b8" />
        </Pressable>
      )}
      {onEmail && (
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          onPress={() => onEmail(lead)}
          hitSlop={8}
          accessibilityLabel={t('leads.actions.emailA11y')}
        >
          <Feather name="mail" size={17} color="#94a3b8" />
        </Pressable>
      )}
      {onMessage && (
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          onPress={() => onMessage(lead)}
          hitSlop={8}
          accessibilityLabel={t('leads.actions.messageA11y')}
        >
          <Feather name="message-square" size={17} color="#94a3b8" />
        </Pressable>
      )}
      {onView && (
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          onPress={() => onView(lead)}
          hitSlop={8}
          accessibilityLabel={t('leads.actions.viewA11y')}
        >
          <Feather name="eye" size={17} color="#94a3b8" />
        </Pressable>
      )}
      {onEdit && (
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          onPress={() => onEdit(lead)}
          hitSlop={8}
          accessibilityLabel={t('leads.actions.editA11y')}
        >
          <Feather name="edit-2" size={17} color="#94a3b8" />
        </Pressable>
      )}
      {onDelete && (
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          onPress={() => onDelete(lead)}
          hitSlop={8}
          accessibilityLabel={t('leads.actions.deleteA11y')}
        >
          <Feather name="trash-2" size={17} color="#f87171" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  actionButton: {
    padding: Spacing.two,
    borderRadius: 6,
  },
  pressed: {
    opacity: 0.6,
  },
});
