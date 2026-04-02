import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../components/GlassCard";
import { GlassScreen } from "../components/GlassScreen";
import { useSettings } from "../context/SettingsContext";

const sessionTypes = [
  { id: "class", label: "Group Class", icon: "people", color: "#2563EB" },
  { id: "pt", label: "Personal Training", icon: "person", color: "#7C3AED" },
  { id: "stream", label: "Training Stream", icon: "play", color: "#059669" },
];

const timeSlots = ["6:00 AM", "7:30 AM", "5:00 PM", "6:30 PM", "8:00 PM"];

export function BookSession() {
  const { colors } = useSettings();
  const [selectedType, setSelectedType] = useState("class");
  const [selectedTime, setSelectedTime] = useState("6:30 PM");

  return (
    <GlassScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.heroShell} intensity={35}>
          <LinearGradient
            colors={["#2563EB", "#38BDF8", "#7DD3FC"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroTitle}>Book a Session</Text>
            <Text style={styles.heroSubtitle}>Reserve your next workout in seconds.</Text>
          </LinearGradient>
        </GlassCard>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose a session type</Text>
        <View style={styles.rowWrap}>
          {sessionTypes.map((item) => (
            <TouchableOpacity key={item.id} style={styles.gridItem} onPress={() => setSelectedType(item.id)}>
              <GlassCard
                style={[
                  styles.typeCard,
                  selectedType === item.id && { borderColor: item.color },
                ]}
              >
                <View style={styles.typeCardInner}>
                  <View style={[styles.typeIcon, { backgroundColor: item.color }]}>
                    <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color="#fff" />
                  </View>
                  <Text style={[styles.typeLabel, { color: colors.text }]}>{item.label}</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Pick a time</Text>
        <View style={styles.rowWrap}>
          {timeSlots.map((slot) => (
            <TouchableOpacity
              key={slot}
              style={[
                styles.timeChip,
                {
                  backgroundColor: selectedTime === slot ? "#2563EB" : colors.glassStrong,
                  borderColor: selectedTime === slot ? "#2563EB" : colors.border,
                },
              ]}
              onPress={() => setSelectedTime(slot)}
            >
              <Text style={selectedTime === slot ? styles.timeChipTextActive : [styles.timeChipText, { color: colors.text }]}>
                {slot}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <GlassCard style={styles.summaryCard}>
          <View style={styles.summaryCardInner}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Session</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>Group Class</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Coach</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>Coach Mike</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Time</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedTime}</Text>
            </View>
          </View>
        </GlassCard>

        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Confirm Booking</Text>
        </TouchableOpacity>
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
    color: "#E0F2FE",
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  gridItem: {
    width: "48%",
  },
  typeCard: {
    borderRadius: 22,
  },
  typeCardInner: {
    padding: 16,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  timeChipText: {
    fontWeight: "600",
  },
  timeChipTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  summaryCard: {
    borderRadius: 24,
    marginBottom: 20,
  },
  summaryCardInner: {
    padding: 18,
  },
  summaryTitle: {
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
