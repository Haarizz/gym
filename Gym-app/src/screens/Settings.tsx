import React, { useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { GlassCard } from "../components/GlassCard";
import { GlassScreen } from "../components/GlassScreen";
import { useSettings } from "../context/SettingsContext";

export function Settings() {
  const { settings, colors, saveSettings } = useSettings();
  const [draft, setDraft] = useState(settings);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  const handleSave = async () => {
    await saveSettings(draft);
  };

  return (
    <GlassScreen>
      <Animated.ScrollView
        style={[styles.container, { opacity: fadeAnim }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Notifications</Text>
        <GlassCard style={styles.groupCard}>
          <View style={styles.groupInner}>
            <SettingRow
              label="Push Notifications"
              value={draft.notifications}
              onChange={(value) => setDraft({ ...draft, notifications: value })}
            />
            <SettingRow
              label="Class Reminders"
              value={draft.classReminders}
              onChange={(value) => setDraft({ ...draft, classReminders: value })}
              withDivider
            />
            <SettingRow
              label="Email Updates"
              value={draft.emailUpdates}
              onChange={(value) => setDraft({ ...draft, emailUpdates: value })}
              withDivider
            />
          </View>
        </GlassCard>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>App Preferences</Text>
        <GlassCard style={styles.groupCard}>
          <View style={styles.groupInner}>
            <SettingRow
              label="Sound Effects"
              value={draft.sound}
              onChange={(value) => setDraft({ ...draft, sound: value })}
            />
            <SettingRow
              label="Dark Mode"
              value={draft.darkMode}
              onChange={(value) => setDraft({ ...draft, darkMode: value })}
              withDivider
            />
          </View>
        </GlassCard>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Privacy</Text>
        <GlassCard style={styles.groupCard}>
          <View style={styles.groupInner}>
            <SettingRow
              label="Private Profile"
              value={draft.privateProfile}
              onChange={(value) => setDraft({ ...draft, privateProfile: value })}
            />
          </View>
        </GlassCard>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: dirty ? "#111827" : "#94A3B8" }]}
          onPress={handleSave}
          disabled={!dirty}
        >
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    </GlassScreen>
  );
}

function SettingRow({
  label,
  value,
  onChange,
  withDivider,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  withDivider?: boolean;
}) {
  const { colors } = useSettings();

  return (
    <View style={[styles.row, withDivider && { borderTopWidth: 1, borderTopColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
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
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  groupCard: {
    borderRadius: 24,
    marginBottom: 14,
  },
  groupInner: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  label: {
    fontWeight: "600",
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 14,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
