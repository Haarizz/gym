import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

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
  return (
    <View style={styles.container}>
      {onCall && (
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          onPress={() => onCall(lead)}
          hitSlop={8}
          accessibilityLabel="Call Lead"
        >
          <Feather name="phone" size={17} color="#94a3b8" />
        </Pressable>
      )}
      {onEmail && (
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          onPress={() => onEmail(lead)}
          hitSlop={8}
          accessibilityLabel="Email Lead"
        >
          <Feather name="mail" size={17} color="#94a3b8" />
        </Pressable>
      )}
      {onMessage && (
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          onPress={() => onMessage(lead)}
          hitSlop={8}
          accessibilityLabel="Message Lead"
        >
          <Feather name="message-square" size={17} color="#94a3b8" />
        </Pressable>
      )}
      {onView && (
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          onPress={() => onView(lead)}
          hitSlop={8}
          accessibilityLabel="View Lead Details"
        >
          <Feather name="eye" size={17} color="#94a3b8" />
        </Pressable>
      )}
      {onEdit && (
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          onPress={() => onEdit(lead)}
          hitSlop={8}
          accessibilityLabel="Edit Lead"
        >
          <Feather name="edit-2" size={17} color="#94a3b8" />
        </Pressable>
      )}
      {onDelete && (
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          onPress={() => onDelete(lead)}
          hitSlop={8}
          accessibilityLabel="Delete Lead"
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
