import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { FollowUp } from '../../domain/FollowUp';
import { FollowUpCard } from './FollowUpCard';

interface FollowUpListProps {
  followUps: FollowUp[];
  loading?: boolean;
  error?: Error | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  onView?: (followUp: FollowUp) => void;
  onEdit?: (followUp: FollowUp) => void;
  onDelete?: (followUp: FollowUp) => void;
  onComplete?: (followUp: FollowUp) => void;
  onReschedule?: (followUp: FollowUp) => void;
  onCancel?: (followUp: FollowUp) => void;
  onCall?: (followUp: FollowUp) => void;
  onEmail?: (followUp: FollowUp) => void;
  ListHeaderComponent?: React.ReactElement | null;
}

export function FollowUpList({
  followUps,
  loading = false,
  error = null,
  refreshing = false,
  onRefresh,
  onView,
  onEdit,
  onDelete,
  onComplete,
  onReschedule,
  onCancel,
  onCall,
  onEmail,
  ListHeaderComponent,
}: FollowUpListProps) {
  const theme = useTheme();

  if (loading && followUps.length === 0) {
    return (
      <View style={styles.centerContainer}>
        {ListHeaderComponent}
        <ActivityIndicator size="large" color={BrandColors.teal} style={styles.spinner} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading follow-ups...
        </Text>
      </View>
    );
  }

  if (error && followUps.length === 0) {
    return (
      <View style={styles.centerContainer}>
        {ListHeaderComponent}
        <Feather name="alert-circle" size={48} color="#dc2626" />
        <Text style={[styles.errorTitle, { color: theme.text }]}>
          Failed to load follow-ups
        </Text>
        <Text style={[styles.errorSubtitle, { color: theme.textSecondary }]}>
          {error.message || 'An unexpected network error occurred.'}
        </Text>
        {onRefresh ? (
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: BrandColors.teal }]}
            onPress={onRefresh}
          >
            <Feather name="refresh-cw" size={16} color="#ffffff" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconBg, { backgroundColor: BrandColors.teal + '15' }]}>
        <Feather name="check-square" size={36} color={BrandColors.teal} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No follow-ups found</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        There are no follow-up tasks matching your current search or filter criteria.
      </Text>
    </View>
  );

  return (
    <FlatList
      data={followUps}
      keyExtractor={item => String(item.id)}
      renderItem={({ item }) => (
        <FollowUpCard
          followUp={item}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onComplete={onComplete}
          onReschedule={onReschedule}
          onCancel={onCancel}
          onCall={onCall}
          onEmail={onEmail}
        />
      )}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={renderEmptyComponent}
      contentContainerStyle={styles.listContent}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[BrandColors.teal]}
            tintColor={BrandColors.teal}
          />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four * 2,
  },
  centerContainer: {
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginVertical: Spacing.three,
  },
  loadingText: {
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: Spacing.two,
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.one,
    marginBottom: Spacing.three,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.four * 2,
    paddingHorizontal: Spacing.three,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.one,
    maxWidth: 280,
  },
});
