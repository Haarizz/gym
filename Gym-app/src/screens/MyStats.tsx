import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../components/GlassCard";
import { GlassScreen } from "../components/GlassScreen";
import { useSettings } from "../context/SettingsContext";

const weekly = [
  { day: "Mon", value: 4 },
  { day: "Tue", value: 2 },
  { day: "Wed", value: 5 },
  { day: "Thu", value: 3 },
  { day: "Fri", value: 4 },
  { day: "Sat", value: 6 },
  { day: "Sun", value: 3 },
];

export function MyStats() {
  const { colors } = useSettings();

  return (
    <GlassScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.heroShell} intensity={35}>
          <LinearGradient
            colors={["#111827", "#4F46E5", "#60A5FA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroTitle}>My Stats</Text>
            <Text style={styles.heroSubtitle}>Track your progress and stay motivated.</Text>
          </LinearGradient>
        </GlassCard>

        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <View style={styles.statCardInner}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sessions</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>18</Text>
            </View>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <View style={styles.statCardInner}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Calories</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>3,240</Text>
            </View>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <View style={styles.statCardInner}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Streak</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>12</Text>
            </View>
          </GlassCard>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly Activity</Text>
        <GlassCard style={styles.chartCard}>
          <View style={styles.chartCardInner}>
            <View style={styles.chartRow}>
              {weekly.map((item) => (
                <View key={item.day} style={styles.chartBarWrap}>
                  <View style={[styles.chartBar, { height: item.value * 14 }]} />
                  <Text style={[styles.chartLabel, { color: colors.textMuted }]}>{item.day}</Text>
                </View>
              ))}
            </View>
          </View>
        </GlassCard>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Highlights</Text>
        <GlassCard style={styles.highlightCard}>
          <View style={styles.highlightCardInner}>
            <Text style={[styles.highlightTitle, { color: colors.textMuted }]}>Consistency Score</Text>
            <Text style={[styles.highlightValue, { color: colors.text }]}>86%</Text>
            <Text style={styles.highlightMeta}>Up 12% from last month</Text>
          </View>
        </GlassCard>
      </ScrollView>
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
  heroShell: {
    marginBottom: 20,
  },
  hero: {
    borderRadius: 24,
    padding: 20,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  heroSubtitle: {
    color: "#E0E7FF",
    marginTop: 6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 22,
  },
  statCardInner: {
    padding: 16,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  chartCard: {
    borderRadius: 24,
    marginBottom: 20,
  },
  chartCardInner: {
    padding: 18,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  chartBarWrap: {
    alignItems: "center",
    width: "12%",
  },
  chartBar: {
    width: 16,
    borderRadius: 8,
    backgroundColor: "#4F46E5",
    marginBottom: 6,
  },
  chartLabel: {
    fontSize: 11,
  },
  highlightCard: {
    borderRadius: 24,
  },
  highlightCardInner: {
    padding: 18,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  highlightValue: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 8,
  },
  highlightMeta: {
    marginTop: 4,
    fontWeight: "600",
    color: "#10B981",
  },
});
