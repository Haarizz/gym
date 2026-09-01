import React from 'react';
import { Modal, View, StyleSheet, Pressable } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { Button } from '@/shared/components/Button';
import { useCurrency, CurrencyGlyph } from '@/core/providers/CurrencyProvider';
import { ReferralStatusBadge } from './ReferralStatusBadge';
import {
  useMarkReferralSuccessful,
  useMarkReferralExpired,
} from '../../hooks/useReferralActions';
import type { Referral } from '../../domain/Referral';

import { toast } from '@/shared/components/Toasts/toastStore';

interface ReferralDetailsSheetProps {
  visible: boolean;
  onClose: () => void;
  referral: Referral | null;
  onSuccess?: () => void;
}

export function ReferralDetailsSheet({
  visible,
  onClose,
  referral,
  onSuccess,
}: ReferralDetailsSheetProps) {
  const { currencyCode } = useCurrency();
  const markSuccessfulMutation = useMarkReferralSuccessful();
  const markExpiredMutation = useMarkReferralExpired();

  if (!referral) return null;

  const isPending = referral.status === 'pending';
  const rewardVal = Number(referral.rewardAmount || 0);
  const isLoading = markSuccessfulMutation.isPending || markExpiredMutation.isPending;

  const handleMarkSuccessful = () => {
    markSuccessfulMutation.mutate(
      { id: Number(referral.id) },
      {
        onSuccess: () => {
          toast.success('Referral marked as successful!', {
            title: 'Success'
          });
          onClose();
          onSuccess?.();
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to update referral status.', {
            title: 'Error'
          });
        },
      }
    );
  };

  const handleMarkExpired = () => {
    markExpiredMutation.mutate(Number(referral.id), {
      onSuccess: () => {
        toast.success('Referral marked as expired.', {
          title: 'Success'
        });
        onClose();
        onSuccess?.();
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to update referral status.', {
          title: 'Error'
        });
      },
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Typography variant="title" style={styles.title}>
              Referral Details
            </Typography>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={22} color={BrandColors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Typography variant="caption" color="textSecondary">
                  Referrer
                </Typography>
                <Typography variant="subtitle" style={styles.valueText}>
                  {referral.referrerName || '—'}
                </Typography>
              </View>

              <View style={styles.gridCol}>
                <Typography variant="caption" color="textSecondary">
                  Referee
                </Typography>
                <Typography variant="subtitle" style={styles.valueText}>
                  {referral.refereeName || '—'}
                </Typography>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Typography variant="caption" color="textSecondary">
                  Email
                </Typography>
                <Typography variant="bodySmall" style={styles.valueText}>
                  {referral.refereeEmail || '—'}
                </Typography>
              </View>

              <View style={styles.gridCol}>
                <Typography variant="caption" color="textSecondary">
                  Phone
                </Typography>
                <Typography variant="bodySmall" style={styles.valueText}>
                  {referral.refereePhone || '—'}
                </Typography>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Typography variant="caption" color="textSecondary">
                  Status
                </Typography>
                <View style={{ marginTop: 4 }}>
                  <ReferralStatusBadge status={referral.status} />
                </View>
              </View>

              <View style={styles.gridCol}>
                <Typography variant="caption" color="textSecondary">
                  Reward
                </Typography>
                <Typography variant="subtitle" style={[styles.valueText, { color: BrandColors.teal }]}>
                  <CurrencyGlyph code={currencyCode} /> {rewardVal.toLocaleString()}
                </Typography>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Typography variant="caption" color="textSecondary">
                  Referral Code
                </Typography>
                <Typography variant="bodySmall" style={styles.codeText}>
                  {referral.referralCode || '—'}
                </Typography>
              </View>

              <View style={styles.gridCol}>
                <Typography variant="caption" color="textSecondary">
                  Date
                </Typography>
                <Typography variant="bodySmall" style={styles.valueText}>
                  {referral.date || referral.createdAt || '—'}
                </Typography>
              </View>
            </View>

            {referral.notes ? (
              <View style={styles.notesBox}>
                <Typography variant="caption" color="textSecondary">
                  Notes
                </Typography>
                <Typography variant="bodySmall" style={styles.notesText}>
                  {referral.notes}
                </Typography>
              </View>
            ) : null}
          </View>

          {/* Action Buttons for Pending Referrals */}
          {isPending ? (
            <View style={styles.actionsFooter}>
              <Button
                title="Mark Successful"
                onPress={handleMarkSuccessful}
                loading={isLoading}
                style={{ flex: 1, backgroundColor: '#16a34a', marginRight: Spacing.two }}
              />
              <Button
                title="Mark Expired"
                variant="outline"
                onPress={handleMarkExpired}
                loading={isLoading}
                style={{ flex: 1, borderColor: '#dc2626' }}
              />
            </View>
          ) : (
            <View style={styles.footer}>
              <Button title="Close" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  gridCol: {
    flex: 1,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    marginTop: 2,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: BrandColors.textPrimary,
    marginTop: 2,
  },
  notesBox: {
    backgroundColor: '#f8fafc',
    borderRadius: Radius.md,
    padding: Spacing.two,
    marginTop: Spacing.one,
  },
  notesText: {
    fontSize: 13,
    color: BrandColors.textPrimary,
    marginTop: 2,
  },
  actionsFooter: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
});
