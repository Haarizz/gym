import { useTranslation } from 'react-i18next';
import { formatTimeAgo, tOr } from '@/core/i18n';
import { useCallback, useState } from 'react';
import { useCommunityTheme } from '../../hooks/useCommunityTheme';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { TextInput } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppBottomSheet, EmptyState, Loader, Typography } from '@/shared/components';
import { Avatar } from '@/shared/components/Avatar';
import { useCommunityCanInteract, useCommunityComments, useCommunityMode } from '../../hooks/useCommunity';
import {
  useAddCommunityComment,
  useDeleteCommunityComment,
  useModerateCommunityComment,
  useReportCommunityComment,
} from '../../hooks/useCommunityActions';
import type { CommunityComment } from '../../domain/community.types';

import { toast } from '@/shared/components/Toasts/toastStore';


interface CommunityCommentsSheetProps {
  postId: number | null;
  visible: boolean;
  onClose: () => void;
}

/**
 * Comments bottom sheet.
 * `useCommunityComments` is only called when `postId` is non-null,
 * so comments are NOT prefetched for every post in the feed.
 */
export function CommunityCommentsSheet({ postId, visible, onClose }: CommunityCommentsSheetProps) {
  const { t } = useTranslation();
  const { primaryColor, headerColors } = useCommunityTheme();
  const theme = useTheme();
  const canInteract = useCommunityCanInteract();
  const [commentText, setCommentText] = useState('');

  // Only fetch when a post is actually selected.
  const {
    data: comments,
    isLoading,
    isError,
  } = useCommunityComments(postId ?? 0);

  const addMutation = useAddCommunityComment();
  const deleteMutation = useDeleteCommunityComment();
  const moderateMutation = useModerateCommunityComment();
  const reportMutation = useReportCommunityComment();
  const { mode, config } = useCommunityMode();
  const commentBlocked = mode === 'global' && config != null && !config.canComment;
  const blockedMessage = config?.readOnly
    ? t('community.comments.readOnly')
    : // Why a member can't comment at their selected gym (codes from the server).
      tOr(`community.comments.blocked.${config?.postingBlockedReason ?? ''}`, t('community.comments.unavailable'));

  const handleModerate = useCallback(
    (comment: CommunityComment, action: 'hide' | 'restore') => {
      if (!postId) return;
      const scopes = action === 'hide' ? comment.capabilities?.hideScopes : comment.capabilities?.restoreScopes;
      moderateMutation.mutate(
        { postId, commentId: comment.id, action, scope: scopes?.[0] },
        { onError: () => toast.error(t('community.comments.updateFailed'), { title: t('community.post.errorTitle') }) },
      );
    },
    [moderateMutation, postId, t],
  );

  const handleReport = useCallback(
    (commentId: number) => {
      const send = (reason: 'SPAM' | 'HARASSMENT') =>
        reportMutation.mutate(
          { commentId, reason },
          {
            onSuccess: () => toast.success(t('community.post.reported'), { title: t('community.post.reportedTitle') }),
            onError: () => toast.error(t('community.post.reportFailed'), { title: t('community.post.errorTitle') }),
          },
        );
      Alert.alert(t('community.comments.reportTitle'), t('community.comments.reportBody'), [
        { text: t('community.post.cancel'), style: 'cancel' },
        { text: t('community.comments.spam'), onPress: () => send('SPAM') },
        { text: t('community.comments.abusive'), onPress: () => send('HARASSMENT') },
      ]);
    },
    [reportMutation, t],
  );

  const handleSend = useCallback(() => {
    if (!postId || !commentText.trim()) return;
    addMutation.mutate(
      { postId, request: { content: commentText.trim() } },
      {
        onSuccess: () => setCommentText(''),
        onError: () => toast.error(t('community.comments.postFailed'), {
          title: t('community.post.errorTitle'),
        }),
      },
    );
  }, [addMutation, commentText, postId, t]);

  const handleDeleteComment = useCallback(
    (commentId: number) => {
      if (!postId) return;
      Alert.alert(t('community.comments.deleteTitle'), t('community.comments.deleteBody'), [
        { text: t('community.post.cancel'), style: 'cancel' },
        {
          text: t('community.post.delete'),
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(
              { postId, commentId },
              { onError: () => toast.error(t('community.comments.deleteFailed'), {
                title: t('community.post.errorTitle'),
              }) },
            );
          },
        },
      ]);
    },
    [deleteMutation, postId],
  );

  return (
    <AppBottomSheet
      visible={visible}
      title={t('community.comments.title')}
      onClose={onClose}
    >
      {/* Body */}
      {isLoading ? (
        <View style={styles.centered}>
          <Loader />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <EmptyState
            icon="wifi-off"
            title={t('community.comments.loadError')}
            description={t('community.comments.tryAgain')}
          />
        </View>
      ) : !comments || comments.length === 0 ? (
        <View style={styles.centered}>
          <EmptyState
            icon="message-circle"
            title={t('community.comments.emptyTitle')}
            description={t('community.comments.emptyDescription')}
          />
        </View>
      ) : (
        <View style={styles.commentsList}>
          {comments.map((comment) => {
            // Global API: server-computed; legacy API: owned by this account.
            const caps = comment.capabilities;
            const isOwn = caps ? caps.canDelete : comment.ownedByMe;
            const initials = comment.authorUsername?.slice(0, 2).toUpperCase() ?? '??';
            const timeAgo = comment.createdAt
              ? formatTimeAgo(comment.createdAt, { addSuffix: true })
              : '';

            return (
              <View key={comment.id} style={styles.commentRow}>
                <Avatar initials={initials} size={30} />
                <View style={styles.commentBody}>
                  <View style={styles.commentHeader}>
                    <Typography variant="bodySmallBold" style={styles.commentAuthor}>
                      {comment.authorUsername}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {timeAgo}
                    </Typography>
                  </View>
                  <Typography variant="bodySmall" color="textSecondary">
                    {comment.content}
                  </Typography>
                  {comment.hidden && (
                    <Typography variant="caption" color="textSecondary" style={{ fontStyle: 'italic' }}>
                      {t('community.post.hiddenByModerators')}
                    </Typography>
                  )}
                </View>
                {caps && caps.restoreScopes.length > 0 && (
                  <Pressable
                    onPress={() => handleModerate(comment, 'restore')}
                    hitSlop={8}
                    style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
                    accessibilityLabel={t('community.comments.restoreA11y')}
                  >
                    <Feather name="eye" size={14} color={theme.textSecondary} />
                  </Pressable>
                )}
                {caps && caps.hideScopes.length > 0 && (
                  <Pressable
                    onPress={() => handleModerate(comment, 'hide')}
                    hitSlop={8}
                    style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
                    accessibilityLabel={t('community.comments.hideA11y')}
                  >
                    <Feather name="eye-off" size={14} color={theme.textSecondary} />
                  </Pressable>
                )}
                {caps?.canReport && (
                  <Pressable
                    onPress={() => handleReport(comment.id)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
                    accessibilityLabel={t('community.comments.reportA11y')}
                  >
                    <Feather name="flag" size={14} color={theme.textSecondary} />
                  </Pressable>
                )}
                {isOwn && (
                  <Pressable
                    onPress={() => handleDeleteComment(comment.id)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
                    accessibilityLabel={t('community.comments.deleteA11y')}
                  >
                    <Feather name="trash-2" size={14} color={theme.error} />
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Input — read-only without an active membership at any gym (legacy), or when the global Community blocks commenting. */}
      {commentBlocked || !canInteract ? (
        <View style={[styles.inputRow, { borderTopColor: theme.border }]}>
          <Typography variant="caption" color="textSecondary">
            {mode === 'global' ? blockedMessage : t('community.comments.needMembership')}
          </Typography>
        </View>
      ) : (
      <View style={[styles.inputRow, { borderTopColor: theme.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.muted, color: theme.text }]}
          placeholder={t('community.comments.placeholder')}
          placeholderTextColor={theme.textSecondary}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendBtn,
            { backgroundColor: primaryColor },
            (!commentText.trim() || addMutation.isPending) && styles.sendBtnDisabled,
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleSend}
          disabled={!commentText.trim() || addMutation.isPending}
          accessibilityLabel={t('community.comments.sendA11y')}
        >
          {addMutation.isPending ? (
            <ActivityIndicator size={16} color="#fff" />
          ) : (
            <Feather name="send" size={16} color="#fff" />
          )}
        </Pressable>
      </View>
      )}
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: Spacing.four,
  },
  commentsList: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  commentRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  commentBody: {
    flex: 1,
    gap: 2,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  commentAuthor: {
    fontSize: 13,
  },
  deleteBtn: {
    padding: Spacing.one,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    marginTop: Spacing.two,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
    maxHeight: 100,
    minHeight: 40,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
