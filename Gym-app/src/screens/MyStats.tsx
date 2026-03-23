import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={["#111827", "#4F46E5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroTitle}>My Stats</Text>
        <Text style={styles.heroSubtitle}>Track your progress and stay motivated.</Text>
      </LinearGradient>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}
        >
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sessions</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>18</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}
        >
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Calories</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>3,240</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}
        >
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Streak</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>12</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly Activity</Text>
      <View style={[styles.chartCard, { backgroundColor: colors.card }]}
      >
        <View style={styles.chartRow}>
          {weekly.map((item) => (
            <View key={item.day} style={styles.chartBarWrap}>
              <View style={[styles.chartBar, { height: item.value * 14 }]} />
              <Text style={[styles.chartLabel, { color: colors.textMuted }]}>{item.day}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Highlights</Text>
      <View style={[styles.highlightCard, { backgroundColor: colors.card }]}
      >
        <Text style={[styles.highlightTitle, { color: colors.textMuted }]}>Consistency Score</Text>
        <Text style={[styles.highlightValue, { color: colors.text }]}>86%</Text>
        <Text style={[styles.highlightMeta, { color: "#10B981" }]}>Up 12% from last month</Text>
      </View>
    </ScrollView>
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
  hero: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
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
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  chartCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
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
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
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
  },
});
