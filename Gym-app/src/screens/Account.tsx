import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSettings } from "../context/SettingsContext";

export function Account() {
  const { colors } = useSettings();
  const [name, setName] = useState("Sarah Johnson");
  const [email, setEmail] = useState("sarah@gymbios.com");
  const [phone, setPhone] = useState("+971 50 123 4567");
  const [bio, setBio] = useState("Training for strength and consistency.");

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={["#111827", "#4338CA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroTitle}>Account</Text>
        <Text style={styles.heroSubtitle}>Manage your profile and personal details.</Text>
      </LinearGradient>

      <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
        <View style={styles.profileRow}>
          <Image
            source={{ uri: "https://i.pravatar.cc/120?img=12" }}
            style={styles.avatar}
          />
          <View>
            <Text style={[styles.profileName, { color: colors.text }]}>{name}</Text>
            <Text style={[styles.profileMeta, { color: colors.textMuted }]}>Premium Member</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.photoButton}
          onPress={() => Alert.alert("Change photo", "Photo update coming soon.")}
        >
          <Ionicons name="camera" size={16} color="#fff" />
          <Text style={styles.photoButtonText}>Change Photo</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.formCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Full Name</Text>
        <TextInput value={name} onChangeText={setName} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} />

        <Text style={[styles.label, { color: colors.textMuted }]}>Email</Text>
        <TextInput value={email} onChangeText={setEmail} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} />

        <Text style={[styles.label, { color: colors.textMuted }]}>Phone</Text>
        <TextInput value={phone} onChangeText={setPhone} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]} />

        <Text style={[styles.label, { color: colors.textMuted }]}>About You</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
          multiline
        />
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={() => Alert.alert("Saved", "Your profile has been updated.")}
      >
        <Text style={styles.saveButtonText}>Save Changes</Text>
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
    color: "#E0E7FF",
    marginTop: 6,
  },
  profileCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
  },
  profileMeta: {
    marginTop: 2,
  },
  photoButton: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  photoButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  formCard: {
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: "#4F46E5",
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
