import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../components/GlassCard";
import { GlassScreen } from "../components/GlassScreen";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import {
  addCommunityComment,
  createCommunityPost,
  fetchCommunityComments,
  fetchCommunityPosts,
  toggleCommunityLike,
  type CommunityComment,
  type CommunityPost,
} from "../services/community";

const formatRelativeTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Just now";
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export function CommunityFeed() {
  const [postText, setPostText] = useState("");
  const [postTopic, setPostTopic] = useState("");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [activePost, setActivePost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);

  const { colors } = useSettings();
  const { user } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const loadPosts = async () => {
    setIsLoadingPosts(true);
    try {
      const page = await fetchCommunityPosts({ token: user?.token ?? null, page: 1, limit: 25, type: "all" });
      setPosts(page.posts ?? []);
    } catch (e: any) {
      console.warn(e);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePost = async () => {
    if (!user?.token) return;
    const topic = postTopic.trim() || "Community Update";
    const content = postText.trim();
    if (!content) return;

    setIsPosting(true);
    try {
      const created = await createCommunityPost({
        token: user.token,
        topic,
        content,
        type: "achievement",
      });
      setPosts((prev) => [created, ...prev]);
      setPostText("");
      setPostTopic("");
    } catch (e: any) {
      console.warn(e);
    } finally {
      setIsPosting(false);
    }
  };

  const openComments = async (post: CommunityPost) => {
    setActivePost(post);
    setIsCommentsOpen(true);
    setIsLoadingComments(true);
    setComments([]);
    setCommentText("");
    try {
      const list = await fetchCommunityComments({ postId: post.id, token: user?.token ?? null });
      setComments(list);
    } catch (e: any) {
      console.warn(e);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const sendComment = async () => {
    if (!activePost || !user?.token) return;
    const content = commentText.trim();
    if (!content) return;

    setIsSendingComment(true);
    try {
      const created = await addCommunityComment({ postId: activePost.id, content, token: user.token });
      setComments((prev) => [...prev, created]);
      setCommentText("");
      setPosts((prev) =>
        prev.map((p) => (p.id === activePost.id ? { ...p, commentCount: (p.commentCount ?? 0) + 1 } : p))
      );
      setActivePost((prev) => (prev ? { ...prev, commentCount: (prev.commentCount ?? 0) + 1 } : prev));
    } catch (e: any) {
      console.warn(e);
    } finally {
      setIsSendingComment(false);
    }
  };

  const likePost = async (post: CommunityPost) => {
    if (!user?.token) return;
    try {
      const result = await toggleCommunityLike({ postId: post.id, token: user.token });
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, likeCount: result.likeCount, likedByMe: result.liked } : p))
      );
      setActivePost((prev) => (prev?.id === post.id ? { ...prev, likeCount: result.likeCount, likedByMe: result.liked } : prev));
    } catch (e: any) {
      console.warn(e);
    }
  };

  return (
    <GlassScreen>
      <Animated.ScrollView
        style={[styles.container, { opacity: fadeAnim }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>Community Feed</Text>

        <GlassCard style={styles.postComposer}>
          <View style={styles.postComposerInner}>
            <View style={styles.postHeader}>
              <View style={[styles.postAvatar, { backgroundColor: colors.glass }]}>
                <Text style={[styles.postAvatarText, { color: colors.textMuted }]}>SJ</Text>
              </View>
              <Text style={[styles.postPrompt, { color: colors.textMuted }]}>
                Share an update with your gym community
              </Text>
            </View>

            <TextInput
              value={postTopic}
              onChangeText={setPostTopic}
              placeholder="Topic (optional)"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.postTopic,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.input,
                },
              ]}
            />

            <TextInput
              value={postText}
              onChangeText={setPostText}
              placeholder="Write something..."
              placeholderTextColor={colors.textMuted}
              style={[
                styles.postInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.input,
                },
              ]}
              multiline
            />

            <View style={styles.postActions}>
              <TouchableOpacity style={[styles.postActionChip, { backgroundColor: colors.glass }]} disabled>
                <Ionicons name="image" size={16} color="#2563EB" />
                <Text style={styles.postActionText}>Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.postButton, (!postText.trim() || isPosting) && styles.postButtonDisabled]}
                onPress={handlePost}
                disabled={!postText.trim() || isPosting}
              >
                <Text style={styles.postButtonText}>{isPosting ? "Posting..." : "Post"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </GlassCard>

        <View style={styles.cardList}>
          {isLoadingPosts ? (
            <GlassCard style={styles.feedCard}>
              <View style={styles.feedCardInner}>
                <Text style={[styles.feedContent, { color: colors.textMuted }]}>
                  Loading posts...
                </Text>
              </View>
            </GlassCard>
          ) : posts.length === 0 ? (
            <GlassCard style={styles.feedCard}>
              <View style={styles.feedCardInner}>
                <Text style={[styles.feedContent, { color: colors.textMuted }]}>
                  No posts yet. Write the first update.
                </Text>
              </View>
            </GlassCard>
          ) : posts.map((post) => (
            <GlassCard key={String(post.id)} style={styles.feedCard}>
              <View style={styles.feedCardInner}>
                <View style={styles.feedHeader}>
                  <View style={[styles.avatar, { backgroundColor: colors.glass }]}>
                    <Text style={[styles.avatarText, { color: colors.textMuted }]}>
                      {(post.authorUsername || "Unknown")
                        .split(" ")
                        .map((part) => part[0])
                        .join("")}
                    </Text>
                  </View>

                  <View style={styles.feedAuthorWrap}>
                    <Text style={[styles.feedAuthor, { color: colors.text }]}>{post.authorUsername || "Unknown"}</Text>
                    <Text style={[styles.feedTime, { color: colors.textMuted }]}>{formatRelativeTime(post.createdAt)}</Text>
                  </View>
                </View>

                <Text style={[styles.feedContent, { color: colors.text }]}>{post.content}</Text>

                <View style={styles.feedActions}>
                  <TouchableOpacity style={styles.feedAction} onPress={() => likePost(post)}>
                    <Ionicons
                      name={post.likedByMe ? "heart" : "heart-outline"}
                      size={16}
                      color={post.likedByMe ? "#ef4444" : colors.textMuted}
                    />
                    <Text style={[styles.feedActionText, { color: colors.textMuted }]}>{post.likeCount}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.feedAction} onPress={() => openComments(post)}>
                    <Ionicons name="chatbubble-outline" size={16} color={colors.textMuted} />
                    <Text style={[styles.feedActionText, { color: colors.textMuted }]}>{post.commentCount}</Text>
                  </TouchableOpacity>
                  <View style={styles.feedAction}>
                    <Ionicons name="share-social-outline" size={16} color={colors.textMuted} />
                    <Text style={[styles.feedActionText, { color: colors.textMuted }]}>Share</Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          ))}
        </View>
      </Animated.ScrollView>

      <Modal visible={isCommentsOpen} transparent animationType="fade" onRequestClose={() => setIsCommentsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Comments</Text>
              <TouchableOpacity onPress={() => setIsCommentsOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent} showsVerticalScrollIndicator={false}>
              {isLoadingComments ? (
                <Text style={[styles.modalEmpty, { color: colors.textMuted }]}>Loading comments...</Text>
              ) : comments.length === 0 ? (
                <Text style={[styles.modalEmpty, { color: colors.textMuted }]}>No comments yet. Be first.</Text>
              ) : (
                comments.map((c) => (
                  <View key={String(c.id)} style={[styles.commentBubble, { backgroundColor: colors.glass }]}>
                    <Text style={[styles.commentAuthor, { color: colors.text }]}>{c.authorUsername}</Text>
                    <Text style={[styles.commentTime, { color: colors.textMuted }]}>{formatRelativeTime(c.createdAt)}</Text>
                    <Text style={[styles.commentText, { color: colors.text }]}>{c.content}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.modalComposer}>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Write a comment..."
                placeholderTextColor={colors.textMuted}
                style={[styles.commentInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
                multiline
              />
              <TouchableOpacity
                style={[styles.commentSend, (!commentText.trim() || isSendingComment) && styles.postButtonDisabled]}
                onPress={sendComment}
                disabled={!commentText.trim() || isSendingComment}
              >
                <Text style={styles.commentSendText}>{isSendingComment ? "..." : "Send"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  postComposer: {
    marginBottom: 16,
    borderRadius: 24,
  },
  postComposerInner: {
    padding: 18,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  postAvatarText: {
    fontWeight: "700",
  },
  postPrompt: {
    fontSize: 13,
    flex: 1,
  },
  postInput: {
    minHeight: 90,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    textAlignVertical: "top",
  },
  postTopic: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  postActionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  postActionText: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 12,
  },
  postButton: {
    backgroundColor: "#111827",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  cardList: {
    gap: 12,
  },
  feedCard: {
    borderRadius: 24,
  },
  feedCardInner: {
    padding: 18,
  },
  feedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "700",
  },
  feedAuthorWrap: {
    flex: 1,
  },
  feedAuthor: {
    fontWeight: "700",
  },
  feedTime: {
    fontSize: 12,
  },
  feedContent: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },
  feedActions: {
    flexDirection: "row",
    gap: 18,
  },
  feedAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  feedActionText: {
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalSheet: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    maxHeight: "85%",
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalList: {
    maxHeight: 360,
  },
  modalListContent: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 10,
  },
  modalEmpty: {
    paddingVertical: 18,
    textAlign: "center",
  },
  commentBubble: {
    borderRadius: 18,
    padding: 12,
  },
  commentAuthor: {
    fontWeight: "700",
    fontSize: 12,
  },
  commentTime: {
    fontSize: 11,
    marginTop: 2,
  },
  commentText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  modalComposer: {
    padding: 14,
    gap: 10,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
  },
  commentSend: {
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  commentSendText: {
    color: "#fff",
    fontWeight: "700",
  },
});
