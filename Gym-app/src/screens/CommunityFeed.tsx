import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
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

const feed = [
  {
    id: "1",
    author: "Alex Martinez",
    content: "Just completed my first 5K! Thanks for the push everyone.",
    time: "2h ago",
    likes: 23,
    comments: 5,
  },
  {
    id: "2",
    author: "Emma Wilson",
    content: "Who is joining morning yoga tomorrow? Looking for a buddy!",
    time: "4h ago",
    likes: 8,
    comments: 12,
  },
  {
    id: "3",
    author: "GymBios Fitness",
    content: "New circuit class starts next week. Limited spots!",
    time: "6h ago",
    likes: 45,
    comments: 18,
  },
];

export function CommunityFeed() {
  const [postText, setPostText] = useState("");
  const { colors } = useSettings();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

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
              <TouchableOpacity style={[styles.postActionChip, { backgroundColor: colors.glass }]}>
                <Ionicons name="image" size={16} color="#2563EB" />
                <Text style={styles.postActionText}>Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.postButton}>
                <Text style={styles.postButtonText}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </GlassCard>

        <View style={styles.cardList}>
          {feed.map((post) => (
            <GlassCard key={post.id} style={styles.feedCard}>
              <View style={styles.feedCardInner}>
                <View style={styles.feedHeader}>
                  <View style={[styles.avatar, { backgroundColor: colors.glass }]}>
                    <Text style={[styles.avatarText, { color: colors.textMuted }]}>
                      {post.author
                        .split(" ")
                        .map((part) => part[0])
                        .join("")}
                    </Text>
                  </View>

                  <View style={styles.feedAuthorWrap}>
                    <Text style={[styles.feedAuthor, { color: colors.text }]}>{post.author}</Text>
                    <Text style={[styles.feedTime, { color: colors.textMuted }]}>{post.time}</Text>
                  </View>
                </View>

                <Text style={[styles.feedContent, { color: colors.text }]}>{post.content}</Text>

                <View style={styles.feedActions}>
                  <View style={styles.feedAction}>
                    <Ionicons name="heart-outline" size={16} color={colors.textMuted} />
                    <Text style={[styles.feedActionText, { color: colors.textMuted }]}>{post.likes}</Text>
                  </View>
                  <View style={styles.feedAction}>
                    <Ionicons name="chatbubble-outline" size={16} color={colors.textMuted} />
                    <Text style={[styles.feedActionText, { color: colors.textMuted }]}>{post.comments}</Text>
                  </View>
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
});
