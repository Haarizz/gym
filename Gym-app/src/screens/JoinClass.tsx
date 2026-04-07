import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { GlassCard } from "../components/GlassCard";
import { GlassScreen } from "../components/GlassScreen";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../services/api";
import type { RootStackParamList } from "../navigation/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TrainingSession {
  id: string;
  name: string;
  type: string;
  trainer_name: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  capacity: number;
  booked: number;
  price: number | null;
  status: string;
  description: string | null;
}

interface ActiveBooking {
  id: string;
  session_id: string;
  session_name: string | null;
  date: string | null;
  start_time: string | null;
  status: string;
  payment_status: string | null;
  price: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const FILTERS = ["All", "Yoga", "HIIT", "Strength", "Mindfulness"];

function formatTime(t: string | null): string {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr.padStart(2, "0");
  const suffix = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${suffix}`;
}

function matchesFilter(session: TrainingSession, filter: string): boolean {
  if (filter === "All") return true;
  const haystack = (session.name ?? "").toLowerCase();
  const map: Record<string, string[]> = {
    Yoga: ["yoga"],
    HIIT: ["hiit", "hit burn"],
    Strength: ["strength"],
    Mindfulness: ["mindfulness", "pilates", "meditation", "calm"],
  };
  return (map[filter] ?? []).some((kw) => haystack.includes(kw));
}

// ── Component ─────────────────────────────────────────────────────────────────

export function JoinClass() {
  const { colors } = useSettings();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");

  // Payment modal state
  const [payModalSession, setPayModalSession] = useState<TrainingSession | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [unjoiningId, setUnjoiningId] = useState<string | null>(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const resolveMember = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/members/by-user/${user.userId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return String(data.id);
    } catch {
      return null;
    }
  }, [user]);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [sessRes, mId] = await Promise.all([
        fetch(`${API_BASE_URL}/sessions?type=class`),
        resolveMember(),
      ]);

      if (!sessRes.ok) throw new Error(`Server error ${sessRes.status}`);
      const sessData: TrainingSession[] = await sessRes.json();
      setSessions(sessData.filter((s) => s.status !== "cancelled"));
      setMemberId(mId);

      // Fetch member's active (non-cancelled) bookings
      if (mId) {
        const bRes = await fetch(`${API_BASE_URL}/bookings?memberId=${mId}`);
        if (bRes.ok) {
          const bData: any[] = await bRes.json();
          const active = bData.find(
            (b) =>
              (b.status ?? b.status) !== "cancelled" &&
              (b.session_id ?? b.sessionId) != null
          );
          if (active) {
            setActiveBooking({
              id: String(active.id),
              session_id: String(active.session_id ?? active.sessionId),
              session_name: active.session_name ?? active.sessionName ?? null,
              date: active.date ?? null,
              start_time: active.start_time ?? active.startTime ?? null,
              status: active.status,
              payment_status: active.payment_status ?? active.paymentStatus ?? null,
              price: active.price ?? null,
            });
          } else {
            setActiveBooking(null);
          }
        }
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load classes");
    }
  }, [resolveMember]);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ── Join flow ─────────────────────────────────────────────────────────────

  const handleJoinPress = (session: TrainingSession) => {
    if (!user) {
      Alert.alert("Not logged in", "Please log in to join a class.");
      return;
    }
    if (activeBooking) {
      Alert.alert(
        "Already Joined",
        `You are already joined in "${activeBooking.session_name}". Please unjoin first to join another class.`
      );
      return;
    }
    const spotsLeft = (session.capacity ?? 0) - (session.booked ?? 0);
    if (spotsLeft <= 0) {
      Alert.alert("Class Full", "There are no spots left for this class.");
      return;
    }

    // If class has a price, show payment modal — otherwise join directly (free)
    if (session.price && Number(session.price) > 0) {
      setPayModalSession(session);
    } else {
      confirmJoin(session, null);
    }
  };

  const confirmJoin = async (session: TrainingSession, paymentStatus: "paid" | "pay_later" | null) => {
    if (!memberId) {
      Alert.alert("Error", "Could not find your membership record. Contact the gym.");
      return;
    }
    setPayModalSession(null);
    setProcessingId(session.id);
    try {
      const body: any = {
        session_id: Number(session.id),
        member_id: Number(memberId),
        status: "confirmed",
      };
      if (paymentStatus) body.payment_status = paymentStatus;

      const res = await fetch(`${API_BASE_URL}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message ?? `Booking failed (${res.status})`);
      }
      const booking = await res.json();

      // Update local state: optimistic spot decrement + set active booking
      setSessions((prev) =>
        prev.map((s) =>
          s.id === session.id ? { ...s, booked: (s.booked ?? 0) + 1 } : s
        )
      );
      setActiveBooking({
        id: String(booking.id ?? booking.id),
        session_id: String(session.id),
        session_name: session.name,
        date: session.date,
        start_time: session.start_time,
        status: "confirmed",
        payment_status: paymentStatus,
        price: session.price,
      });

      const msg =
        paymentStatus === "pay_later"
          ? `You've joined "${session.name}". Pay at the gym before the session.`
          : `You've successfully joined "${session.name}".`;
      Alert.alert("Booked!", msg);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Something went wrong. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  // ── Unjoin flow ───────────────────────────────────────────────────────────

  const handleUnjoin = () => {
    if (!activeBooking) return;
    Alert.alert(
      "Unjoin Class",
      `Are you sure you want to unjoin "${activeBooking.session_name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Unjoin", style: "destructive", onPress: doUnjoin },
      ]
    );
  };

  const doUnjoin = async () => {
    if (!activeBooking) return;
    setUnjoiningId(activeBooking.id);
    try {
      const res = await fetch(`${API_BASE_URL}/bookings/${activeBooking.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) throw new Error(`Failed to cancel (${res.status})`);

      // Restore spot count
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeBooking.session_id
            ? { ...s, booked: Math.max(0, (s.booked ?? 1) - 1) }
            : s
        )
      );
      setActiveBooking(null);
      Alert.alert("Unjoined", "You've been removed from the class.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not unjoin. Try again.");
    } finally {
      setUnjoiningId(null);
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = sessions.filter((s) => matchesFilter(s, activeFilter));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <GlassScreen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22D3EE" />
        }
      >
        {/* Hero */}
        <GlassCard style={styles.heroShell} intensity={35}>
          <LinearGradient
            colors={["#0F766E", "#22D3EE", "#67E8F9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroTitle}>Join a Class</Text>
            <Text style={styles.heroSubtitle}>Find a session and reserve your spot.</Text>
          </LinearGradient>
        </GlassCard>

        {/* Active booking banner */}
        {activeBooking && (
          <GlassCard style={styles.activeBanner}>
            <View style={styles.activeBannerInner}>
              <View style={styles.activeBannerLeft}>
                <View style={styles.activeDot} />
                <View style={styles.activeBannerText}>
                  <Text style={[styles.activeBannerTitle, { color: colors.text }]} numberOfLines={1}>
                    {activeBooking.session_name}
                  </Text>
                  <View style={styles.activeBannerRow}>
                    {activeBooking.date ? (
                      <Text style={[styles.activeBannerMeta, { color: colors.textMuted }]}>
                        {new Date(activeBooking.date).toLocaleDateString(undefined, {
                          weekday: "short", month: "short", day: "numeric",
                        })}
                        {activeBooking.start_time ? `  ${formatTime(activeBooking.start_time)}` : ""}
                      </Text>
                    ) : null}
                    {activeBooking.payment_status === "pay_later" && (
                      <View style={styles.payLaterChip}>
                        <Text style={styles.payLaterChipText}>Pay Later</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.activeBannerActions}>
                <TouchableOpacity
                  style={styles.calendarBtn}
                  onPress={() => navigation.navigate("ClassCalendar")}
                >
                  <Ionicons name="calendar-outline" size={18} color="#0F766E" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.unjoinBtn}
                  onPress={handleUnjoin}
                  disabled={!!unjoiningId}
                >
                  {unjoiningId ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.unjoinBtnText}>Unjoin</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Calendar shortcut (when no active booking) */}
        {!activeBooking && !loading && (
          <TouchableOpacity
            style={[styles.calendarShortcut, { borderColor: colors.border }]}
            onPress={() => navigation.navigate("ClassCalendar")}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.calendarShortcutText, { color: colors.textMuted }]}>
              View my class schedule
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === filter ? "#0F766E" : colors.glassStrong,
                  borderColor: activeFilter === filter ? "#0F766E" : colors.border,
                },
              ]}
            >
              <Text
                style={
                  activeFilter === filter
                    ? styles.filterTextActive
                    : [styles.filterText, { color: colors.text }]
                }
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* States */}
        {loading ? (
          <View style={styles.centred}>
            <ActivityIndicator size="large" color="#22D3EE" />
            <Text style={[styles.statusText, { color: colors.textMuted }]}>Loading classes…</Text>
          </View>
        ) : error ? (
          <View style={styles.centred}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.statusText, { color: colors.textMuted }]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centred}>
            <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.statusText, { color: colors.textMuted }]}>
              No classes available{activeFilter !== "All" ? ` for ${activeFilter}` : ""}.
            </Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {filtered.map((item) => {
              const spotsLeft = (item.capacity ?? 0) - (item.booked ?? 0);
              const isFull = spotsLeft <= 0;
              const isProcessing = processingId === item.id;
              const isActiveSession = activeBooking?.session_id === item.id;
              const timeLine = [
                item.start_time ? formatTime(item.start_time) : null,
                item.location,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <GlassCard key={item.id} style={styles.classCard}>
                  <View style={styles.classCardInner}>
                    {/* Header */}
                    <View style={styles.classHeader}>
                      <Text style={[styles.classTitle, { color: colors.text }]} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <View style={[styles.spotsBadge, isFull && styles.spotsBadgeFull]}>
                        <Text style={[styles.spotsText, isFull && styles.spotsTextFull]}>
                          {isFull ? "Full" : `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`}
                        </Text>
                      </View>
                    </View>

                    {/* Time & location */}
                    {timeLine ? (
                      <Text style={[styles.classMeta, { color: colors.textMuted }]}>{timeLine}</Text>
                    ) : null}

                    {/* Date */}
                    {item.date ? (
                      <Text style={[styles.classMeta, { color: colors.textMuted }]}>
                        {new Date(item.date).toLocaleDateString(undefined, {
                          weekday: "short", month: "short", day: "numeric",
                        })}
                      </Text>
                    ) : null}

                    {/* Price */}
                    {item.price && Number(item.price) > 0 ? (
                      <Text style={[styles.priceText, { color: colors.textMuted }]}>
                        {Number(item.price).toFixed(0)} AED
                      </Text>
                    ) : (
                      <Text style={[styles.priceText, { color: "#22C55E" }]}>Free</Text>
                    )}

                    {/* Trainer */}
                    {item.trainer_name ? (
                      <View style={styles.classCoachRow}>
                        <Ionicons name="person" size={16} color={colors.textMuted} />
                        <Text style={[styles.classCoachText, { color: colors.textMuted }]}>
                          {item.trainer_name}
                        </Text>
                      </View>
                    ) : null}

                    {/* Join button */}
                    <TouchableOpacity
                      style={[
                        styles.joinButton,
                        (isFull || !!activeBooking) && !isActiveSession && styles.joinButtonDisabled,
                        isActiveSession && styles.joinButtonActive,
                      ]}
                      onPress={() => handleJoinPress(item)}
                      disabled={isFull || isProcessing || !!activeBooking}
                    >
                      {isProcessing ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : isActiveSession ? (
                        <Text style={styles.joinButtonText}>Joined</Text>
                      ) : isFull ? (
                        <Text style={styles.joinButtonText}>Class Full</Text>
                      ) : activeBooking ? (
                        <Text style={styles.joinButtonText}>Already in a Class</Text>
                      ) : (
                        <Text style={styles.joinButtonText}>Join Class</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Payment modal */}
      <Modal
        visible={!!payModalSession}
        transparent
        animationType="slide"
        onRequestClose={() => setPayModalSession(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Payment</Text>
              <TouchableOpacity onPress={() => setPayModalSession(null)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {payModalSession && (
              <>
                <Text style={[styles.modalSessionName, { color: colors.text }]}>
                  {payModalSession.name}
                </Text>
                <Text style={[styles.modalPrice, { color: "#0F766E" }]}>
                  {Number(payModalSession.price).toFixed(0)} AED
                </Text>
                <Text style={[styles.modalSubtext, { color: colors.textMuted }]}>
                  How would you like to pay?
                </Text>

                <TouchableOpacity
                  style={styles.payNowBtn}
                  onPress={() => confirmJoin(payModalSession, "paid")}
                >
                  <Ionicons name="card-outline" size={18} color="#fff" />
                  <Text style={styles.payNowBtnText}>Pay Now (In-App)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.payLaterBtn, { borderColor: colors.border }]}
                  onPress={() => confirmJoin(payModalSession, "pay_later")}
                >
                  <Ionicons name="time-outline" size={18} color={colors.text} />
                  <Text style={[styles.payLaterBtnText, { color: colors.text }]}>
                    Pay Later at the Gym
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.payLaterNote, { color: colors.textMuted }]}>
                  Pay Later bookings appear in your schedule so the gym can collect payment on arrival.
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </GlassScreen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  heroShell: { marginBottom: 16 },
  hero: { borderRadius: 24, padding: 20 },
  heroTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },
  heroSubtitle: { color: "#CCFBF1", marginTop: 6 },

  // Active booking banner
  activeBanner: { borderRadius: 18, marginBottom: 14, borderWidth: 1.5, borderColor: "#0F766E" },
  activeBannerInner: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activeBannerLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },
  activeBannerText: { flex: 1 },
  activeBannerTitle: { fontWeight: "700", fontSize: 14, marginBottom: 2 },
  activeBannerRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  activeBannerMeta: { fontSize: 12 },
  payLaterChip: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  payLaterChipText: { color: "#92400E", fontSize: 11, fontWeight: "700" },
  activeBannerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  calendarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#CCFBF1",
    alignItems: "center",
    justifyContent: "center",
  },
  unjoinBtn: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 64,
    alignItems: "center",
  },
  unjoinBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Calendar shortcut
  calendarShortcut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  calendarShortcutText: { flex: 1, fontSize: 13, fontWeight: "600" },

  // Filters
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  filterText: { fontWeight: "600" },
  filterTextActive: { color: "#fff", fontWeight: "700" },

  // States
  centred: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  statusText: { textAlign: "center", fontSize: 14 },
  retryButton: {
    marginTop: 4, paddingHorizontal: 20, paddingVertical: 8,
    backgroundColor: "#0F766E", borderRadius: 999,
  },
  retryText: { color: "#fff", fontWeight: "700" },

  // Class cards
  cardList: { gap: 12 },
  classCard: { borderRadius: 24 },
  classCardInner: { padding: 18 },
  classHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 12,
  },
  classTitle: { fontSize: 16, fontWeight: "700", flex: 1 },
  spotsBadge: { backgroundColor: "#E0F2FE", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  spotsBadgeFull: { backgroundColor: "#FEE2E2" },
  spotsText: { color: "#0284C7", fontWeight: "600", fontSize: 12 },
  spotsTextFull: { color: "#DC2626" },
  classMeta: { marginBottom: 4, fontSize: 13 },
  priceText: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  classCoachRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14, marginTop: 4 },
  classCoachText: { fontSize: 13 },
  joinButton: { backgroundColor: "#0F172A", borderRadius: 14, paddingVertical: 10, alignItems: "center" },
  joinButtonDisabled: { backgroundColor: "#9CA3AF" },
  joinButtonActive: { backgroundColor: "#0F766E" },
  joinButtonText: { color: "#fff", fontWeight: "700" },

  // Payment modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalBox: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalSessionName: { fontSize: 15, fontWeight: "600", marginBottom: 6 },
  modalPrice: { fontSize: 28, fontWeight: "700", marginBottom: 6 },
  modalSubtext: { fontSize: 13, marginBottom: 20 },
  payNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0F766E",
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  payNowBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  payLaterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  payLaterBtnText: { fontWeight: "700", fontSize: 15 },
  payLaterNote: { fontSize: 12, textAlign: "center", lineHeight: 18 },
});
