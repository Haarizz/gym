import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type {
  NotificationFilter,
  NotificationGroup,
  NotificationItem as NotificationItemType,
} from '../../domain/notification.types';
import { NotificationItemRow } from './NotificationItem';

interface NotificationListProps {
  sections: NotificationGroup[];
  filter: NotificationFilter;
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage?: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  onItemPress: (item: NotificationItemType) => void;
}

export function NotificationList({
  sections,
  filter,
  isLoading,
  isFetching,
  isFetchingNextPage,
  hasNextPage,
  onRefresh,
  onLoadMore,
  onItemPress,
}: NotificationListProps) {
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={BrandColors.teal} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  const isEmpty = sections.length === 0 || sections.every((s) => s.data.length === 0);

  if (isEmpty) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Feather
            name={filter === 'UNREAD' ? 'check-circle' : 'bell-off'}
            size={32}
            color={BrandColors.teal}
          />
        </View>
        <Text style={styles.emptyTitle}>
          {filter === 'UNREAD' ? "You're all caught up!" : 'No notifications'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {filter === 'UNREAD'
            ? 'There are no unread notifications.'
            : 'New updates and alerts will appear here.'}
        </Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <NotificationItemRow notification={item} onPress={onItemPress} />
      )}
      renderSectionHeader={({ section: { title, count } }) => (
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionHeaderText}>
            {title} ({count})
          </Text>
          <View style={styles.sectionDivider} />
        </View>
      )}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isFetchingNextPage && !isLoading}
          onRefresh={onRefresh}
          colors={[BrandColors.teal]}
          tintColor={BrandColors.teal}
        />
      }
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          onLoadMore();
        }
      }}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={BrandColors.teal} />
          </View>
        ) : null
      }
      stickySectionHeadersEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 24,
  },
  sectionHeaderContainer: {
    backgroundColor: BrandColors.screenBackground,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#CBD5E1',
    marginTop: 6,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: BrandColors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
