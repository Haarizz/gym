import { useTranslation } from 'react-i18next';
import { formatTimeAgo, tOr } from '@/core/i18n';
import { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppBottomSheet, Typography } from '@/shared/components';
import { Avatar } from '@/shared/components/Avatar';
import { useAuthStore } from '@/domains/auth';
import { toast } from '@/shared/components/Toasts/toastStore';
import { useCommunityTheme } from '../../hooks/useCommunityTheme';
import { useCommunityCanInteract } from '../../hooks/useCommunity';
import {
  useToggleCommunityLike,
  useDeleteCommunityPost,
  useArchiveCommunityPost,
  useUnarchiveCommunityPost,
  useReportCommunityPost,
  useModerateCommunityPost,
} from '../../hooks/useCommunityActions';
import type { CommunityPost, CommunityReportReason } from '../../domain/community.types';

// Legacy API only: roles shown archive/unarchive. The global API sends
// server-computed capabilities instead, and the server enforces every action.
const MODERATOR_ROLES = ['admin', 'staff'] as const;

export const REPORT_REASONS: { value: CommunityReportReason; label: string }[] = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Harassment or bullying' },
  { value: 'HATE', label: 'Hate speech' },
  { value: 'NUDITY', label: 'Nudity or sexual content' },
  { value: 'VIOLENCE', label: 'Violence' },
  { value: 'SELF_HARM', label: 'Self-harm' },
  { value: 'OTHER', label: 'Something else' },
];

/** Returns a display colour for a given post type. */
function getTypeColor(type: string, primaryColor: string): string {
  switch (type) {
    case 'achievement': return primaryColor;
    case 'question': return '#3b82f6';
    case 'tip': return '#8b5cf6';
    default: return '#94a3b8';
  }
}

function getTypeLabel(type: string): string {
  return tOr(`community.types.${type}`, type);
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
  const { t } = useTranslation();
  const theme = useTheme();
  const { primaryColor } = useCommunityTheme();
  const appRole = useAuthStore((s) => s.appRole);
  const canInteract = useCommunityCanInteract();

  const [actionsVisible, setActionsVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);

  const likeMutation = useToggleCommunityLike();
  const deleteMutation = useDeleteCommunityPost();
  const archiveMutation = useArchiveCommunityPost();
  const unarchiveMutation = useUnarchiveCommunityPost();
  const reportMutation = useReportCommunityPost();
  const moderateMutation = useModerateCommunityPost();

  // Global API: the server says what this viewer may do. Legacy API: previous rules.
  const caps = post.capabilities;
  const isOwnPost = post.isMine ?? post.ownedByMe;
  const isModerator = !caps && appRole != null && (MODERATOR_ROLES as readonly string[]).includes(appRole);

  const isPendingLike = likeMutation.isPending;

  const initials = post.authorUsername
    ? post.authorUsername.slice(0, 2).toUpperCase()
    : '??';

  const timeAgo = post.createdAt
    ? formatTimeAgo(post.createdAt, { addSuffix: true })
    : '';

  const typeColor = getTypeColor(post.type, primaryColor);

  const handleLike = useCallback(() => {
    if (isPendingLike) return;
    if (!canInteract) {
      toast.info(t('community.post.membersOnly'), {
        title: t('community.post.membersOnlyTitle'),
      });
      return;
    }
    likeMutation.mutate({ postId: post.id, liked: post.likedByMe });
  }, [canInteract, isPendingLike, likeMutation, post.id, post.likedByMe, t]);

  const handleActions = useCallback(() => {
    setActionsVisible(true);
  }, []);

  const showActionsMenu = caps
    ? caps.canDelete || caps.canArchive || caps.canUnarchive || caps.canHide || caps.canRestore || caps.canReport
    : isOwnPost || isModerator;

  const handleReport = (reason: CommunityReportReason) => {
    setReportVisible(false);
    reportMutation.mutate(
      { postId: post.id, reason },
      {
        onSuccess: () => toast.success(t('community.post.reported'), { title: t('community.post.reportedTitle') }),
        onError: () => toast.error(t('community.post.reportFailed'), { title: t('community.post.errorTitle') }),
      },
    );
  };

  const handleModerate = (action: 'hide' | 'restore') => {
    setActionsVisible(false);
    moderateMutation.mutate(
      { postId: post.id, action },
      { onError: (err) => toast.error((err as Error)?.message ?? t('community.post.updateFailed'), { title: t('community.post.errorTitle') }) },
    );
  };

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
        title={t('community.post.actionsTitle')}
        onClose={() => setActionsVisible(false)}
      >
        {caps ? (
          <View style={styles.actionsList}>
            {caps.canHide && (
              <Pressable
                style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                onPress={() => {
                  setActionsVisible(false);
                  Alert.alert(t('community.post.hideTitle'), t('community.post.hideBody'), [
                    { text: t('community.post.cancel'), style: 'cancel' },
                    { text: t('community.post.hide'), style: 'destructive', onPress: () => handleModerate('hide') },
                  ]);
                }}
              >
                <Feather name="eye-off" size={20} color={theme.text} />
                <Typography variant="body">{t('community.post.hideTitle')}</Typography>
              </Pressable>
            )}
            {caps.canRestore && (
              <Pressable
                style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                onPress={() => handleModerate('restore')}
              >
                <Feather name="eye" size={20} color={theme.text} />
                <Typography variant="body">{t('community.post.restore')}</Typography>
              </Pressable>
            )}
            {(caps.canArchive || caps.canUnarchive) && (
              <Pressable
                style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                onPress={() => {
                  setActionsVisible(false);
                  if (caps.canUnarchive) {
                    unarchiveMutation.mutate(post.id);
                  } else {
                    archiveMutation.mutate(post.id);
                  }
                }}
              >
                <Feather name="archive" size={20} color={theme.text} />
                <Typography variant="body">{t(caps.canUnarchive ? 'community.post.unarchivePost' : 'community.post.archivePost')}</Typography>
              </Pressable>
            )}
            {caps.canReport && (
              <Pressable
                style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                onPress={() => {
                  setActionsVisible(false);
                  setReportVisible(true);
                }}
              >
                <Feather name="flag" size={20} color={theme.text} />
                <Typography variant="body">{t('community.post.report')}</Typography>
              </Pressable>
            )}
            {caps.canDelete && (
              <Pressable
                style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                onPress={() => {
                  setActionsVisible(false);
                  Alert.alert(t('community.post.deleteTitle'), t('community.post.deleteBody'), [
                    { text: t('community.post.cancel'), style: 'cancel' },
                    { text: t('community.post.delete'), style: 'destructive', onPress: () => deleteMutation.mutate(post.id) },
                  ]);
                }}
              >
                <Feather name="trash-2" size={20} color={theme.error} />
                <Typography variant="body" color="error">{t('community.post.deleteTitle')}</Typography>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.actionsList}>
            {isOwnPost && (
              <Pressable
                style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
                onPress={() => {
                  setActionsVisible(false);
                  Alert.alert(t('community.post.deleteTitle'), t('community.post.deleteBody'), [
                    { text: t('community.post.cancel'), style: 'cancel' },
                    { text: t('community.post.delete'), style: 'destructive', onPress: () => deleteMutation.mutate(post.id) },
                  ]);
                }}
              >
                <Feather name="trash-2" size={20} color={theme.error} />
                <Typography variant="body" color="error">{t('community.post.deleteTitle')}</Typography>
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
                    Alert.alert(t('community.post.archiveTitle'), t('community.post.archiveBody'), [
                      { text: t('community.post.cancel'), style: 'cancel' },
                      { text: t('community.post.archive'), onPress: () => archiveMutation.mutate(post.id) },
                    ]);
                  }
                }}
              >
                <Feather name="archive" size={20} color={theme.text} />
                <Typography variant="body">{t(post.archived ? 'community.post.unarchivePost' : 'community.post.archivePost')}</Typography>
              </Pressable>
            )}
          </View>
        )}
      </AppBottomSheet>

      {/* Report reasons */}
      <AppBottomSheet
        visible={reportVisible}
        title={t('community.post.reportReasonTitle')}
        onClose={() => setReportVisible(false)}
      >
        <View style={styles.actionsList}>
          {REPORT_REASONS.map((r) => (
            <Pressable
              key={r.value}
              style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]}
              onPress={() => handleReport(r.value)}
            >
              <Typography variant="body">{t(`community.post.reasons.${r.value}`)}</Typography>
            </Pressable>
          ))}
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
          <Typography variant="caption" color="textSecondary" numberOfLines={1}>
            {post.authorGymName ? `${post.authorGymName} · ${timeAgo}` : timeAgo}
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
            accessibilityLabel={t('community.post.actionsA11y')}
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
      {post.image?.uri || post.image?.dataUrl ? (
        <View
          style={[
            styles.imageWrap,
            { aspectRatio: getAspectRatioNumeric(post.image.aspectRatio) },
          ]}
        >
          <Image
            source={
              post.image.uri
                ? { uri: post.image.uri, headers: post.image.headers }
                : { uri: post.image.dataUrl ?? undefined }
            }
            style={styles.image}
            contentFit="cover"
            recyclingKey={String(post.id)}
            onError={(e) => console.warn(`Community image failed for post ${post.id}:`, e.error)}
            accessibilityLabel={t('community.post.imageA11y')}
          />
        </View>
      ) : null}

      {/* Hidden label (global API: visible only to the author and the gym's moderators) */}
      {post.status === 'HIDDEN' && (
        <View style={styles.archivedBanner}>
          <Feather name="eye-off" size={12} color={theme.textSecondary} />
          <Typography variant="caption" color="textSecondary" style={{ marginStart: 4 }}>
            {t('community.post.hiddenByModerators')}
          </Typography>
        </View>
      )}

      {/* Archived label */}
      {post.archived && (
        <View style={styles.archivedBanner}>
          <Feather name="archive" size={12} color={theme.textSecondary} />
          <Typography variant="caption" color="textSecondary" style={{ marginStart: 4 }}>
            {t('community.post.archived')}
          </Typography>
        </View>
      )}

      {/* Interaction row */}
      <View style={styles.interactions}>
        <Pressable
          style={({ pressed }) => [styles.interactionBtn, pressed && styles.interactionPressed]}
          onPress={handleLike}
          disabled={isPendingLike || (caps ? !caps.canLike : false)}
          accessibilityLabel={t(post.likedByMe ? 'community.post.unlike' : 'community.post.like')}
          hitSlop={12}
        >
          {isPendingLike ? (
            <ActivityIndicator size={14} color={primaryColor} />
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
          accessibilityLabel={t('community.post.viewComments')}
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
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 18,
    marginVertical: 6,
    shadowColor: '#141428',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#ECEBF2',
  },
  archived: {
    opacity: 0.7,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  authorMeta: {
    flex: 1,
    paddingTop: 2,
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
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E2130',
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
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  menuButton: {
    padding: Spacing.half,
    marginStart: 4,
  },
  menuButtonPressed: {
    opacity: 0.6,
  },
  topic: {
    marginBottom: 4,
    marginTop: 11,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 19.5,
    color: '#1E2130',
  },
  content: {
    lineHeight: 20,
    fontSize: 13.5,
    color: '#7A7E8C',
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
    alignItems: 'center',
    gap: 18,
    borderTopWidth: 1,
    borderTopColor: '#ECEBF2',
    paddingTop: 12,
    marginTop: 13,
  },
  interactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    minHeight: 32,
  },
  interactionPressed: {
    opacity: 0.65,
  },
  interactionCount: {
    fontWeight: '600',
    fontSize: 12.5,
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
