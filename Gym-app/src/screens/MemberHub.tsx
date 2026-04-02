import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Alert,
  Easing,
  Image,
  Modal,
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
import { GlassCard } from "../components/GlassCard";
import { GlassScreen } from "../components/GlassScreen";
import { useAuth } from "../context/AuthContext";
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
    time: "Today - 6:00 PM",
    coach: "Coach Mike",
    tag: "Class",
  },
  {
    id: "2",
    title: "Personal Training",
    time: "Tomorrow - 10:00 AM",
    coach: "Coach Lisa",
    tag: "PT",
  },
  {
    id: "3",
    title: "Gym Floor Access",
    time: "Fri - 7:00 AM",
    coach: "Self",
    tag: "Open Gym",
  },
];

export function MemberHub() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout } = useAuth();
  const { hasUnread } = useNotifications();
  const { colors } = useSettings();
  const [menuVisible, setMenuVisible] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;

  const rawName = user?.username ?? "Member";
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const profileImageUri = "";
  const hasProfileImage = Boolean(profileImageUri) && !profileImageError;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(menuAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(menuAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMenuVisible(false);
      }
    });
  };

  const menuItems = [
    { label: "Book Session", icon: "calendar-outline", action: () => navigation.navigate("BookSession") },
    { label: "Join Class", icon: "people-outline", action: () => navigation.navigate("JoinClass") },
    { label: "Add Challenge", icon: "trophy-outline", action: () => navigation.navigate("AddChallenge") },
    { label: "Membership", icon: "card-outline", action: () => navigation.navigate("MembershipRenewal") },
    { label: "My Stats", icon: "stats-chart-outline", action: () => navigation.navigate("MyStats") },
    { label: "Account", icon: "person-outline", action: () => navigation.navigate("Account") },
    { label: "Settings", icon: "settings-outline", action: () => navigation.navigate("Settings") },
    {
      label: "Logout", icon: "log-out-outline", action: () => {
        closeMenu();
        setTimeout(() => setLogoutModalVisible(true), 260);
      }
    },
  ];

  const handleAction = (action: (typeof quickActions)[number]) => {
    if (action.screen) {
      navigation.navigate(action.screen);
      return;
    }

    if (action.id === "create-post") {
      navigation.getParent()?.navigate("Community" as never);
      return;
    }

    Alert.alert("Coming soon", "This feature will be available in a future update.");
  };

  const menuTranslateX = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 0],
  });

  const menuBackdropOpacity = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <GlassScreen>
      <Animated.ScrollView
        style={[styles.scroll, { opacity: fadeAnim }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={openMenu} activeOpacity={0.7} style={styles.iconGhost}>
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.brandTitle, { color: BRAND_COLOR }]}>GymBios</Text>

          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => navigation.navigate("Notifications")} activeOpacity={0.7} style={styles.iconGhost}>
              <View>
                <Ionicons name="notifications-outline" size={22} color={colors.text} />
                {hasUnread && <View style={styles.notificationDot} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("Account")} activeOpacity={0.8} style={styles.avatarTap}>
              <View style={styles.avatarWrapper}>
                {hasProfileImage ? (
                  <Image
                    source={{ uri: profileImageUri }}
                    style={styles.avatarImage}
                    onError={() => setProfileImageError(true)}
                  />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: colors.glass }]}>
                    <Text style={[styles.avatarFallbackText, { color: colors.textMuted }]}>
                      {displayName.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.onlineDot} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {menuVisible && (
          <View style={styles.menuOverlay}>
            <Pressable style={styles.menuPressable} onPress={closeMenu}>
              <Animated.View style={[styles.menuBackdrop, { opacity: menuBackdropOpacity }]} />
            </Pressable>

            <Animated.View style={[styles.menuPanelWrap, { transform: [{ translateX: menuTranslateX }] }]}>
              <GlassCard style={styles.menuPanel} intensity={55}>
                <View style={styles.menuPanelContent}>
                  <View style={styles.menuHeader}>
                    <View style={[styles.menuIconWrap, { backgroundColor: colors.glass }]}>
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
                      <View style={styles.menuItemLeft}>
                        <View style={[styles.menuItemIconWrap, { backgroundColor: colors.glass }]}>
                          <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={16} color={colors.text} />
                        </View>
                        <Text style={[styles.menuItemText, { color: colors.text }]}>{item.label}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              </GlassCard>
            </Animated.View>
          </View>
        )}

        <GlassCard style={styles.heroShell} intensity={35}>
          <LinearGradient
            colors={["#0F9F67", "#38C7A4", "#7DD3FC"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroGlow} />
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroTitle}>Welcome back, {displayName}</Text>
                <Text style={styles.heroSubtitle}>Premium Member - 12 day streak</Text>
              </View>
              <View style={styles.streakBadge}>
                <MaterialCommunityIcons name="fire" size={20} color="#fff" />
                <Text style={styles.streakText}>12</Text>
              </View>
            </View>
            <View style={styles.heroRow}>
              <View style={styles.heroPill}>
                <Ionicons name="calendar" size={16} color="#fff" />
                <Text style={styles.heroPillText}>Yoga - Today 5PM</Text>
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
        </GlassCard>

        <GlassCard style={styles.searchCard} intensity={35}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              placeholder="Search classes, trainers, challenges"
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>
        </GlassCard>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        </View>

        <View style={styles.grid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.gridItem}
              onPress={() => handleAction(action)}
              activeOpacity={0.85}
            >
              <GlassCard style={styles.actionCard}>
                <View style={styles.actionCardInner}>
                  <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                    <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={26} color="#fff" />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
                </View>
              </GlassCard>
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
            <GlassCard key={item.id} style={styles.bookingCard}>
              <View style={styles.bookingCardInner}>
                <View style={styles.bookingLeft}>
                  <View style={styles.bookingTag}>
                    <Text style={styles.bookingTagText}>{item.tag}</Text>
                  </View>
                  <View style={styles.bookingTextWrap}>
                    <Text style={[styles.bookingTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.bookingMeta, { color: colors.textMuted }]}>{item.time}</Text>
                    <Text style={[styles.bookingMeta, { color: colors.textMuted }]}>with {item.coach}</Text>
                  </View>
                </View>
                <TouchableOpacity style={[styles.bookingButton, { backgroundColor: colors.glass }]}>
                  <Text style={[styles.bookingButtonText, { color: colors.text }]}>Manage</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          ))}
        </View>

        <Text style={[styles.sectionTitle, styles.monthTitle, { color: colors.text }]}>This Month</Text>
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <View style={styles.statCardInner}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Workouts</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>18</Text>
            </View>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <View style={styles.statCardInner}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Hours</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>24h</Text>
            </View>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <View style={styles.statCardInner}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Calories</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>3,240</Text>
            </View>
          </GlassCard>
        </View>
      </Animated.ScrollView>

      {/* Logout confirmation modal */}
      <Modal transparent animationType="fade" visible={logoutModalVisible} onRequestClose={() => setLogoutModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={[styles.modalIconWrap, { backgroundColor: "rgba(239,68,68,0.1)" }]}>
              <Ionicons name="log-out-outline" size={28} color="#EF4444" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Sign Out</Text>
            <Text style={[styles.modalMessage, { color: colors.textMuted }]}>Are you sure you want to sign out of GymBios?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: colors.border }]} onPress={() => setLogoutModalVisible(false)}>
                <Text style={[styles.modalBtnCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnConfirm]} onPress={() => { setLogoutModalVisible(false); logout(); }}>
                <Text style={styles.modalBtnConfirmText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GlassScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  iconGhost: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarTap: {
    padding: 2,
  },
  avatarWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0,
    borderColor: "transparent",
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    borderColor: "transparent",
  },
  avatarFallbackText: {
    fontWeight: "700",
  },
  onlineDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#F8FAFC",
    right: -1,
    bottom: -1,
  },
  notificationDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    top: 10,
    right: 10,
    borderWidth: 2,
    borderColor: "#F8FAFC",
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  menuPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 15, 13, 0.28)",
  },
  menuPanelWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 290,
  },
  menuPanel: {
    flex: 1,
    borderRadius: 0,
  },
  menuPanelContent: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBrand: {
    fontSize: 20,
    fontWeight: "700",
  },
  menuItem: {
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuItemIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "600",
  },
  heroShell: {
    marginBottom: 18,
    borderWidth: 0,
    borderColor: "transparent",
  },
  hero: {
    borderRadius: 24,
    padding: 22,
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.16)",
    top: -40,
    right: -10,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.84)",
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
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroPillText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  searchCard: {
    marginBottom: 22,
    borderRadius: 18,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  monthTitle: {
    marginBottom: 12,
  },
  link: {
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 22,
  },
  gridItem: {
    width: "48%",
  },
  actionCard: {
    minHeight: 144,
    borderRadius: 22,
  },
  actionCardInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionLabel: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
  },
  cardList: {
    gap: 12,
    marginBottom: 22,
  },
  bookingCard: {
    borderRadius: 22,
  },
  bookingCardInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: 18,
  },
  bookingLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bookingTextWrap: {
    flex: 1,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  bookingButtonText: {
    fontWeight: "700",
    fontSize: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 22,
  },
  statCardInner: {
    alignItems: "center",
    padding: 18,
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  modalBox: {
    width: "100%",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },
  modalBtnCancel: {
    borderWidth: 1,
  },
  modalBtnCancelText: {
    fontWeight: "600",
    fontSize: 15,
  },
  modalBtnConfirm: {
    backgroundColor: "#EF4444",
  },
  modalBtnConfirmText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
