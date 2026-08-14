import React, { useState, useMemo, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { ReferralHeader } from '../components/ReferralHeader';
import { ReferralActivityList } from '../components/ReferralActivityList';
import { ReferralDetailsSheet } from '../components/ReferralDetailsSheet';
import { ReferralFormModal } from '../components/ReferralFormModal';
import { useReferrals } from '../../hooks/useReferrals';
import {
  useDeleteReferral,
  useMarkReferralSuccessful,
} from '../../hooks/useReferralActions';
import type { Referral } from '../../domain/Referral';

export function ReferralActivityScreen() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'successful' | 'expired'>(
    'all'
  );
  const [refreshing, setRefreshing] = useState(false);

  const { data: referralsPage, isLoading, refetch } = useReferrals({ size: 1000 });
  const deleteMutation = useDeleteReferral();
  const markSuccessfulMutation = useMarkReferralSuccessful();

  const referrals = referralsPage?.referrals ?? [];

  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [editingReferral, setEditingReferral] = useState<Referral | null>(null);
  const [showViewSheet, setShowViewSheet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const filteredReferrals = useMemo(() => {
    if (statusFilter === 'all') return referrals;
    return referrals.filter((r) => (r.status || '').toLowerCase() === statusFilter);
  }, [referrals, statusFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleDelete = (referral: Referral) => {
    Alert.alert(
      'Delete Referral',
      `Are you sure you want to delete referral for ${referral.refereeName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(Number(referral.id), {
              onSuccess: () => {
                Alert.alert('Deleted', 'Referral deleted.');
                refetch();
              },
              onError: (err) => {
                Alert.alert('Error', err.message || 'Failed to delete referral.');
              },
            });
          },
        },
      ]
    );
  };

  const handleMarkSuccessful = (referral: Referral) => {
    markSuccessfulMutation.mutate(
      { id: Number(referral.id) },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Referral marked as successful.');
          refetch();
        },
        onError: (err) => {
          Alert.alert('Error', err.message || 'Failed to update referral.');
        },
      }
    );
  };

  return (
    <View style={styles.screen}>
      <ReferralHeader
        title="Referral Activity"
        subtitle="Track and manage referral activity and logs"
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
          {/* Status Filter Tabs */}
          <View style={styles.filterRow}>
            {(['all', 'pending', 'successful', 'expired'] as const).map((st) => (
              <Pressable
                key={st}
                style={[styles.filterTab, statusFilter === st && styles.filterTabActive]}
                onPress={() => setStatusFilter(st)}
              >
                <Typography
                  variant="caption"
                  style={[styles.filterTabText, statusFilter === st && styles.filterTabTextActive]}
                >
                  {st === 'all' ? 'All' : st.charAt(0).toUpperCase() + st.slice(1)}
                </Typography>
              </Pressable>
            ))}
          </View>

          {/* Activity List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={BrandColors.teal} />
              <Typography variant="bodySmall" color="textSecondary" style={{ marginTop: 8 }}>
                Loading referral activity...
              </Typography>
            </View>
          ) : (
            <ReferralActivityList
              referrals={filteredReferrals}
              onView={(r) => {
                setSelectedReferral(r);
                setShowViewSheet(true);
              }}
              onEdit={(r) => {
                setEditingReferral(r);
                setShowEditModal(true);
              }}
              onDelete={handleDelete}
              onMarkSuccessful={handleMarkSuccessful}
            />
          )}
        </View>
      </ScrollView>

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

      {/* Edit Form Modal */}
      {showEditModal && (
        <ReferralFormModal
          visible={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingReferral(null);
          }}
          editingReferral={editingReferral}
          onSuccess={() => refetch()}
        />
      )}
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
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    padding: Spacing.five,
    alignItems: 'center',
  },
});
