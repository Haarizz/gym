import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { SearchBar } from '@/shared/components';

import { useCommunityFeed } from '../../hooks/useCommunity';
import { useCommunityFilters } from '../hooks/useCommunityFilters';
import { CommunityFeed } from '../components/CommunityFeed';
import { CommunityPostFilters } from '../components/CommunityPostFilters';
import { CommunityCommentsSheet } from '../components/CommunityCommentsSheet';
import type { CommunityPost } from '../../domain/community.types';

export function CommunityFeedScreen() {
  const { searchInput, setSearchInput, debouncedQuery, selectedType, setSelectedType } =
    useCommunityFilters();

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
  } = useCommunityFeed({ q: debouncedQuery || undefined, type: selectedType });

  // Flatten infinite query pages into a single post array.
  const posts: CommunityPost[] =
    data?.pages.flatMap((page) => page.posts) ?? [];

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <SearchBar
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search community posts…"
        />
      </View>

      {/* Type filter pills */}
      <CommunityPostFilters selectedType={selectedType} onSelectType={setSelectedType} />

      {/* Feed */}
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

      {/* Comments sheet — opened lazily per post */}
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
  searchWrap: {
    paddingHorizontal: 18,
    marginTop: -18,
    paddingBottom: 4,
    zIndex: 1,
  },
});
