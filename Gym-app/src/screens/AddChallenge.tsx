import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSettings } from "../context/SettingsContext";

const templates = [
  "30-Day Push-up Challenge",
  "5K Running Goal",
  "Mindful Movement",
];

export function AddChallenge() {
  const { colors } = useSettings();
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={["#F97316", "#F59E0B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroTitle}>Create a Challenge</Text>
        <Text style={styles.heroSubtitle}>Invite your community and stay accountable.</Text>
      </LinearGradient>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Templates</Text>
      <View style={styles.templateRow}>
        {templates.map((template) => (
          <TouchableOpacity
            key={template}
            style={[styles.templateChip, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setTitle(template)}
          >
            <Text style={[styles.templateText, { color: colors.text }]}>{template}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Challenge Details</Text>
      <View style={[styles.inputCard, { backgroundColor: colors.card }]}
      >
        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Challenge Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ex: 30-Day Core Strength"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
        />
        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Goal</Text>
        <TextInput
          value={goal}
          onChangeText={setGoal}
          placeholder="Ex: 500 push-ups"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
        />
        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Duration</Text>
        <View style={styles.durationRow}>
          {Array.from({ length: 3 }).map((_, index) => {
            const day = ["14 Days", "30 Days", "60 Days"][index];
            return (
              <View key={day} style={[styles.durationChip, { backgroundColor: colors.input }]}
              >
                <Text style={[styles.durationText, { color: colors.text }]}>{day}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Create Challenge</Text>
      </TouchableOpacity>
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
    color: "#FEF3C7",
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  templateRow: {
    gap: 10,
    marginBottom: 20,
  },
  templateChip: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  templateText: {
    fontWeight: "600",
  },
  inputCard: {
    padding: 16,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  durationRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  durationText: {
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
