import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../components/GlassCard";
import { GlassScreen } from "../components/GlassScreen";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  session_id: string | null;
  session_name: string | null;
  trainer_name: string | null;
  date: string | null;        // "YYYY-MM-DD"
  start_time: string | null;  // "HH:MM:SS"
  type: string | null;
  status: string;
  payment_status: string | null;
  price: number | null;
  qr_code: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

function toDateKey(dateStr: string | null): string | null {
  if (!dateStr) return null;
  // already YYYY-MM-DD
  return dateStr.slice(0, 10);
}

function statusColor(status: string, paymentStatus: string | null): string {
  if (status === "cancelled") return "#9CA3AF";
  if (paymentStatus === "pay_later") return "#F59E0B";
  if (status === "checked-in") return "#22C55E";
  return "#0F766E";
}

function statusLabel(status: string, paymentStatus: string | null): string {
  if (status === "cancelled") return "Cancelled";
  if (status === "checked-in") return "Checked In";
  if (status === "no-show") return "No Show";
  if (paymentStatus === "pay_later") return "Pay Later";
  if (paymentStatus === "paid") return "Paid";
  return "Confirmed";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ClassCalendar() {
  const { colors } = useSettings();
  const { user } = useAuth();

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-based
  const [selectedDateKey, setSelectedDateKey] = useState<string>(
    today.toISOString().slice(0, 10)
  );

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch bookings ─────────────────────────────────────────────────────────

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      // Resolve member ID
      const mRes = await fetch(`${API_BASE_URL}/members/by-user/${user.userId}`);
      if (!mRes.ok) throw new Error("Membership record not found");
      const mData = await mRes.json();
      const memberId = String(mData.id);

      // Fetch all member bookings (no status filter — we want all including cancelled for history)
      const bRes = await fetch(`${API_BASE_URL}/bookings?memberId=${memberId}`);
      if (!bRes.ok) throw new Error(`Server error ${bRes.status}`);
      const raw: any[] = await bRes.json();

      const mapped: Booking[] = raw.map((b) => ({
        id: String(b.id),
        session_id: String(b.session_id ?? b.sessionId ?? ""),
        session_name: b.session_name ?? b.sessionName ?? null,
        trainer_name: b.trainer_name ?? b.trainerName ?? null,
        date: b.date ?? null,
        start_time: b.start_time ?? b.startTime ?? null,
        type: b.type ?? null,
        status: b.status ?? "confirmed",
        payment_status: b.payment_status ?? b.paymentStatus ?? null,
        price: b.price ?? null,
        qr_code: b.qr_code ?? b.qrCode ?? null,
      }));

      setBookings(mapped);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load bookings");
    }
  }, [user]);

  useEffect(() => {
    fetchBookings().finally(() => setLoading(false));
  }, [fetchBookings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  }, [fetchBookings]);

  // ── Calendar grid helpers ─────────────────────────────────────────────────

  const bookedDates = new Set(
    bookings
      .filter((b) => b.status !== "cancelled")
      .map((b) => toDateKey(b.date))
      .filter(Boolean) as string[]
  );

  const payLaterDates = new Set(
    bookings
      .filter((b) => b.payment_status === "pay_later" && b.status !== "cancelled")
      .map((b) => toDateKey(b.date))
      .filter(Boolean) as string[]
  );

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };

  const dateKey = (day: number) =>
    `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  // Bookings for selected date
  const selectedBookings = bookings.filter(
    (b) => toDateKey(b.date) === selectedDateKey
  );

  // All non-cancelled upcoming bookings sorted by date
  const upcomingBookings = bookings
    .filter((b) => b.status !== "cancelled" && b.date && b.date >= today.toISOString().slice(0, 10))
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

  const payLaterList = bookings.filter(
    (b) => b.payment_status === "pay_later" && b.status !== "cancelled"
  );

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
            colors={["#1E3A5F", "#2563EB", "#67E8F9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroTitle}>My Schedule</Text>
            <Text style={styles.heroSubtitle}>All your joined classes at a glance.</Text>
          </LinearGradient>
        </GlassCard>

        {loading ? (
          <View style={styles.centred}>
            <ActivityIndicator size="large" color="#22D3EE" />
            <Text style={[styles.statusText, { color: colors.textMuted }]}>Loading schedule…</Text>
          </View>
        ) : error ? (
          <View style={styles.centred}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.statusText, { color: colors.textMuted }]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Pay Later alert */}
            {payLaterList.length > 0 && (
              <GlassCard style={styles.payLaterAlert}>
                <View style={styles.payLaterAlertInner}>
                  <Ionicons name="alert-circle-outline" size={20} color="#92400E" />
                  <Text style={styles.payLaterAlertText}>
                    You have {payLaterList.length} pending payment{payLaterList.length > 1 ? "s" : ""} to settle at the gym.
                  </Text>
                </View>
              </GlassCard>
            )}

            {/* Calendar */}
            <GlassCard style={styles.calendarCard}>
              {/* Month navigation */}
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={prevMonth} style={styles.monthNavBtn}>
                  <Ionicons name="chevron-back" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.monthTitle, { color: colors.text }]}>
                  {MONTHS[currentMonth]} {currentYear}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={styles.monthNavBtn}>
                  <Ionicons name="chevron-forward" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Day-of-week headers */}
              <View style={styles.dayHeaders}>
                {DAYS.map((d) => (
                  <Text key={d} style={[styles.dayHeader, { color: colors.textMuted }]}>{d}</Text>
                ))}
              </View>

              {/* Day grid */}
              <View style={styles.grid}>
                {/* empty cells before month start */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <View key={`e-${i}`} style={styles.dayCell} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dk = dateKey(day);
                  const hasBooking = bookedDates.has(dk);
                  const isPayLater = payLaterDates.has(dk);
                  const isToday = dk === today.toISOString().slice(0, 10);
                  const isSelected = dk === selectedDateKey;

                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayCell,
                        isSelected && styles.dayCellSelected,
                        isToday && !isSelected && styles.dayCellToday,
                      ]}
                      onPress={() => setSelectedDateKey(dk)}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          { color: isSelected ? "#fff" : colors.text },
                          isToday && !isSelected && { color: "#0F766E", fontWeight: "700" },
                        ]}
                      >
                        {day}
                      </Text>
                      {hasBooking && (
                        <View
                          style={[
                            styles.bookingDot,
                            { backgroundColor: isPayLater ? "#F59E0B" : "#0F766E" },
                          ]}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Legend */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#0F766E" }]} />
                  <Text style={[styles.legendText, { color: colors.textMuted }]}>Booked</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
                  <Text style={[styles.legendText, { color: colors.textMuted }]}>Pay Later</Text>
                </View>
              </View>
            </GlassCard>

            {/* Selected date detail */}
            <Text style={[styles.sectionLabel, { color: colors.text }]}>
              {selectedDateKey === today.toISOString().slice(0, 10)
                ? "Today"
                : new Date(selectedDateKey + "T00:00:00").toLocaleDateString(undefined, {
                    weekday: "long", month: "long", day: "numeric",
                  })}
            </Text>

            {selectedBookings.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No classes on this day.
                </Text>
              </GlassCard>
            ) : (
              <View style={styles.bookingList}>
                {selectedBookings.map((b) => (
                  <BookingCard key={b.id} booking={b} colors={colors} />
                ))}
              </View>
            )}

            {/* Upcoming section */}
            {upcomingBookings.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 20 }]}>
                  Upcoming
                </Text>
                <View style={styles.bookingList}>
                  {upcomingBookings.slice(0, 5).map((b) => (
                    <BookingCard key={b.id} booking={b} colors={colors} />
                  ))}
                </View>
              </>
            )}

            {/* Pay Later section */}
            {payLaterList.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 20 }]}>
                  Pending Payments
                </Text>
                <View style={styles.bookingList}>
                  {payLaterList.map((b) => (
                    <BookingCard key={b.id} booking={b} colors={colors} />
                  ))}
                </View>
              </>
            )}

            {bookings.length === 0 && (
              <View style={styles.centred}>
                <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.statusText, { color: colors.textMuted }]}>
                  No bookings yet. Join a class to get started!
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </GlassScreen>
  );
}

// ── Booking card sub-component ────────────────────────────────────────────────

function BookingCard({ booking, colors }: { booking: Booking; colors: any }) {
  const color = statusColor(booking.status, booking.payment_status);
  const label = statusLabel(booking.status, booking.payment_status);

  return (
    <GlassCard style={styles.bookingCard}>
      <View style={styles.bookingCardInner}>
        <View style={[styles.bookingAccent, { backgroundColor: color }]} />
        <View style={styles.bookingInfo}>
          <View style={styles.bookingTopRow}>
            <Text style={[styles.bookingTitle, { color: colors.text }]} numberOfLines={1}>
              {booking.session_name ?? "Class"}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: `${color}22` }]}>
              <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
            </View>
          </View>

          {booking.date && (
            <Text style={[styles.bookingMeta, { color: colors.textMuted }]}>
              {new Date(booking.date + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "short", month: "short", day: "numeric",
              })}
              {booking.start_time ? `  ·  ${formatTime(booking.start_time)}` : ""}
            </Text>
          )}

          {booking.trainer_name && (
            <Text style={[styles.bookingMeta, { color: colors.textMuted }]}>
              with {booking.trainer_name}
            </Text>
          )}

          {booking.price && Number(booking.price) > 0 && (
            <Text style={[styles.bookingPrice, { color: color }]}>
              {Number(booking.price).toFixed(0)} AED
              {booking.payment_status === "pay_later" ? " — Pay at gym" : booking.payment_status === "paid" ? " — Paid" : ""}
            </Text>
          )}
        </View>
      </View>
    </GlassCard>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  heroShell: { marginBottom: 16 },
  hero: { borderRadius: 24, padding: 20 },
  heroTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },
  heroSubtitle: { color: "#BFDBFE", marginTop: 6 },

  centred: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  statusText: { textAlign: "center", fontSize: 14, paddingHorizontal: 24 },
  retryButton: {
    paddingHorizontal: 20, paddingVertical: 8,
    backgroundColor: "#0F766E", borderRadius: 999,
  },
  retryText: { color: "#fff", fontWeight: "700" },

  payLaterAlert: {
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
  payLaterAlertInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  payLaterAlertText: { color: "#92400E", fontWeight: "600", fontSize: 13, flex: 1 },

  calendarCard: { borderRadius: 24, marginBottom: 20, padding: 16 },

  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  monthNavBtn: { padding: 6 },
  monthTitle: { fontSize: 16, fontWeight: "700" },

  dayHeaders: { flexDirection: "row", marginBottom: 8 },
  dayHeader: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600" },

  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  dayCellSelected: { backgroundColor: "#0F766E" },
  dayCellToday: { borderWidth: 1.5, borderColor: "#0F766E" },
  dayText: { fontSize: 13, fontWeight: "500" },
  bookingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
  },

  legend: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12 },

  sectionLabel: { fontSize: 16, fontWeight: "700", marginBottom: 12 },

  emptyCard: { borderRadius: 16, padding: 20, alignItems: "center" },
  emptyText: { fontSize: 14 },

  bookingList: { gap: 10 },
  bookingCard: { borderRadius: 18 },
  bookingCardInner: { flexDirection: "row", overflow: "hidden", borderRadius: 18 },
  bookingAccent: { width: 5, borderRadius: 999 },
  bookingInfo: { flex: 1, padding: 14 },
  bookingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 8,
  },
  bookingTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  bookingMeta: { fontSize: 12, marginBottom: 2 },
  bookingPrice: { fontSize: 13, fontWeight: "700", marginTop: 4 },
});
