import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { useCommunityTheme } from '../../hooks/useCommunityTheme';
import { useTheme } from '@/core/hooks';
import { BrandColors, Spacing } from '@/core/theme';
import { EmptyState, Loader } from '@/shared/components';

import type { CommunityPost } from '../../domain/community.types';
import { CommunityPostCard } from './CommunityPostCard';

interface CommunityFeedProps {
  posts: CommunityPost[];
  isLoading: boolean;
  isError: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  isRefreshing: boolean;
  onEndReached: () => void;
  onRefresh: () => void;
  onCommentsPress: (postId: number) => void;
}

export function CommunityFeed({
  posts,
  isLoading,
  isError,
  isFetchingNextPage,
  hasNextPage,
  isRefreshing,
  onEndReached,
  onRefresh,
  onCommentsPress,
}: CommunityFeedProps) {
  const { primaryColor, headerColors } = useCommunityTheme();
  const theme = useTheme();

  if (isLoading && posts.length === 0) {
    return (
      <View style={styles.centered}>
        <Loader message="Loading community posts…" />
      </View>
    );
  }

  if (isError && posts.length === 0) {
    return (
      <View style={styles.centered}>
        <EmptyState
          icon="wifi-off"
          title="Could not load posts"
          description="Check your connection and try again."
          buttonLabel="Retry"
          onPress={onRefresh}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <CommunityPostCard post={item} onCommentsPress={onCommentsPress} />
      )}
      contentContainerStyle={[
        styles.list,
        posts.length === 0 && styles.emptyList,
      ]}
      ListEmptyComponent={
        <EmptyState
          icon="message-square"
          title="No posts yet"
          description="Be the first to share something with the community!"
        />
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator size="small" color={primaryColor} />
          </View>
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={primaryColor}
          colors={[primaryColor]}
        />
      }
      onEndReached={hasNextPage ? onEndReached : undefined}
      onEndReachedThreshold={0.3}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  list: {
    paddingTop: 14,
    paddingBottom: 100,
    gap: 12,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
