import React, { useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../components/GlassCard";
import { GlassScreen } from "../components/GlassScreen";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";

export function Account() {
  const { colors } = useSettings();
  const { user, logout } = useAuth();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [name, setName] = useState(user?.username ?? "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("Training for strength and consistency.");

  const handleLogout = () => setLogoutModalVisible(true);

  return (
    <GlassScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.heroShell} intensity={35}>
          <LinearGradient
            colors={["#111827", "#4338CA", "#60A5FA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroTitle}>Account</Text>
            <Text style={styles.heroSubtitle}>Manage your profile and personal details.</Text>
          </LinearGradient>
        </GlassCard>

        <GlassCard style={styles.profileCard}>
          <View style={styles.profileCardInner}>
            <View style={styles.profileRow}>
              <Image source={{ uri: "https://i.pravatar.cc/120?img=12" }} style={styles.avatar} />
              <View>
                <Text style={[styles.profileName, { color: colors.text }]}>{name || user?.username}</Text>
                <Text style={[styles.profileMeta, { color: colors.textMuted }]}>
                  {user?.roles?.includes("STAFF") ? "Staff" : "Member"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => {}}
            >
              <Ionicons name="camera" size={16} color="#fff" />
              <Text style={styles.photoButtonText}>Change Photo</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        <GlassCard style={styles.formCard}>
          <View style={styles.formCardInner}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Full Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
            />

            <Text style={[styles.label, { color: colors.textMuted }]}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
            />

            <Text style={[styles.label, { color: colors.textMuted }]}>Phone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
            />

            <Text style={[styles.label, { color: colors.textMuted }]}>About You</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              style={[
                styles.input,
                styles.textArea,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.input },
              ]}
              multiline
            />
          </View>
        </GlassCard>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => {}}
        >
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Logout confirmation modal */}
      <Modal transparent animationType="fade" visible={logoutModalVisible} onRequestClose={() => setLogoutModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="log-out-outline" size={28} color="#EF4444" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Sign Out</Text>
            <Text style={[styles.modalMessage, { color: colors.textMuted }]}>Are you sure you want to sign out of GymBios?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: colors.border }]} onPress={() => setLogoutModalVisible(false)}>
                <Text style={[styles.modalBtnCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnConfirm]} onPress={() => { setLogoutModalVisible(false); logout(); }}>
                <Text style={styles.modalBtnConfirmText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  profileCard: {
    borderRadius: 24,
    marginBottom: 20,
  },
  profileCardInner: {
    padding: 18,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
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
    borderRadius: 24,
  },
  formCardInner: {
    padding: 18,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 12,
  },
  logoutButtonText: {
    color: "#EF4444",
    fontWeight: "700",
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 32 },
  modalBox: { width: "100%", borderRadius: 24, padding: 28, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 10 },
  modalIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(239,68,68,0.1)", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  modalMessage: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  modalButtons: { flexDirection: "row", gap: 12, width: "100%" },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: "center" },
  modalBtnCancel: { borderWidth: 1 },
  modalBtnCancelText: { fontWeight: "600", fontSize: 15 },
  modalBtnConfirm: { backgroundColor: "#EF4444" },
  modalBtnConfirmText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
