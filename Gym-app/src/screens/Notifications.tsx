import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
    <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={[styles.markAll, { color: colors.textMuted }]}>Mark all as read</Text>
        </TouchableOpacity>
      </View>
      {notifications.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
            !item.read && styles.cardUnread,
          ]}
          onPress={() => markRead(item.id)}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.cardMessage, { color: colors.textMuted }]}>{item.message}</Text>
          <Text style={[styles.cardTime, { color: colors.textMuted }]}>{item.time}</Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  markAll: {
    fontWeight: "600",
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
  },
  cardUnread: {
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  cardTitle: {
    fontWeight: "700",
  },
  cardMessage: {
    marginTop: 4,
  },
  cardTime: {
    marginTop: 6,
    fontSize: 12,
  },
});
