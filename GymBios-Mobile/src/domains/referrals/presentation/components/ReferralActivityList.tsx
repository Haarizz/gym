import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { useCurrency, CurrencyGlyph } from '@/core/providers/CurrencyProvider';
import { ReferralStatusBadge } from './ReferralStatusBadge';
import type { Referral } from '../../domain/Referral';

interface ReferralActivityListProps {
  referrals: Referral[];
  onView?: (referral: Referral) => void;
  onEdit?: (referral: Referral) => void;
  onDelete?: (referral: Referral) => void;
  onMarkSuccessful?: (referral: Referral) => void;
  maxItems?: number;
}

export function ReferralActivityList({
  referrals,
  onView,
  onEdit,
  onDelete,
  onMarkSuccessful,
  maxItems,
}: ReferralActivityListProps) {
  const { currencyCode } = useCurrency();
  const list = maxItems ? referrals.slice(0, maxItems) : referrals;

  if (list.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Feather name="activity" size={32} color={BrandColors.textSecondary} style={{ opacity: 0.5 }} />
        <Typography variant="bodySmall" color="textSecondary" style={styles.emptyText}>
          No referral activity recorded yet.
        </Typography>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {list.map((item) => {
        const rewardVal = Number(item.rewardAmount || 0);
        const isPending = item.status === 'pending';

        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.topRow}>
              <View style={styles.namesCol}>
                <Typography variant="subtitle" style={styles.referrerName}>
                  {item.referrerName || 'Unknown Referrer'}
                </Typography>
                <Typography variant="bodySmall" color="textSecondary">
                  Referred: {item.refereeName || 'Unknown Referee'}
                </Typography>
                {item.refereeEmail ? (
                  <Typography variant="caption" color="textSecondary">
                    {item.refereeEmail}
                  </Typography>
                ) : null}
              </View>

              <View style={styles.statusCol}>
                <ReferralStatusBadge status={item.status} />
                <Typography variant="subtitle" style={styles.rewardText}>
                  <CurrencyGlyph code={currencyCode} /> {rewardVal.toLocaleString()}
                </Typography>
              </View>
            </View>

            <View style={styles.bottomRow}>
              <Typography variant="caption" color="textSecondary">
                {item.date || item.createdAt || '—'}
              </Typography>

              <View style={styles.actionsGroup}>
                {onView ? (
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => onView(item)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="View referral details"
                  >
                    <Feather name="eye" size={16} color={BrandColors.teal} />
                  </Pressable>
                ) : null}

                {onEdit ? (
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => onEdit(item)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Edit referral"
                  >
                    <Feather name="edit-2" size={16} color="#2563eb" />
                  </Pressable>
                ) : null}

                {isPending && onMarkSuccessful ? (
                  <Pressable
                    style={[styles.actionBtn, styles.successBtn]}
                    onPress={() => onMarkSuccessful(item)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Mark referral as successful"
                  >
                    <Feather name="check" size={16} color="#16a34a" />
                  </Pressable>
                ) : null}

                {onDelete ? (
                  <Pressable
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => onDelete(item)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Delete referral"
                  >
                    <Feather name="trash-2" size={16} color="#dc2626" />
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  emptyContainer: {
    padding: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    gap: Spacing.two,
  },
  emptyText: {
    fontSize: 13,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  namesCol: {
    flex: 1,
    marginRight: Spacing.two,
  },
  referrerName: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: 2,
  },
  statusCol: {
    alignItems: 'flex-end',
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.teal,
    marginTop: Spacing.one,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBtn: {
    backgroundColor: '#dcfce7',
  },
  deleteBtn: {
    backgroundColor: '#fee2e2',
  },
});
