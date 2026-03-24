import React, { useEffect, useRef } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GlassCard } from "../components/GlassCard";
import { GlassScreen } from "../components/GlassScreen";
import { useNotifications } from "../context/NotificationsContext";
import { useSettings } from "../context/SettingsContext";

export function Notifications() {
  const { notifications, markAllRead, markRead } = useNotifications();
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
    <GlassScreen>
      <Animated.ScrollView
        style={[styles.container, { opacity: fadeAnim }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
          <TouchableOpacity onPress={markAllRead}>
            <Text style={[styles.markAll, { color: colors.textMuted }]}>Mark all as read</Text>
          </TouchableOpacity>
        </View>

        {notifications.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => markRead(item.id)} activeOpacity={0.88}>
            <GlassCard
              style={[
                styles.card,
                !item.read && {
                  borderColor: "rgba(96, 165, 250, 0.45)",
                },
              ]}
            >
              <View style={styles.cardInner}>
                <View style={styles.cardTop}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                  {!item.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={[styles.cardMessage, { color: colors.textMuted }]}>{item.message}</Text>
                <Text style={[styles.cardTime, { color: colors.textMuted }]}>{item.time}</Text>
              </View>
            </GlassCard>
          </TouchableOpacity>
        ))}
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  markAll: {
    fontWeight: "600",
  },
  card: {
    marginBottom: 12,
    borderRadius: 22,
  },
  cardInner: {
    padding: 18,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
  },
  cardTitle: {
    fontWeight: "700",
    flex: 1,
  },
  cardMessage: {
    marginTop: 6,
    lineHeight: 20,
  },
  cardTime: {
    marginTop: 10,
    fontSize: 12,
  },
});
