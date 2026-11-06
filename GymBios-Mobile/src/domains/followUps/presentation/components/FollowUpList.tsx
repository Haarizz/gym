import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from '@/shared/components/AppText';
import { useTranslation } from 'react-i18next';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { FollowUp } from '../../domain/FollowUp';
import { useTabBarBottomInset } from '@/shared/layouts/ScreenLayout';
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
  /** Shown below the cards (only when there are any), e.g. pagination and an add button. */
  ListFooterComponent?: React.ReactElement | null;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
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
  ListFooterComponent,
  emptyActionLabel,
  onEmptyAction,
}: FollowUpListProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const bottomInset = useTabBarBottomInset();

  if (loading && followUps.length === 0) {
    return (
      <View style={styles.stateContainer}>
        {ListHeaderComponent}
        <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={BrandColors.teal} style={styles.spinner} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          {t('followUps.loadingFollowUps')}
        </Text>
        </View>
      </View>
    );
  }

  if (error && followUps.length === 0) {
    return (
      <View style={styles.stateContainer}>
        {ListHeaderComponent}
        <View style={styles.centerContainer}>
        <Feather name="alert-circle" size={48} color="#dc2626" />
        <Text style={[styles.errorTitle, { color: theme.text }]}>
          {t('followUps.failedLoadFollowUps')}
        </Text>
        <Text style={[styles.errorSubtitle, { color: theme.textSecondary }]}>
          {error.message || t('common.networkError')}
        </Text>
        {onRefresh ? (
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: BrandColors.teal }]}
            onPress={onRefresh}
          >
            <Feather name="refresh-cw" size={16} color="#ffffff" />
            <Text style={styles.retryBtnText}>{t('followUps.retry')}</Text>
          </TouchableOpacity>
        ) : null}
        </View>
      </View>
    );
  }

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconBg, { backgroundColor: BrandColors.teal + '15' }]}>
        <Feather name="check-square" size={36} color={BrandColors.teal} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('followUps.noFollowUpsFound')}</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        {t('followUps.noFollowUpsFoundDesc')}
      </Text>
      {emptyActionLabel && onEmptyAction ? (
        <TouchableOpacity
          style={[styles.retryBtn, styles.emptyAction, { backgroundColor: BrandColors.teal }]}
          onPress={onEmptyAction}
        >
          <Feather name="plus" size={16} color="#ffffff" />
          <Text style={styles.retryBtnText}>{emptyActionLabel}</Text>
        </TouchableOpacity>
      ) : null}
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
      ListFooterComponent={followUps.length > 0 ? ListFooterComponent : null}
      contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset + Spacing.six }]}
      showsVerticalScrollIndicator={false}
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
    flexGrow: 1,
    paddingHorizontal: Spacing.three,
  },
  stateContainer: {
    flex: 1,
    paddingHorizontal: Spacing.three,
  },
  centerContainer: {
    paddingVertical: Spacing.four,
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
  emptyAction: {
    marginTop: Spacing.three,
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
