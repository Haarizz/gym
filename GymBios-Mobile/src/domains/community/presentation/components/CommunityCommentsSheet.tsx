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
import { useAuthStore } from '@/domains/auth';
import { useCommunityComments } from '../../hooks/useCommunity';
import {
  useAddCommunityComment,
  useDeleteCommunityComment,
} from '../../hooks/useCommunityActions';

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
  const user = useAuthStore((s) => s.user);
  const [commentText, setCommentText] = useState('');

  // Only fetch when a post is actually selected.
  const {
    data: comments,
    isLoading,
    isError,
  } = useCommunityComments(postId ?? 0);

  const addMutation = useAddCommunityComment();
  const deleteMutation = useDeleteCommunityComment();

  const handleSend = useCallback(() => {
    if (!postId || !commentText.trim()) return;
    addMutation.mutate(
      { postId, request: { content: commentText.trim() } },
      {
        onSuccess: () => setCommentText(''),
        onError: () => Alert.alert('Error', 'Could not post comment.'),
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
              { onError: () => Alert.alert('Error', 'Could not delete comment.') },
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
            const isOwn = user?.id != null && Number(user.id) === comment.authorUserId;
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
                </View>
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

      {/* Input */}
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
