import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassCard } from '../components/GlassCard';
import { GlassScreen } from '../components/GlassScreen';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { useSettings } from '../context/SettingsContext';
import { BRAND_COLOR } from '../theme';

const quickActions = [
  { id: 'schedule',   label: 'My Schedule',    icon: 'calendar',       color: '#2563EB' },
  { id: 'clients',    label: 'My Clients',      icon: 'people',         color: '#059669' },
  { id: 'sessions',   label: 'Sessions',        icon: 'barbell-outline', color: '#F59E0B' },
  { id: 'targets',    label: 'Targets',         icon: 'trophy',         color: '#8B5CF6' },
  { id: 'attendance', label: 'Attendance',      icon: 'checkmark-done', color: '#0EA5E9' },
  { id: 'reports',    label: 'Reports',         icon: 'stats-chart',    color: '#14B8A6' },
];

export function StaffHub() {
  const { user, logout } = useAuth();
  const { hasUnread } = useNotifications();
  const { colors } = useSettings();

  const [menuVisible, setMenuVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;

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
      if (finished) setMenuVisible(false);
    });
  };

  const handleLogout = () => {
    closeMenu();
    setTimeout(() => setLogoutModalVisible(true), 260);
  };

  const menuItems = [
    { label: 'My Schedule',  icon: 'calendar-outline',     action: () => {} },
    { label: 'My Clients',   icon: 'people-outline',       action: () => {} },
    { label: 'Sessions',     icon: 'fitness-outline',      action: () => {} },
    { label: 'Targets',      icon: 'trophy-outline',       action: () => {} },
    { label: 'Settings',     icon: 'settings-outline',     action: () => {} },
    { label: 'Sign Out',     icon: 'log-out-outline',      action: handleLogout },
  ];

  const menuTranslateX = menuAnim.interpolate({ inputRange: [0, 1], outputRange: [-300, 0] });
  const menuBackdropOpacity = menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  const rawName = user?.username ?? 'Staff';
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  return (
    <GlassScreen>
      <Animated.ScrollView
        style={[styles.scroll, { opacity: fadeAnim }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={openMenu} activeOpacity={0.7} style={styles.iconGhost}>
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.brandTitle, { color: BRAND_COLOR }]}>GymBios</Text>
          <View style={styles.headerRight}>
            <View style={styles.iconGhost}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              {hasUnread && <View style={styles.notificationDot} />}
            </View>
            <View style={[styles.avatarFallback, { backgroundColor: colors.glass }]}>
              <Text style={[styles.avatarFallbackText, { color: BRAND_COLOR }]}>
                {displayName.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Slide-out menu */}
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
                  <Text style={[styles.menuUsername, { color: colors.textMuted }]}>@{displayName}</Text>
                  {menuItems.map(item => (
                    <TouchableOpacity
                      key={item.label}
                      style={[styles.menuItem, { borderBottomColor: colors.border }]}
                      onPress={() => { closeMenu(); item.action(); }}
                    >
                      <View style={styles.menuItemLeft}>
                        <View style={[styles.menuItemIconWrap, { backgroundColor: colors.glass }]}>
                          <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={16} color={colors.text} />
                        </View>
                        <Text style={[styles.menuItemText, { color: item.label === 'Sign Out' ? '#EF4444' : colors.text }]}>
                          {item.label}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              </GlassCard>
            </Animated.View>
          </View>
        )}

        {/* Hero */}
        <GlassCard style={styles.heroShell} intensity={35}>
          <LinearGradient
            colors={['#1E3A5F', '#2563EB', '#60A5FA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroGlow} />
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroTitle}>Welcome, {displayName}</Text>
                <Text style={styles.heroSubtitle}>Staff Dashboard</Text>
              </View>
              <View style={[styles.roleBadge]}>
                <Ionicons name="shield-checkmark" size={16} color="#fff" />
                <Text style={styles.roleBadgeText}>Staff</Text>
              </View>
            </View>
            <View style={styles.heroRow}>
              <View style={styles.heroPill}>
                <Ionicons name="people" size={14} color="#fff" />
                <Text style={styles.heroPillText}>12 Clients Today</Text>
              </View>
              <View style={styles.heroPill}>
                <Ionicons name="calendar" size={14} color="#fff" />
                <Text style={styles.heroPillText}>4 Sessions</Text>
              </View>
            </View>
          </LinearGradient>
        </GlassCard>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        </View>
        <View style={styles.grid}>
          {quickActions.map(action => (
            <TouchableOpacity
              key={action.id}
              style={styles.gridItem}
              onPress={() => {}}
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

        {/* Today's stats */}
        <Text style={[styles.sectionTitle, styles.statsTitle, { color: colors.text }]}>This Week</Text>
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <View style={styles.statCardInner}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sessions</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>18</Text>
            </View>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <View style={styles.statCardInner}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Clients</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>24</Text>
            </View>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <View style={styles.statCardInner}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Revenue</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>2.4k</Text>
            </View>
          </GlassCard>
        </View>
      </Animated.ScrollView>

      {/* Logout confirmation modal */}
      <Modal transparent animationType="fade" visible={logoutModalVisible} onRequestClose={() => setLogoutModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalIconWrap}>
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
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  iconGhost: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  brandTitle: { fontSize: 20, fontWeight: '700', letterSpacing: 0.2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: { fontWeight: '700', fontSize: 13 },
  notificationDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    top: 10,
    right: 10,
    borderWidth: 2,
    borderColor: '#F8FAFC',
  },
  menuOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 20 },
  menuPressable: { ...StyleSheet.absoluteFillObject },
  menuBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,15,13,0.28)' },
  menuPanelWrap: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 290 },
  menuPanel: { flex: 1, borderRadius: 0 },
  menuPanelContent: { flex: 1, paddingTop: 60, paddingHorizontal: 22, paddingBottom: 24 },
  menuHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  menuIconWrap: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  menuBrand: { fontSize: 20, fontWeight: '700' },
  menuUsername: { fontSize: 13, marginBottom: 14 },
  menuItem: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuItemIconWrap: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuItemText: { fontSize: 15, fontWeight: '600' },
  heroShell: { marginBottom: 18, borderWidth: 0, borderColor: 'transparent' },
  hero: { borderRadius: 24, padding: 22, overflow: 'hidden' },
  heroGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.16)',
    top: -40,
    right: -10,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.84)', marginTop: 4 },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleBadgeText: { color: '#fff', fontWeight: '700' },
  heroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroPillText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  statsTitle: { marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 22 },
  gridItem: { width: '48%' },
  actionCard: { minHeight: 144, borderRadius: 22 },
  actionCardInner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18 },
  actionIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionLabel: { textAlign: 'center', fontSize: 13, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, borderRadius: 22 },
  statCardInner: { alignItems: 'center', padding: 18 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 20, fontWeight: '700', marginTop: 6 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  modalBox: { width: '100%', borderRadius: 24, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 10 },
  modalIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.1)', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalMessage: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
  modalBtnCancel: { borderWidth: 1 },
  modalBtnCancelText: { fontWeight: '600', fontSize: 15 },
  modalBtnConfirm: { backgroundColor: '#EF4444' },
  modalBtnConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
