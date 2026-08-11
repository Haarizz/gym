import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Spacing } from '@/core/theme';
import { Typography } from '@/shared/components';

import { useCommunityFeed } from '../../hooks/useCommunity';
import { CommunityFeed } from '../components/CommunityFeed';
import { CommunityCommentsSheet } from '../components/CommunityCommentsSheet';
import type { CommunityPost } from '../../domain/community.types';

/**
 * Achievements screen — reuses CommunityFeed with type hardcoded to 'achievement'.
 * No duplicate feed implementation.
 */
export function CommunityAchievementsScreen() {
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);

  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useCommunityFeed({ type: 'achievement' });

  const posts: CommunityPost[] = data?.pages.flatMap((page) => page.posts) ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Feather name="award" size={18} color="#F59E0B" />
        <Typography variant="bodySmallBold" style={styles.sectionTitle}>
          Community Achievements
        </Typography>
      </View>

      <CommunityFeed
        posts={posts}
        isLoading={isLoading}
        isError={isError}
        isFetchingNextPage={!!isFetchingNextPage}
        hasNextPage={!!hasNextPage}
        isRefreshing={isRefetching}
        onEndReached={() => fetchNextPage()}
        onRefresh={() => refetch()}
        onCommentsPress={(postId) => setSelectedPostId(postId)}
      />

      <CommunityCommentsSheet
        postId={selectedPostId}
        visible={selectedPostId !== null}
        onClose={() => setSelectedPostId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  sectionTitle: {
    fontSize: 15,
  },
});
