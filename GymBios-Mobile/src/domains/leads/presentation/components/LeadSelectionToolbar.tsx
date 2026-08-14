import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';

interface LeadSelectionToolbarProps {
  selectedCount: number;
  onAssignStaff: () => void;
  onUpdateStatus: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function LeadSelectionToolbar({
  selectedCount,
  onAssignStaff,
  onUpdateStatus,
  onDelete,
  onClear,
}: LeadSelectionToolbarProps) {
  const theme = useTheme();

  if (selectedCount === 0) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundElement, borderColor: BrandColors.teal },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.countWrap}>
          <Feather name="check-square" size={16} color={BrandColors.teal} />
          <Text style={[styles.countText, { color: theme.text }]}>
            {selectedCount} {selectedCount === 1 ? 'lead' : 'leads'} selected
          </Text>
        </View>

        <TouchableOpacity style={styles.clearBtn} onPress={onClear} hitSlop={6}>
          <Text style={[styles.clearText, { color: theme.textSecondary }]}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.muted }]}
          onPress={onAssignStaff}
        >
          <Feather name="user-check" size={13} color={theme.text} />
          <Text style={[styles.actionBtnText, { color: theme.text }]}>Assign Staff</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.muted }]}
          onPress={onUpdateStatus}
        >
          <Feather name="refresh-cw" size={13} color={theme.text} />
          <Text style={[styles.actionBtnText, { color: theme.text }]}>Update Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={onDelete}
        >
          <Feather name="trash-2" size={13} color="#f87171" />
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    borderWidth: 1.5,
    gap: Spacing.two,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
  },
  clearBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  deleteBtnText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
});
