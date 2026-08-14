import React from 'react';
import {
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import type { PromotionCampaignResponse } from '../../domain/PromotionCampaign';
import {
  useDeletePromotion,
  useDuplicatePromotion,
} from '../../hooks/usePromotions';
import { formatDiscountDisplay } from '../utils/promotionStatistics';

interface PromotionDetailsSheetProps {
  visible: boolean;
  promotion: PromotionCampaignResponse | null;
  onClose: () => void;
  onEdit: (promotion: PromotionCampaignResponse) => void;
}

export function PromotionDetailsSheet({
  visible,
  promotion,
  onClose,
  onEdit,
}: PromotionDetailsSheetProps) {
  const deleteMutation = useDeletePromotion();
  const duplicateMutation = useDuplicatePromotion();

  if (!promotion) return null;

  const discountDisplay = formatDiscountDisplay(
    promotion.discountType,
    promotion.discountValue,
  );

  const formatDate = (rawDate?: string | null) => {
    if (!rawDate) return 'N/A';
    const d = new Date(rawDate);
    return isNaN(d.getTime())
      ? rawDate
      : d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
  };

  const handleShareCode = async () => {
    if (!promotion.code) return;
    try {
      await Share.share({
        message: `Use promotion code "${promotion.code}" for ${discountDisplay} at Gym!`,
      });
    } catch {
      // Ignored
    }
  };

  const handleDuplicate = async () => {
    try {
      await duplicateMutation.mutateAsync(promotion.id);
      Alert.alert('Success', `Created duplicate of "${promotion.name}".`);
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to duplicate promotion.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Promotion',
      `Are you sure you want to delete "${promotion.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(promotion.id);
              Alert.alert('Success', `Deleted "${promotion.name}".`);
              onClose();
            } catch {
              Alert.alert('Error', 'Failed to delete promotion.');
            }
          },
        },
      ],
    );
  };

  const isMutating = deleteMutation.isPending || duplicateMutation.isPending;

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title={promotion.name}
      subtitle={`${promotion.type?.toUpperCase() ?? 'PROMO'} • ${promotion.status}`}
    >
      <View style={styles.content}>
        {/* Discount highlight */}
        <View style={styles.highlightBanner}>
          <Text style={styles.highlightLabel}>Discount Value</Text>
          <Text style={styles.highlightText}>{discountDisplay}</Text>
        </View>

        {/* SECTION: Promotion Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promotion Details</Text>

          {!!promotion.description && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Description</Text>
              <Text style={styles.value}>{promotion.description}</Text>
            </View>
          )}

          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Category</Text>
              <Text style={styles.value}>{promotion.category || 'N/A'}</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Code</Text>
              <Text style={styles.codeValue}>{promotion.code || 'None'}</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Start Date</Text>
              <Text style={styles.value}>{formatDate(promotion.startDate)}</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>End Date</Text>
              <Text style={styles.value}>{formatDate(promotion.endDate)}</Text>
            </View>
          </View>

          {promotion.tags && promotion.tags.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Tags</Text>
              <View style={styles.tagsContainer}>
                {promotion.tags.map((tag, idx) => (
                  <View key={idx} style={styles.tagChip}>
                    <Text style={styles.tagChipText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!!promotion.termsAndConditions && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Terms & Conditions</Text>
              <Text style={styles.termsText}>{promotion.termsAndConditions}</Text>
            </View>
          )}
        </View>

        {/* SECTION: Usage & Limits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usage & Limits</Text>
          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Usage Count</Text>
              <Text style={styles.statValue}>{promotion.usageCount ?? 0}</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Usage Limit</Text>
              <Text style={styles.statValue}>
                {promotion.usageLimit !== null && promotion.usageLimit !== undefined
                  ? promotion.usageLimit
                  : 'Unlimited'}
              </Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Per Member Limit</Text>
              <Text style={styles.value}>
                {promotion.usageLimitPerMember !== null &&
                promotion.usageLimitPerMember !== undefined
                  ? promotion.usageLimitPerMember
                  : 'Unlimited'}
              </Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Min Purchase</Text>
              <Text style={styles.value}>
                {promotion.minimumPurchase !== null &&
                promotion.minimumPurchase !== undefined
                  ? `$${promotion.minimumPurchase}`
                  : 'None'}
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION: Performance Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Analytics</Text>
          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Total Revenue</Text>
              <Text style={[styles.statValue, { color: '#059669' }]}>
                ${(promotion.totalRevenue ?? 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Total Savings</Text>
              <Text style={[styles.statValue, { color: '#EA580C' }]}>
                ${(promotion.totalSavings ?? 0).toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Avg Order Value</Text>
              <Text style={styles.value}>
                ${(promotion.averageOrderValue ?? 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Redemption Rate</Text>
              <Text style={styles.value}>
                {promotion.usageLimit
                  ? `${promotion.redemptionRate ?? 0}%`
                  : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION: Targeting & Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Targeting & Distribution</Text>

          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Target Audience</Text>
              <Text style={styles.value}>
                {promotion.targetAudience || 'All Members'}
              </Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Created By</Text>
              <Text style={styles.value}>{promotion.createdBy || 'System'}</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Auto Apply</Text>
              <Text style={styles.value}>{promotion.autoApply ? 'Yes' : 'No'}</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Stackable</Text>
              <Text style={styles.value}>{promotion.stackable ? 'Yes' : 'No'}</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Priority</Text>
              <Text style={styles.value}>
                {promotion.priority !== null && promotion.priority !== undefined
                  ? promotion.priority
                  : 'Normal'}
              </Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Public</Text>
              <Text style={styles.value}>{promotion.isPublic ? 'Yes' : 'No'}</Text>
            </View>
          </View>

          {promotion.channels && promotion.channels.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Distribution Channels</Text>
              <Text style={styles.value}>{promotion.channels.join(', ')}</Text>
            </View>
          )}

          {promotion.applicablePlans && promotion.applicablePlans.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Applicable Plans</Text>
              <Text style={styles.value}>{promotion.applicablePlans.join(', ')}</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.actionGrid}>
            <Pressable
              style={styles.actionButton}
              onPress={() => {
                onClose();
                onEdit(promotion);
              }}
              disabled={isMutating}
            >
              <Feather name="edit-2" size={16} color={BrandColors.teal} />
              <Text style={styles.actionButtonText}>Edit</Text>
            </Pressable>

            {!!promotion.code && (
              <Pressable
                style={styles.actionButton}
                onPress={handleShareCode}
                disabled={isMutating}
              >
                <Feather name="share-2" size={16} color={BrandColors.teal} />
                <Text style={styles.actionButtonText}>Share Code</Text>
              </Pressable>
            )}

            <Pressable
              style={styles.actionButton}
              onPress={handleDuplicate}
              disabled={isMutating}
            >
              <Feather name="copy" size={16} color={BrandColors.teal} />
              <Text style={styles.actionButtonText}>Duplicate</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.deleteActionButton]}
              onPress={handleDelete}
              disabled={isMutating}
            >
              <Feather name="trash-2" size={16} color="#DC2626" />
              <Text style={styles.deleteActionText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
    paddingBottom: Spacing.four,
  },
  highlightBanner: {
    backgroundColor: '#F0FDFA',
    borderColor: '#CCFBF1',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    alignItems: 'center',
  },
  highlightLabel: {
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  highlightText: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.teal,
    marginTop: 2,
  },
  section: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.one,
  },
  detailRow: {
    gap: 2,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  gridCol: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: BrandColors.textPrimary,
    fontWeight: '600',
  },
  codeValue: {
    fontSize: 14,
    color: BrandColors.teal,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  termsText: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
    backgroundColor: '#FFFFFF',
    padding: Spacing.two,
    borderRadius: Radius.sm,
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: 2,
  },
  tagChip: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  tagChipText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  actionsSection: {
    gap: Spacing.two,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    backgroundColor: '#F1F5F9',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    minWidth: '45%',
    flex: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.teal,
  },
  deleteActionButton: {
    backgroundColor: '#FEE2E2',
  },
  deleteActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
});
