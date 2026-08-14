import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { PromotionCampaignResponse } from '../../domain/PromotionCampaign';
import { formatDiscountDisplay } from '../utils/promotionStatistics';

interface PromotionCardProps {
  promotion: PromotionCampaignResponse;
  onPress: (promotion: PromotionCampaignResponse) => void;
  style?: object;
}

export function PromotionCard({ promotion, onPress, style }: PromotionCardProps) {
  const statusColor = getStatusColor(promotion.status);
  const typeLabel = promotion.type ? promotion.type.toUpperCase() : 'PROMO';
  const discountText = formatDiscountDisplay(
    promotion.discountType,
    promotion.discountValue,
  );

  const formattedEndDate = promotion.endDate
    ? new Date(promotion.endDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'No end date';

  const usageText =
    promotion.usageLimit !== null && promotion.usageLimit !== undefined
      ? `${promotion.usageCount ?? 0}/${promotion.usageLimit}`
      : `${promotion.usageCount ?? 0}`;

  const usagePercent =
    promotion.usageLimit && promotion.usageLimit > 0
      ? Math.min(100, Math.round(((promotion.usageCount ?? 0) / promotion.usageLimit) * 100))
      : null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressedCard,
        style,
      ]}
      onPress={() => onPress(promotion)}
    >
      {/* Top Header badges */}
      <View style={styles.badgeRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{typeLabel}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor.fg }]} />
          <Text style={[styles.statusBadgeText, { color: statusColor.fg }]}>
            {promotion.status}
          </Text>
        </View>
      </View>

      {/* Promotion Title & Description */}
      <Text style={styles.title} numberOfLines={1}>
        {promotion.name}
      </Text>
      {!!promotion.description && (
        <Text style={styles.description} numberOfLines={2}>
          {promotion.description}
        </Text>
      )}

      {/* Discount Pill */}
      <View style={styles.discountContainer}>
        <Text style={styles.discountText}>{discountText}</Text>
      </View>

      {/* Meta Info */}
      <View style={styles.metaContainer}>
        <View style={styles.metaRow}>
          <Feather name="calendar" size={13} color="#64748B" />
          <Text style={styles.metaText} numberOfLines={1}>
            Until {formattedEndDate}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Feather name="users" size={13} color="#64748B" />
          <Text style={styles.metaText} numberOfLines={1}>
            Used: {usageText}
          </Text>
        </View>

        {usagePercent !== null && (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                { width: `${usagePercent}%` },
              ]}
            />
          </View>
        )}

        <View style={styles.metaRow}>
          <Feather name="dollar-sign" size={13} color="#059669" />
          <Text style={styles.revenueText} numberOfLines={1}>
            ${(promotion.totalRevenue ?? 0).toLocaleString()} rev
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'active':
      return { bg: '#DCFCE7', fg: '#15803D' };
    case 'scheduled':
      return { bg: '#DBEAFE', fg: '#1D4ED8' };
    case 'expired':
      return { bg: '#FEE2E2', fg: '#B91C1C' };
    case 'paused':
      return { bg: '#FEF3C7', fg: '#B45309' };
    case 'draft':
    default:
      return { bg: '#F1F5F9', fg: '#475569' };
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1.5,
  },
  pressedCard: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  typeBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.half,
  },
  description: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginBottom: Spacing.two,
    lineHeight: 18,
  },
  discountContainer: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: Radius.md,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  discountText: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.teal,
  },
  metaContainer: {
    gap: Spacing.one,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: Spacing.two,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },
  revenueText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: BrandColors.teal,
  },
});
