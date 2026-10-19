import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { BrandColors, Spacing } from '@/core/theme';
import { EmptyState } from '@/shared/components/EmptyState';
import { Loader } from '@/shared/components/Loader';
import type { Lead } from '../../domain/Lead';
import { LeadCard } from './LeadCard';

interface LeadListProps {
  leads: Lead[];
  loading: boolean;
  error?: Error | null;
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached?: () => void;
  loadingMore?: boolean;
  isSelected: (id: number) => boolean;
  onToggleSelect: (id: number) => void;
  onCall: (lead: Lead) => void;
  onEmail: (lead: Lead) => void;
  onMessage: (lead: Lead) => void;
  onView: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  ListHeaderComponent?: React.ReactElement | null;
}

export function LeadList({
  leads,
  loading,
  error,
  refreshing,
  onRefresh,
  onEndReached,
  loadingMore = false,
  isSelected,
  onToggleSelect,
  onCall,
  onEmail,
  onMessage,
  onView,
  onEdit,
  onDelete,
  ListHeaderComponent,
}: LeadListProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const renderItem = useCallback(
    ({ item }: { item: Lead }) => (
      <LeadCard
        lead={item}
        isSelected={isSelected(item.id)}
        onToggleSelect={onToggleSelect}
        onCall={onCall}
        onEmail={onEmail}
        onMessage={onMessage}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
    [isSelected, onToggleSelect, onCall, onEmail, onMessage, onView, onEdit, onDelete],
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoading}>
        <ActivityIndicator size="small" color={BrandColors.teal} />
      </View>
    );
  }, [loadingMore]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    if (error) {
      return (
        <EmptyState
          title={t('leads.list.failedToLoadTitle')}
          description={t('leads.list.failedToLoadDesc')}
          icon="alert-circle"
        />
      );
    }
    return (
      <EmptyState
        title={t('leads.list.emptyTitle')}
        description={t('leads.list.emptyDesc')}
        icon="users"
      />
    );
  }, [loading, error, t]);

  if (loading && leads.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        {ListHeaderComponent}
        <Loader />
      </View>
    );
  }

  return (
    <FlatList
      data={leads}
      keyExtractor={item => String(item.id)}
      renderItem={renderItem}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      contentContainerStyle={styles.listContent}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: Spacing.six,
  },
  footerLoading: {
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
