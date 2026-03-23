import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNotifications } from "../context/NotificationsContext";
import { useSettings } from "../context/SettingsContext";
import type { RootStackParamList } from "../navigation/types";
import { BRAND_COLOR } from "../theme";

const quickActions = [
  {
    id: "book-session",
    label: "Book Session",
    icon: "calendar",
    color: "#2563EB",
    screen: "BookSession" as const,
  },
  {
    id: "join-class",
    label: "Join Class",
    icon: "people",
    color: "#059669",
    screen: "JoinClass" as const,
  },
  {
    id: "add-challenge",
    label: "Add Challenge",
    icon: "trophy",
    color: "#F59E0B",
    screen: "AddChallenge" as const,
  },
  {
    id: "create-post",
    label: "Create Post",
    icon: "create",
    color: "#8B5CF6",
  },
  {
    id: "my-stats",
    label: "My Stats",
    icon: "stats-chart",
    color: "#0EA5E9",
    screen: "MyStats" as const,
  },
  {
    id: "membership",
    label: "Membership",
    icon: "card",
    color: "#14B8A6",
    screen: "MembershipRenewal" as const,
  },
];

const upcoming = [
  {
    id: "1",
    title: "HIIT Training",
    time: "Today · 6:00 PM",
    coach: "Coach Mike",
    tag: "Class",
  },
  {
    id: "2",
    title: "Personal Training",
    time: "Tomorrow · 10:00 AM",
    coach: "Coach Lisa",
    tag: "PT",
  },
  {
    id: "3",
    title: "Gym Floor Access",
    time: "Fri · 7:00 AM",
    coach: "Self",
    tag: "Open Gym",
  },
];

export function MemberHub() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { hasUnread } = useNotifications();
  const { colors } = useSettings();
  const [menuVisible, setMenuVisible] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;

  const profileImageUri = "";
  const hasProfileImage = Boolean(profileImageUri) && !profileImageError;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(menuAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(menuAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMenuVisible(false);
      }
    });
  };

  const menuItems = [
    { label: "Book Session", action: () => navigation.navigate("BookSession") },
    { label: "Join Class", action: () => navigation.navigate("JoinClass") },
    { label: "Add Challenge", action: () => navigation.navigate("AddChallenge") },
    { label: "Membership", action: () => navigation.navigate("MembershipRenewal") },
    { label: "My Stats", action: () => navigation.navigate("MyStats") },
    { label: "Account", action: () => navigation.navigate("Account") },
    { label: "Settings", action: () => navigation.navigate("Settings") },
    { label: "Logout", action: () => Alert.alert("Logged out", "You have been logged out.") },
  ];

  const handleAction = (action: (typeof quickActions)[number]) => {
    if (action.screen) {
      navigation.navigate(action.screen);
      return;
    }

    Alert.alert("Coming soon", "This feature will be available in a future update.");
  };

  const menuTranslateX = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-280, 0],
  });

  const menuBackdropOpacity = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.ScrollView contentContainerStyle={styles.content} style={{ opacity: fadeAnim }}>
        <View style={styles.topBar}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.card }]} onPress={openMenu}>
            <Ionicons name="menu" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.brandTitle, { color: BRAND_COLOR }]}>GymBios</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate("Notifications")}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              {hasUnread && <View style={styles.notificationDot} />}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.avatarWrapper, { backgroundColor: colors.card }]} onPress={() => navigation.navigate("Account")}>
              {hasProfileImage ? (
                <Image
                  source={{ uri: profileImageUri }}
                  style={styles.avatarImage}
                  onError={() => setProfileImageError(true)}
                />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: colors.border }]}>
                  <Text style={[styles.avatarFallbackText, { color: colors.textMuted }]}>SJ</Text>
                </View>
              )}
              <View style={styles.onlineDot} />
            </TouchableOpacity>
          </View>
        </View>

        {menuVisible && (
          <View style={styles.menuOverlay}>
            <Pressable style={styles.menuBackdrop} onPress={closeMenu}>
              <Animated.View style={[styles.menuBackdrop, { opacity: menuBackdropOpacity }]} />
            </Pressable>
            <Animated.View style={[styles.menuPanel, { transform: [{ translateX: menuTranslateX }], backgroundColor: colors.card }]}
            >
              <View style={styles.menuHeader}>
                <View style={styles.menuIconWrap}>
                  <MaterialCommunityIcons name="dumbbell" size={20} color={BRAND_COLOR} />
                </View>
                <Text style={[styles.menuBrand, { color: BRAND_COLOR }]}>GymBios</Text>
              </View>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.menuItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    closeMenu();
                    item.action();
                  }}
                >
                  <Text style={[styles.menuItemText, { color: colors.text }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          </View>
        )}

        <LinearGradient
          colors={["#16A34A", "#34D399"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroTitle}>Welcome back, Sarah</Text>
              <Text style={styles.heroSubtitle}>Premium Member · 12 day streak</Text>
            </View>
            <View style={styles.streakBadge}>
              <MaterialCommunityIcons name="fire" size={20} color="#fff" />
              <Text style={styles.streakText}>12</Text>
            </View>
          </View>
          <View style={styles.heroRow}>
            <View style={styles.heroPill}>
              <Ionicons name="calendar" size={16} color="#fff" />
              <Text style={styles.heroPillText}>Yoga · Today 5PM</Text>
            </View>
            <View style={styles.heroPill}>
              <Ionicons name="trophy" size={16} color="#fff" />
              <Text style={styles.heroPillText}>2 Challenges</Text>
            </View>
            <View style={styles.heroPill}>
              <Ionicons name="card" size={16} color="#fff" />
              <Text style={styles.heroPillText}>Valid till Nov 30</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            placeholder="Search classes, trainers, challenges"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        </View>
        <View style={styles.grid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionCard, { backgroundColor: colors.card }]}
              onPress={() => handleAction(action)}
              activeOpacity={0.85}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                <Ionicons name={action.icon as any} size={26} color="#fff" />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Bookings</Text>
          <TouchableOpacity onPress={() => navigation.navigate("BookSession")}>
            <Text style={[styles.link, { color: colors.textMuted }]}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cardList}>
          {upcoming.map((item) => (
            <View key={item.id} style={[styles.bookingCard, { backgroundColor: colors.card }]}
            >
              <View style={styles.bookingLeft}>
                <View style={styles.bookingTag}>
                  <Text style={styles.bookingTagText}>{item.tag}</Text>
                </View>
                <View>
                  <Text style={[styles.bookingTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.bookingMeta, { color: colors.textMuted }]}>{item.time}</Text>
                  <Text style={[styles.bookingMeta, { color: colors.textMuted }]}>with {item.coach}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.bookingButton}>
                <Text style={styles.bookingButtonText}>Manage</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>This Month</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Workouts</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>18</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Hours</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>24h</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Calories</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>3,240</Text>
          </View>
        </View>
      </Animated.ScrollView>
    </View>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "visible",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontWeight: "700",
  },
  onlineDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#F8FAFC",
    right: -2,
    bottom: -2,
  },
  notificationDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    top: 6,
    right: 6,
    borderWidth: 2,
    borderColor: "#F8FAFC",
  },
  menuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
  },
  menuPanel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 260,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 8, height: 0 },
    shadowRadius: 20,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E6F2F0",
  },
  menuBrand: {
    fontSize: 18,
    fontWeight: "700",
  },
  menuItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "600",
  },
  hero: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#E2FBEA",
    marginTop: 4,
  },
  streakBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  streakText: {
    color: "#fff",
    fontWeight: "700",
  },
  heroRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroPillText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  link: {
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    width: "48%",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  actionLabel: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
  },
  cardList: {
    gap: 12,
    marginBottom: 18,
  },
  bookingCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  bookingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bookingTag: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  bookingTagText: {
    color: "#0284C7",
    fontSize: 12,
    fontWeight: "700",
  },
  bookingTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  bookingMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  bookingButton: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  bookingButtonText: {
    color: "#0F172A",
    fontWeight: "600",
    fontSize: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 6,
  },
});
