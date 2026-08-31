import React, { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { Button } from '@/shared/components/Button';
import { useCurrency, CurrencyGlyph } from '@/core/providers/CurrencyProvider';
import { ReferralHeader } from '../components/ReferralHeader';
import { useRewardStats } from '@/domains/rewards';

import { toast } from '@/shared/components/Toasts/toastStore';

export function RewardQueueScreen() {
  const router = useRouter();
  const { currencyCode } = useCurrency();
  const { data: stats, isLoading: isStatsLoading, refetch } = useRewardStats();
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'redeemed'>('all');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const totalGenerated = stats?.totalGenerated ?? 12;
  const pendingApproval = stats?.pendingApproval ?? 3;
  const redeemedCount = stats?.redeemed ?? 7;
  const expiredCount = stats?.expired ?? 2;

  const mockQueueItems = [
    {
      id: 1,
      code: 'REW-9901',
      memberId: 'MEM-101',
      memberName: 'Sarah Connor',
      type: 'Wallet Credit',
      value: 50,
      status: 'PENDING',
      date: '2026-08-10',
    },
    {
      id: 2,
      code: 'REW-9902',
      memberId: 'MEM-104',
      memberName: 'John Matrix',
      type: 'Membership Extension',
      value: 7,
      isDays: true,
      status: 'PENDING',
      date: '2026-08-11',
    },
    {
      id: 3,
      code: 'REW-9903',
      memberId: 'MEM-108',
      memberName: 'Alex Murphy',
      type: 'Free PT',
      value: 1,
      status: 'REDEEMED',
      date: '2026-08-08',
    },
  ];

  const filteredItems = mockQueueItems.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.status.toLowerCase() === statusFilter;
  });

  const handleAction = (code: string, action: string) => {
    toast.info(`Reward ${code} ${action.toLowerCase()} successfully.`);
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
                {totalGenerated}
              </Typography>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: '#fef9c3' }]}>
              <Typography variant="caption" style={{ color: '#854d0e', fontSize: 10 }}>
                Pending
              </Typography>
              <Typography variant="subtitle" style={{ color: '#a16207', fontSize: 18, fontWeight: '700' }}>
                {pendingApproval}
              </Typography>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: '#dcfce7' }]}>
              <Typography variant="caption" style={{ color: '#166534', fontSize: 10 }}>
                Redeemed
              </Typography>
              <Typography variant="subtitle" style={{ color: '#15803d', fontSize: 18, fontWeight: '700' }}>
                {redeemedCount}
              </Typography>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: '#fee2e2' }]}>
              <Typography variant="caption" style={{ color: '#991b1b', fontSize: 10 }}>
                Expired
              </Typography>
              <Typography variant="subtitle" style={{ color: '#b91c1c', fontSize: 18, fontWeight: '700' }}>
                {expiredCount}
              </Typography>
            </View>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterRow}>
            {(['all', 'pending', 'redeemed'] as const).map((st) => (
              <Pressable
                key={st}
                style={[styles.filterTab, statusFilter === st && styles.filterTabActive]}
                onPress={() => setStatusFilter(st)}
              >
                <Typography
                  variant="caption"
                  style={[styles.filterTabText, statusFilter === st && styles.filterTabTextActive]}
                >
                  {st.toUpperCase()}
                </Typography>
              </Pressable>
            ))}
          </View>

          {/* Queue Items */}
          <Typography variant="subtitle" style={styles.sectionHeader}>
            Queue Items
          </Typography>

          {filteredItems.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View>
                  <Typography variant="subtitle" style={styles.codeText}>
                    {item.code}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {item.memberName} ({item.memberId})
                  </Typography>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    item.status === 'PENDING'
                      ? { backgroundColor: '#fef9c3' }
                      : { backgroundColor: '#dcfce7' },
                  ]}
                >
                  <Typography
                    variant="caption"
                    style={[
                      styles.statusBadgeText,
                      item.status === 'PENDING' ? { color: '#a16207' } : { color: '#15803d' },
                    ]}
                  >
                    {item.status}
                  </Typography>
                </View>
              </View>

              <View style={styles.itemBody}>
                <Typography variant="bodySmall">
                  Type: <Typography variant="bodySmall" style={{ fontWeight: '600' }}>{item.type}</Typography>
                </Typography>
                <Typography variant="bodySmall">
                  Value:{' '}
                  {item.isDays ? (
                    <Typography variant="bodySmall" style={{ fontWeight: '700' }}>
                      {item.value} Days
                    </Typography>
                  ) : (
                    <Typography variant="bodySmall" style={{ fontWeight: '700', color: BrandColors.teal }}>
                      <CurrencyGlyph code={currencyCode} /> {item.value}
                    </Typography>
                  )}
                </Typography>
              </View>

              {item.status === 'PENDING' ? (
                <View style={styles.actionRow}>
                  <Button
                    title="Approve"
                    onPress={() => handleAction(item.code, 'Approve')}
                    style={[styles.btn, { backgroundColor: '#16a34a' }]}
                  />
                  <Button
                    title="Reject"
                    variant="outline"
                    onPress={() => handleAction(item.code, 'Reject')}
                    style={[styles.btn, { borderColor: '#dc2626' }]}
                  />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
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
});
