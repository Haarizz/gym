import { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { formatDistanceToNow } from 'date-fns';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppBottomSheet, Typography } from '@/shared/components';
import { Avatar } from '@/shared/components/Avatar';
import { useAuthStore } from '@/domains/auth';
import {
  useToggleCommunityLike,
  useDeleteCommunityPost,
  useArchiveCommunityPost,
  useUnarchiveCommunityPost,
} from '../../hooks/useCommunityActions';
import type { CommunityPost } from '../../domain/community.types';

// Roles that are permitted to moderate (archive/unarchive) posts.
const MODERATOR_ROLES = ['admin', 'staff'] as const;

/** Returns a display colour for a given post type. */
function getTypeColor(type: string): string {
  switch (type) {
    case 'achievement': return BrandColors.teal;
    case 'question': return '#3b82f6';
    case 'tip': return '#8b5cf6';
    default: return '#94a3b8';
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'achievement': return '🏆 Achievement';
    case 'question': return '❓ Question';
    case 'tip': return '💡 Tip';
    default: return type;
  }
}

function getAspectRatioNumeric(ratio: string | null | undefined): number {
  if (!ratio) return 1;
  const parts = ratio.split(':');
  if (parts.length !== 2) return 1;
  const w = parseFloat(parts[0]);
  const h = parseFloat(parts[1]);
  if (!w || !h) return 1;
  return w / h;
}

interface CommunityPostCardProps {
  post: CommunityPost;
  onCommentsPress: (postId: number) => void;
}

export function CommunityPostCard({ post, onCommentsPress }: CommunityPostCardProps) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const appRole = useAuthStore((s) => s.appRole);

  const [actionsVisible, setActionsVisible] = useState(false);

  const likeMutation = useToggleCommunityLike();
  const deleteMutation = useDeleteCommunityPost();
  const archiveMutation = useArchiveCommunityPost();
  const unarchiveMutation = useUnarchiveCommunityPost();

  const isOwnPost = user?.id != null && Number(user.id) === post.authorUserId;
  const isModerator = appRole != null && (MODERATOR_ROLES as readonly string[]).includes(appRole);

  const isPendingLike = likeMutation.isPending;

  const initials = post.authorUsername
    ? post.authorUsername.slice(0, 2).toUpperCase()
    : '??';

  const timeAgo = post.createdAt
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
    : '';

  const typeColor = getTypeColor(post.type);

  const handleLike = useCallback(() => {
    if (isPendingLike) return;
    likeMutation.mutate(post.id);
  }, [isPendingLike, likeMutation, post.id]);

  const handleActions = useCallback(() => {
    setActionsVisible(true);
  }, []);

  const showActionsMenu = isOwnPost || isModerator;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement },
        post.archived && styles.archived,
      ]}
    >
      {/* Actions Sheet */}
      <AppBottomSheet
        visible={actionsVisible}
        title="Post Actions"
        onClose={() => setActionsVisible(false)}
      >
        <View style={styles.actionsList}>
          {isOwnPost && (
            <Pressable
              style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
              onPress={() => {
                setActionsVisible(false);
                Alert.alert('Delete Post', 'This action cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(post.id) },
                ]);
              }}
            >
              <Feather name="trash-2" size={20} color={theme.error} />
              <Typography variant="body" color="error">Delete Post</Typography>
            </Pressable>
          )}

          {isModerator && (
            <Pressable
              style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
              onPress={() => {
                setActionsVisible(false);
                if (post.archived) {
                  unarchiveMutation.mutate(post.id);
                } else {
                  Alert.alert('Archive Post', 'Hide this post from the main feed?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Archive', onPress: () => archiveMutation.mutate(post.id) },
                  ]);
                }
              }}
            >
              <Feather name="archive" size={20} color={theme.text} />
              <Typography variant="body">{post.archived ? 'Unarchive Post' : 'Archive Post'}</Typography>
            </Pressable>
          )}
        </View>
      </AppBottomSheet>

      {/* Author row */}
      <View style={styles.authorRow}>
        <Avatar initials={initials} size={38} />
        <View style={styles.authorMeta}>
          <View style={styles.authorNameRow}>
            <Typography variant="bodySmallBold" numberOfLines={1} style={styles.authorName}>
              {post.authorUsername}
            </Typography>
            {post.authorRoles?.length > 0 && (
              <View style={[styles.roleBadge, { backgroundColor: theme.muted }]}>
                <Typography variant="caption" style={styles.roleBadgeText}>
                  {post.authorRoles?.[0]}
                </Typography>
              </View>
            )}
          </View>
          <Typography variant="caption" color="textSecondary">
            {timeAgo}
          </Typography>
        </View>

        <View style={styles.typeBadgeWrap}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '18' }]}>
            <Typography variant="caption" style={[styles.typeBadgeText, { color: typeColor }]}>
              {getTypeLabel(post.type)}
            </Typography>
          </View>
        </View>

        {showActionsMenu && (
          <Pressable
            style={({ pressed }) => [styles.menuButton, pressed && styles.menuButtonPressed]}
            onPress={handleActions}
            hitSlop={8}
            accessibilityLabel="Post actions"
          >
            <Feather name="more-vertical" size={18} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Topic */}
      {!!post.topic && (
        <Typography variant="bodySmallBold" style={styles.topic} numberOfLines={2}>
          {post.topic}
        </Typography>
      )}

      {/* Content */}
      <Typography variant="bodySmall" color="textSecondary" style={styles.content}>
        {post.content}
      </Typography>

      {/* Image */}
      {post.image?.dataUrl ? (
        <View
          style={[
            styles.imageWrap,
            { aspectRatio: getAspectRatioNumeric(post.image.aspectRatio) },
          ]}
        >
          <Image
            source={{ uri: post.image.dataUrl }}
            style={styles.image}
            resizeMode="cover"
            accessibilityLabel="Post image"
          />
        </View>
      ) : null}

      {/* Archived label */}
      {post.archived && (
        <View style={styles.archivedBanner}>
          <Feather name="archive" size={12} color={theme.textSecondary} />
          <Typography variant="caption" color="textSecondary" style={{ marginLeft: 4 }}>
            Archived
          </Typography>
        </View>
      )}

      {/* Interaction row */}
      <View style={styles.interactions}>
        <Pressable
          style={({ pressed }) => [styles.interactionBtn, pressed && styles.interactionPressed]}
          onPress={handleLike}
          disabled={isPendingLike}
          accessibilityLabel={post.likedByMe ? 'Unlike' : 'Like'}
          hitSlop={12}
        >
          {isPendingLike ? (
            <ActivityIndicator size={14} color={BrandColors.teal} />
          ) : (
            <Feather
              name="heart"
              size={18}
              color={post.likedByMe ? '#ef4444' : theme.textSecondary}
            />
          )}
          <Typography
            variant="caption"
            style={[
              styles.interactionCount,
              { color: post.likedByMe ? '#ef4444' : theme.textSecondary },
            ]}
          >
            {post.likeCount}
          </Typography>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.interactionBtn, pressed && styles.interactionPressed]}
          onPress={() => onCommentsPress(post.id)}
          accessibilityLabel="View comments"
          hitSlop={12}
        >
          <Feather name="message-circle" size={18} color={theme.textSecondary} />
          <Typography variant="caption" color="textSecondary" style={styles.interactionCount}>
            {post.commentCount}
          </Typography>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginHorizontal: Spacing.three,
    marginVertical: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  archived: {
    opacity: 0.7,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  authorMeta: {
    flex: 1,
    gap: 2,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  authorName: {
    flexShrink: 1,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  typeBadgeWrap: {
    flexShrink: 0,
  },
  typeBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  menuButton: {
    padding: Spacing.half,
  },
  menuButtonPressed: {
    opacity: 0.6,
  },
  topic: {
    marginBottom: Spacing.one,
  },
  content: {
    lineHeight: 20,
    marginBottom: Spacing.two,
  },
  imageWrap: {
    width: '100%',
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.two,
    backgroundColor: '#f1f5f9',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  archivedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  interactions: {
    flexDirection: 'row',
    gap: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
  },
  interactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: Spacing.two,
    minHeight: 44,
  },
  interactionPressed: {
    opacity: 0.65,
  },
  interactionCount: {
    fontWeight: '600',
    fontSize: 14,
  },
  actionsList: {
    paddingBottom: Spacing.four,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  actionItemPressed: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});
