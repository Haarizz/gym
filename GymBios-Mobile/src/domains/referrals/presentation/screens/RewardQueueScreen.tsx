import React, { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { Button } from '@/shared/components/Button';
import { ConfirmationModal } from '@/shared/components/ConfirmationModal';
import { CurrencyValue } from '@/core/providers';
import { ReferralHeader } from '../components/ReferralHeader';
import {
  useRewardStats,
  useRewards,
  useRewardAction,
  REWARD_PASS_TYPES,
  type ReferralReward,
  type RewardAction,
  type RewardStatus,
  type RewardType,
} from '@/domains/rewards';

import { toast } from '@/shared/components/Toasts/toastStore';

type StatusFilter = 'all' | 'PENDING' | 'AVAILABLE' | 'REDEEMED';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'ALL' },
  { key: 'PENDING', label: 'PENDING' },
  { key: 'AVAILABLE', label: 'AVAILABLE' },
  { key: 'REDEEMED', label: 'REDEEMED' },
];

const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  WALLET_CREDIT: 'Wallet Credit',
  MEMBERSHIP_EXTENSION: 'Membership Extension',
  MEMBERSHIP_DISCOUNT: 'Membership Discount',
  FREE_PT: 'Free PT',
  FREE_CLASS: 'Free Class',
  COUPON: 'Coupon',
  LOYALTY_POINTS: 'Loyalty Points',
  GIFT: 'Gift',
  CASH: 'Cash',
};

const STATUS_COLORS: Record<RewardStatus, { bg: string; fg: string }> = {
  PENDING: { bg: '#fef9c3', fg: '#a16207' },
  AVAILABLE: { bg: '#dbeafe', fg: '#1d4ed8' },
  CLAIMED: { bg: '#f3e8ff', fg: '#7e22ce' },
  REDEEMED: { bg: '#dcfce7', fg: '#15803d' },
  EXPIRED: { bg: '#e5e7eb', fg: '#374151' },
  CANCELLED: { bg: '#fee2e2', fg: '#b91c1c' },
};

const ACTION_COPY: Record<RewardAction, { title: string; confirm: string; done: string }> = {
  approve: { title: 'Approve reward?', confirm: 'Approve', done: 'approved' },
  reject: { title: 'Reject reward?', confirm: 'Reject', done: 'rejected' },
  redeem: { title: 'Mark reward as redeemed?', confirm: 'Mark Redeemed', done: 'marked as redeemed' },
};

// Mirrors the web Reward Queue's action rules.
function canApproveOrReject(reward: ReferralReward) {
  return reward.status === 'PENDING';
}

function canRedeem(reward: ReferralReward) {
  // Reward Passes are only spent at renewal/booking — redeeming here would burn them unused.
  return (reward.status === 'AVAILABLE' || reward.status === 'CLAIMED')
    && !REWARD_PASS_TYPES.includes(reward.rewardType);
}

function RewardValue({
  reward,
}: {
  reward: ReferralReward;
}) {
  const value = reward.rewardValue;
  if (value === undefined || value === null) {
    return <Typography variant="bodySmall" style={{ fontWeight: '700' }}>—</Typography>;
  }
  if (reward.rewardType === 'WALLET_CREDIT' || reward.rewardType === 'CASH'
    || (reward.rewardType === 'MEMBERSHIP_DISCOUNT' && reward.rewardUnit === 'AMOUNT')) {
    return (
      <Typography variant="bodySmall" style={{ fontWeight: '700', color: BrandColors.teal }}>
        <CurrencyValue amount={Number(value)} />
      </Typography>
    );
  }
  let text = String(value);
  if (reward.rewardType === 'MEMBERSHIP_EXTENSION') text = `${value} Day${value === 1 ? '' : 's'}`;
  else if (reward.rewardUnit === 'PERCENT') text = `${value}%`;
  else if (reward.rewardType === 'LOYALTY_POINTS') text = `${value} pts`;
  return <Typography variant="bodySmall" style={{ fontWeight: '700' }}>{text}</Typography>;
}

export function RewardQueueScreen() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pendingAction, setPendingAction] = useState<{ reward: ReferralReward; action: RewardAction } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, isLoading: isStatsLoading, refetch: refetchStats } = useRewardStats();
  const {
    data: rewardPage,
    isLoading: isRewardsLoading,
    error: rewardsError,
    refetch: refetchRewards,
  } = useRewards({ size: 50, status: statusFilter === 'all' ? undefined : statusFilter });
  const rewardAction = useRewardAction();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchRewards()]);
    setRefreshing(false);
  }, [refetchStats, refetchRewards]);

  const statValue = (value?: number) => (isStatsLoading ? '-' : value ?? 0);

  const rewards = rewardPage?.rewards ?? [];
  const hiddenCount = (rewardPage?.totalItems ?? 0) - rewards.length;

  const handleConfirmAction = () => {
    if (!pendingAction) return;
    const { reward, action } = pendingAction;
    rewardAction.mutate(
      { id: reward.id, action },
      {
        onSuccess: () => {
          toast.success(`Reward ${reward.rewardCode} ${ACTION_COPY[action].done}.`);
          setPendingAction(null);
        },
        onError: () => setPendingAction(null),
      },
    );
  };

  return (
    <View style={styles.screen}>
      <ReferralHeader
        title="Reward Queue"
        subtitle="Review, approve, and redeem rewards"
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BrandColors.teal}
            colors={[BrandColors.teal]}
          />
        }
      >
        <View style={styles.body}>
          {/* KPI Strip */}
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { backgroundColor: '#dbeafe' }]}>
              <Typography variant="caption" style={{ color: '#1e40af', fontSize: 10 }}>
                Total Generated
              </Typography>
              <Typography variant="subtitle" style={{ color: '#1d4ed8', fontSize: 18, fontWeight: '700' }}>
                {statValue(stats?.totalGenerated)}
              </Typography>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: '#fef9c3' }]}>
              <Typography variant="caption" style={{ color: '#854d0e', fontSize: 10 }}>
                Pending
              </Typography>
              <Typography variant="subtitle" style={{ color: '#a16207', fontSize: 18, fontWeight: '700' }}>
                {statValue(stats?.pendingApproval)}
              </Typography>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: '#dcfce7' }]}>
              <Typography variant="caption" style={{ color: '#166534', fontSize: 10 }}>
                Redeemed
              </Typography>
              <Typography variant="subtitle" style={{ color: '#15803d', fontSize: 18, fontWeight: '700' }}>
                {statValue(stats?.redeemed)}
              </Typography>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: '#fee2e2' }]}>
              <Typography variant="caption" style={{ color: '#991b1b', fontSize: 10 }}>
                Expired
              </Typography>
              <Typography variant="subtitle" style={{ color: '#b91c1c', fontSize: 18, fontWeight: '700' }}>
                {statValue(stats?.expired)}
              </Typography>
            </View>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterRow}>
            {FILTERS.map(({ key, label }) => (
              <Pressable
                key={key}
                style={[styles.filterTab, statusFilter === key && styles.filterTabActive]}
                onPress={() => setStatusFilter(key)}
              >
                <Typography
                  variant="caption"
                  style={[styles.filterTabText, statusFilter === key && styles.filterTabTextActive]}
                >
                  {label}
                </Typography>
              </Pressable>
            ))}
          </View>

          {/* Queue Items */}
          <Typography variant="subtitle" style={styles.sectionHeader}>
            Queue Items
          </Typography>

          {isRewardsLoading ? (
            <ActivityIndicator size="small" color={BrandColors.teal} style={styles.stateBlock} />
          ) : rewardsError ? (
            <Typography variant="bodySmall" style={[styles.stateBlock, { color: '#dc2626' }]}>
              Failed to load rewards. Pull down to retry.
            </Typography>
          ) : rewards.length === 0 ? (
            <Typography variant="bodySmall" color="textSecondary" style={styles.stateBlock}>
              {statusFilter === 'all' ? 'No rewards generated yet.' : 'No rewards match this filter.'}
            </Typography>
          ) : (
            rewards.map((item) => {
              const statusColor = STATUS_COLORS[item.status] ?? STATUS_COLORS.EXPIRED;
              const showApproveReject = canApproveOrReject(item);
              const showRedeem = canRedeem(item);

              return (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemHeaderInfo}>
                      <Typography variant="subtitle" style={styles.codeText}>
                        {item.rewardCode}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {item.memberId}
                        {item.memberType ? ` · ${item.memberType === 'REFERRER' ? 'Referrer' : 'Referee'}` : ''}
                      </Typography>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                      <Typography variant="caption" style={[styles.statusBadgeText, { color: statusColor.fg }]}>
                        {item.status}
                      </Typography>
                    </View>
                  </View>

                  <View style={styles.itemBody}>
                    <Typography variant="bodySmall">
                      Type:{' '}
                      <Typography variant="bodySmall" style={{ fontWeight: '600' }}>
                        {REWARD_TYPE_LABELS[item.rewardType] ?? item.rewardType}
                      </Typography>
                    </Typography>
                    <Typography variant="bodySmall">
                      Value: <RewardValue reward={item} />
                    </Typography>
                  </View>

                  {showApproveReject ? (
                    <View style={styles.actionRow}>
                      <Button
                        title="Approve"
                        onPress={() => setPendingAction({ reward: item, action: 'approve' })}
                        style={[styles.btn, { backgroundColor: '#16a34a' }]}
                      />
                      <Button
                        title="Reject"
                        variant="outline"
                        onPress={() => setPendingAction({ reward: item, action: 'reject' })}
                        style={[styles.btn, { borderColor: '#dc2626' }]}
                      />
                    </View>
                  ) : showRedeem ? (
                    <View style={styles.actionRow}>
                      <Button
                        title="Mark Redeemed"
                        onPress={() => setPendingAction({ reward: item, action: 'redeem' })}
                        style={styles.btn}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })
          )}

          {hiddenCount > 0 ? (
            <Typography variant="caption" color="textSecondary" style={styles.stateBlock}>
              Showing the latest {rewards.length} of {rewardPage?.totalItems} rewards.
            </Typography>
          ) : null}
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={!!pendingAction}
        title={pendingAction ? ACTION_COPY[pendingAction.action].title : ''}
        message={
          pendingAction
            ? `${pendingAction.reward.rewardCode} · ${pendingAction.reward.memberId}`
            : ''
        }
        confirmText={pendingAction ? ACTION_COPY[pendingAction.action].confirm : 'Confirm'}
        variant={pendingAction?.action === 'reject' ? 'danger' : 'primary'}
        icon={pendingAction?.action === 'reject' ? 'x-circle' : 'check-circle'}
        loading={rewardAction.isPending}
        onConfirm={handleConfirmAction}
        onClose={() => setPendingAction(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  body: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  kpiCard: {
    flex: 1,
    padding: Spacing.two,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Radius.md,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterTabActive: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.textSecondary,
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  itemHeaderInfo: {
    flex: 1,
    marginRight: Spacing.two,
  },
  codeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  btn: {
    flex: 1,
  },
  stateBlock: {
    marginVertical: Spacing.three,
    textAlign: 'center',
  },
});
