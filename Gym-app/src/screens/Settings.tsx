import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Switch, Text, View, TouchableOpacity } from "react-native";
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
    <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Notifications</Text>
      <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.label, { color: colors.text }]}>Push Notifications</Text>
        <Switch value={draft.notifications} onValueChange={(value) => setDraft({ ...draft, notifications: value })} />
      </View>
      <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.label, { color: colors.text }]}>Class Reminders</Text>
        <Switch value={draft.classReminders} onValueChange={(value) => setDraft({ ...draft, classReminders: value })} />
      </View>
      <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.label, { color: colors.text }]}>Email Updates</Text>
        <Switch value={draft.emailUpdates} onValueChange={(value) => setDraft({ ...draft, emailUpdates: value })} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>App Preferences</Text>
      <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.label, { color: colors.text }]}>Sound Effects</Text>
        <Switch value={draft.sound} onValueChange={(value) => setDraft({ ...draft, sound: value })} />
      </View>
      <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.label, { color: colors.text }]}>Dark Mode</Text>
        <Switch value={draft.darkMode} onValueChange={(value) => setDraft({ ...draft, darkMode: value })} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Privacy</Text>
      <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.label, { color: colors.text }]}>Private Profile</Text>
        <Switch value={draft.privateProfile} onValueChange={(value) => setDraft({ ...draft, privateProfile: value })} />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: dirty ? "#111827" : "#94A3B8" }]}
        onPress={handleSave}
        disabled={!dirty}
      >
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  row: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
  },
  label: {
    fontWeight: "600",
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
