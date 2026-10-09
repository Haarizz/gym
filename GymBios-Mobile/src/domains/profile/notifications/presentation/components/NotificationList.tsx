import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Feather from '@expo/vector-icons/Feather';
import type {
  NotificationFilter,
  NotificationGroup,
  NotificationItem as NotificationItemType,
} from '../../domain/notification.types';
import { NotificationItemRow } from './NotificationItem';
import { NotificationGlass as G } from './notificationGlass';

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
  /** Space reserved under the last card so it can scroll clear of the floating footer. */
  bottomInset?: number;
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
  bottomInset = 24,
}: NotificationListProps) {
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={G.teal} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  const isEmpty = sections.length === 0 || sections.every((s) => s.data.length === 0);

  if (isEmpty) {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.emptyContainer}>
        <View style={styles.emptyBubble}>
          <Feather name={filter === 'UNREAD' ? 'check' : 'bell-off'} size={28} color={G.teal} />
        </View>
        <Text style={styles.emptyTitle}>
          {filter === 'UNREAD' ? "You're all caught up" : 'No notifications yet'}
        </Text>
        <Text style={styles.emptySubtitle}>
          New updates about payments, classes and check-ins will show up here.
        </Text>
      </Animated.View>
    );
  }

  // Stagger index runs across sections so the second group continues the cascade.
  const sectionOffsets = sections.reduce<number[]>((acc, s, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + sections[i - 1].data.length);
    return acc;
  }, []);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item, index, section }) => (
        <NotificationItemRow
          notification={item}
          onPress={onItemPress}
          index={sectionOffsets[sections.indexOf(section)] + index}
        />
      )}
      renderSectionHeader={({ section: { title, count } }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{title}</Text>
          <Text style={styles.sectionCount}>{count}</Text>
        </View>
      )}
      ItemSeparatorComponent={ItemGap}
      SectionSeparatorComponent={SectionGap}
      contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isFetchingNextPage && !isLoading}
          onRefresh={onRefresh}
          colors={[G.teal]}
          tintColor={G.teal}
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
            <ActivityIndicator size="small" color={G.teal} />
          </View>
        ) : null
      }
      stickySectionHeadersEnabled={false}
    />
  );
}

function ItemGap() {
  return <View style={{ height: 8 }} />;
}

function SectionGap() {
  return <View style={{ height: 8 }} />;
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingTop: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#3B4844',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: G.ink3,
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
    fontWeight: '600',
    color: G.ink2,
  },
  emptyContainer: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 64,
    paddingHorizontal: 24,
  },
  emptyBubble: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: G.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: G.ink,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: G.ink2,
    textAlign: 'center',
    maxWidth: 250,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
