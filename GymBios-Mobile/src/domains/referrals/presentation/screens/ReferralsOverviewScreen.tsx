import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Alert } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { ReferralHeader } from '../components/ReferralHeader';
import { ReferralLeaderboard } from '../components/ReferralLeaderboard';
import { ReferralActivityList } from '../components/ReferralActivityList';
import { ReferralFormModal } from '../components/ReferralFormModal';
import { ReferralDetailsSheet } from '../components/ReferralDetailsSheet';
import { useReferrals } from '../../hooks/useReferrals';
import { useFixReferralRewards, useMarkReferralSuccessful } from '../../hooks/useReferralActions';
import type { Referral } from '../../domain/Referral';

export function ReferralsOverviewScreen() {
  const router = useRouter();
  const { data: referralsPage, isLoading, refetch } = useReferrals({ size: 1000 });
  const fixRewardsMutation = useFixReferralRewards();
  const markSuccessfulMutation = useMarkReferralSuccessful();

  const referrals = referralsPage?.referrals ?? [];

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [showViewSheet, setShowViewSheet] = useState(false);

  const handleRefreshData = () => {
    fixRewardsMutation.mutate(undefined, {
      onSuccess: () => {
        Alert.alert('Refreshed', 'Data refreshed and rewards fixed.');
        refetch();
      },
      onError: (err) => {
        Alert.alert('Refresh Failed', err.message || 'Failed to refresh data.');
      },
    });
  };

  const handleExportCsv = () => {
    const csvLines = [
      'Referrer,Referee,Email,Status,Reward,Date',
      ...referrals.map(
        (r) =>
          `"${r.referrerName}","${r.refereeName}","${r.refereeEmail || ''}","${r.status}","${r.rewardAmount || 0}","${r.date || r.createdAt}"`
      ),
    ];
    Alert.alert('CSV Export', `Generated CSV report with ${referrals.length} records.`);
  };

  const handleMarkSuccessful = (referral: Referral) => {
    markSuccessfulMutation.mutate({ id: Number(referral.id) }, {
      onSuccess: () => {
        Alert.alert('Success', 'Referral marked as successful.');
        refetch();
      },
    });
  };

  return (
    <View style={styles.screen}>
      <ReferralHeader
        title="Referrals Overview"
        subtitle="Referral leaderboard and quick management"
        onBack={() => router.back()}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.body}>
          {/* Quick Actions */}
          <View style={styles.sectionCard}>
            <Typography variant="subtitle" style={styles.sectionTitle}>
              Quick Actions
            </Typography>
            <View style={styles.quickActionsGrid}>
              <Pressable style={styles.actionCard} onPress={() => setShowAddModal(true)}>
                <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
                  <Feather name="plus-circle" size={20} color="#2563eb" />
                </View>
                <Typography variant="bodySmall" style={styles.actionText}>
                  Add Referral
                </Typography>
              </Pressable>

              <Pressable style={styles.actionCard} onPress={handleRefreshData}>
                <View style={[styles.actionIcon, { backgroundColor: '#dcfce7' }]}>
                  <Feather name="refresh-cw" size={20} color="#16a34a" />
                </View>
                <Typography variant="bodySmall" style={styles.actionText}>
                  Refresh Data
                </Typography>
              </Pressable>

              <Pressable style={styles.actionCard} onPress={handleExportCsv}>
                <View style={[styles.actionIcon, { backgroundColor: '#f3e8ff' }]}>
                  <Feather name="download" size={20} color="#9333ea" />
                </View>
                <Typography variant="bodySmall" style={styles.actionText}>
                  Export CSV
                </Typography>
              </Pressable>

              <Pressable
                style={styles.actionCard}
                onPress={() => router.push('/(admin)/referrals/settings')}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#f1f5f9' }]}>
                  <Feather name="settings" size={20} color="#475569" />
                </View>
                <Typography variant="bodySmall" style={styles.actionText}>
                  Settings
                </Typography>
              </Pressable>
            </View>
          </View>

          {/* Top Referrers Leaderboard */}
          <ReferralLeaderboard referrals={referrals} />

          {/* Recent Activity Log */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Typography variant="subtitle" style={styles.sectionTitle}>
                Recent Activity
              </Typography>
              <Pressable onPress={() => router.push('/(admin)/referrals/activity')}>
                <Typography variant="caption" style={styles.viewAllText}>
                  View All →
                </Typography>
              </Pressable>
            </View>

            <ReferralActivityList
              referrals={referrals}
              maxItems={5}
              onView={(r) => {
                setSelectedReferral(r);
                setShowViewSheet(true);
              }}
              onMarkSuccessful={handleMarkSuccessful}
            />
          </View>
        </View>
      </ScrollView>

      {/* Add Referral Modal */}
      <ReferralFormModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => refetch()}
      />

      {/* View Details Sheet */}
      <ReferralDetailsSheet
        visible={showViewSheet}
        onClose={() => {
          setShowViewSheet(false);
          setSelectedReferral(null);
        }}
        referral={selectedReferral}
        onSuccess={() => refetch()}
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
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    marginBottom: Spacing.three,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.two,
  },
  viewAllText: {
    color: BrandColors.teal,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: Radius.md,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
});
