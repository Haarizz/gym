import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSettings } from "../context/SettingsContext";

const filters = ["All", "Yoga", "HIIT", "Strength", "Mindfulness"];

const classes = [
  {
    id: "1",
    title: "Power Yoga",
    time: "6:30 AM · Studio A",
    coach: "Emma Wilson",
    spots: "6 spots left",
  },
  {
    id: "2",
    title: "HIIT Burn",
    time: "7:15 AM · Studio B",
    coach: "Mike Chen",
    spots: "2 spots left",
  },
  {
    id: "3",
    title: "Strength Lab",
    time: "6:00 PM · Arena",
    coach: "Lisa Park",
    spots: "12 spots left",
  },
];

export function JoinClass() {
  const { colors } = useSettings();
  const [activeFilter, setActiveFilter] = useState("All");

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={["#0F766E", "#22D3EE"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroTitle}>Join a Class</Text>
        <Text style={styles.heroSubtitle}>Find a session and reserve your spot.</Text>
      </LinearGradient>

      <View style={styles.filterRow}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            onPress={() => setActiveFilter(filter)}
            style={[
              styles.filterChip,
              { backgroundColor: colors.card, borderColor: colors.border },
              activeFilter === filter && styles.filterChipActive,
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

      <View style={styles.cardList}>
        {classes.map((item) => (
          <View key={item.id} style={[styles.classCard, { backgroundColor: colors.card }]}
          >
            <View style={styles.classHeader}>
              <Text style={[styles.classTitle, { color: colors.text }]}>{item.title}</Text>
              <View style={styles.spotsBadge}>
                <Text style={styles.spotsText}>{item.spots}</Text>
              </View>
            </View>
            <Text style={[styles.classMeta, { color: colors.textMuted }]}>{item.time}</Text>
            <View style={styles.classCoachRow}>
              <Ionicons name="person" size={16} color={colors.textMuted} />
              <Text style={[styles.classCoachText, { color: colors.textMuted }]}>{item.coach}</Text>
            </View>
            <TouchableOpacity style={styles.joinButton}>
              <Text style={styles.joinButtonText}>Join Class</Text>
            </TouchableOpacity>
          </View>
        ))}
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
    color: "#CCFBF1",
    marginTop: 6,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E",
  },
  filterText: {
    fontWeight: "600",
  },
  filterTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  cardList: {
    gap: 12,
  },
  classCard: {
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  classHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  classTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  spotsBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  spotsText: {
    color: "#0284C7",
    fontWeight: "600",
    fontSize: 12,
  },
  classMeta: {
    marginBottom: 10,
  },
  classCoachRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  classCoachText: {
    color: "#6B7280",
  },
  joinButton: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  joinButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
