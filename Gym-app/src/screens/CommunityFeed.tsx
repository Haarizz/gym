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
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.ScrollView style={[styles.container, { opacity: fadeAnim, backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Community Feed</Text>
      <View style={[styles.postComposer, { backgroundColor: colors.card }]}
      >
        <View style={styles.postHeader}>
          <View style={[styles.postAvatar, { backgroundColor: colors.border }]}
          >
            <Text style={[styles.postAvatarText, { color: colors.textMuted }]}>SJ</Text>
          </View>
          <Text style={[styles.postPrompt, { color: colors.textMuted }]}>Share an update with your gym community</Text>
        </View>
        <TextInput
          value={postText}
          onChangeText={setPostText}
          placeholder="Write something..."
          placeholderTextColor={colors.textMuted}
          style={[styles.postInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
          multiline
        />
        <View style={styles.postActions}>
          <TouchableOpacity style={styles.postActionChip}>
            <Ionicons name="image" size={16} color="#2563EB" />
            <Text style={styles.postActionText}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.postButton}>
            <Text style={styles.postButtonText}>Post</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardList}>
        {feed.map((post) => (
          <View key={post.id} style={[styles.feedCard, { backgroundColor: colors.card }]}
          >
            <View style={styles.feedHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.border }]}
              >
                <Text style={[styles.avatarText, { color: colors.textMuted }]}>
                  {post.author
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
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
        ))}
      </View>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  postComposer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  postAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  postAvatarText: {
    fontWeight: "700",
  },
  postPrompt: {
    fontSize: 13,
  },
  postInput: {
    minHeight: 80,
    borderRadius: 12,
    padding: 12,
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
    backgroundColor: "#EFF6FF",
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
    paddingVertical: 8,
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
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  feedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "700",
  },
  feedAuthor: {
    fontWeight: "700",
  },
  feedTime: {
    fontSize: 12,
  },
  feedContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  feedActions: {
    flexDirection: "row",
    gap: 16,
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
