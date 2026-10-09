import { useCallback, useState } from 'react';
import { useCommunityTheme } from '../../hooks/useCommunityTheme';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { formatDistanceToNow } from 'date-fns';

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

/** Why a member can't comment at their selected gym (codes from the server). */
const BLOCKED_REASONS: Record<string, string> = {
  NOT_A_MEMBER: 'Only members of your selected gym can comment.',
  APP_ACCESS_PENDING: 'You can comment once your membership is approved.',
  GYM_CONTEXT_REQUIRED: 'Select one of your gyms to comment.',
  MEMBERSHIP_UNDETERMINED: 'Your membership couldn\'t be confirmed.',
};

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
    ? 'The Community is read-only right now.'
    : BLOCKED_REASONS[config?.postingBlockedReason ?? ''] ?? 'Commenting isn\'t available right now.';

  const handleModerate = useCallback(
    (comment: CommunityComment, action: 'hide' | 'restore') => {
      if (!postId) return;
      const scopes = action === 'hide' ? comment.capabilities?.hideScopes : comment.capabilities?.restoreScopes;
      moderateMutation.mutate(
        { postId, commentId: comment.id, action, scope: scopes?.[0] },
        { onError: () => toast.error('Could not update the comment.', { title: 'Error' }) },
      );
    },
    [moderateMutation, postId],
  );

  const handleReport = useCallback(
    (commentId: number) => {
      const send = (reason: 'SPAM' | 'HARASSMENT') =>
        reportMutation.mutate(
          { commentId, reason },
          {
            onSuccess: () => toast.success('Thanks — the gym\'s moderators will review it.', { title: 'Reported' }),
            onError: () => toast.error('Could not send the report.', { title: 'Error' }),
          },
        );
      Alert.alert('Report comment', 'What\'s wrong with this comment?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Spam', onPress: () => send('SPAM') },
        { text: 'Abusive', onPress: () => send('HARASSMENT') },
      ]);
    },
    [reportMutation],
  );

  const handleSend = useCallback(() => {
    if (!postId || !commentText.trim()) return;
    addMutation.mutate(
      { postId, request: { content: commentText.trim() } },
      {
        onSuccess: () => setCommentText(''),
        onError: () => toast.error('Could not post comment.', {
          title: 'Error'
        }),
      },
    );
  }, [addMutation, commentText, postId]);

  const handleDeleteComment = useCallback(
    (commentId: number) => {
      if (!postId) return;
      Alert.alert('Delete Comment', 'Delete this comment?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(
              { postId, commentId },
              { onError: () => toast.error('Could not delete comment.', {
                title: 'Error'
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
      title="Comments"
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
            title="Could not load comments"
            description="Please try again."
          />
        </View>
      ) : !comments || comments.length === 0 ? (
        <View style={styles.centered}>
          <EmptyState
            icon="message-circle"
            title="No comments yet"
            description="Be the first to comment!"
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
              ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })
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
                      Hidden by gym moderators
                    </Typography>
                  )}
                </View>
                {caps && caps.restoreScopes.length > 0 && (
                  <Pressable
                    onPress={() => handleModerate(comment, 'restore')}
                    hitSlop={8}
                    style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
                    accessibilityLabel="Restore comment"
                  >
                    <Feather name="eye" size={14} color={theme.textSecondary} />
                  </Pressable>
                )}
                {caps && caps.hideScopes.length > 0 && (
                  <Pressable
                    onPress={() => handleModerate(comment, 'hide')}
                    hitSlop={8}
                    style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
                    accessibilityLabel="Hide comment"
                  >
                    <Feather name="eye-off" size={14} color={theme.textSecondary} />
                  </Pressable>
                )}
                {caps?.canReport && (
                  <Pressable
                    onPress={() => handleReport(comment.id)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
                    accessibilityLabel="Report comment"
                  >
                    <Feather name="flag" size={14} color={theme.textSecondary} />
                  </Pressable>
                )}
                {isOwn && (
                  <Pressable
                    onPress={() => handleDeleteComment(comment.id)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
                    accessibilityLabel="Delete comment"
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
            {mode === 'global' ? blockedMessage : 'Get an active membership at any gym to join the conversation.'}
          </Typography>
        </View>
      ) : (
      <View style={[styles.inputRow, { borderTopColor: theme.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.muted, color: theme.text }]}
          placeholder="Add a comment…"
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
          accessibilityLabel="Send comment"
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
