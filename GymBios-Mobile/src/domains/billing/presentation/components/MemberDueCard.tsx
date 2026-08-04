import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { MemberDue } from '../../domain/MemberDue';
import { DueStatus } from '../../domain/MemberDue';
import { MoneyText } from './MoneyText';

interface MemberDueCardProps {
  due: MemberDue;
  onPress: (due: MemberDue) => void;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Compact member-dues card.
 * Shows member name, outstanding amount, due date, and overdue indicator.
 * Tapping navigates to the Member Statement screen.
 */
export const MemberDueCard = memo(function MemberDueCard({
  due,
  onPress,
}: MemberDueCardProps) {
  const isOverdue = due.status === DueStatus.Overdue || due.daysOverdue > 0;

  return (
    <Pressable
      onPress={() => onPress(due)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Member ${due.memberName}, outstanding ${due.amount}, ${isOverdue ? `${due.daysOverdue} days overdue` : 'due soon'}`}
    >
      {/* Left: initials avatar */}
      <View style={[styles.avatar, isOverdue && styles.avatarOverdue]}>
        <Typography variant="caption" style={styles.avatarText}>
          {(due.memberName ?? 'M')[0].toUpperCase()}
        </Typography>
      </View>

      {/* Middle: name + due date */}
      <View style={styles.info}>
        <Typography variant="bodySmall" style={styles.name}>
          {due.memberName ?? '—'}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Due {formatDate(due.dueDate)}
        </Typography>
        {due.membership && (
          <Typography variant="caption" color="textSecondary">
            {due.membership}
          </Typography>
        )}
      </View>

      {/* Right: amount + overdue chip */}
      <View style={styles.right}>
        <MoneyText
          amount={due.amount}
          variant="bodySmallBold"
          color={isOverdue ? '#b91c1c' : BrandColors.teal}
        />
        {isOverdue ? (
          <View style={styles.overdueChip}>
            <Typography variant="caption" style={styles.overdueText}>
              {due.daysOverdue}d overdue
            </Typography>
          </View>
        ) : (
          <View style={styles.dueSoonChip}>
            <Typography variant="caption" style={styles.dueSoonText}>
              Due soon
            </Typography>
          </View>
        )}
      </View>

      <Feather name="chevron-right" size={14} color={BrandColors.textSecondary} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  pressed: { opacity: 0.82 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.screenBackgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverdue: {
    backgroundColor: '#fee2e2',
  },
  avatarText: {
    color: BrandColors.teal,
    fontWeight: '700',
    fontSize: 13,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontWeight: '600',
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  overdueChip: {
    backgroundColor: '#fee2e2',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  overdueText: {
    color: '#b91c1c',
    fontSize: 10,
    fontWeight: '600',
  },
  dueSoonChip: {
    backgroundColor: '#fef9c3',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  dueSoonText: {
    color: '#854d0e',
    fontSize: 10,
    fontWeight: '600',
  },
});
