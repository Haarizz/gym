import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../components/GlassCard";
import { GlassScreen } from "../components/GlassScreen";
import { useSettings } from "../context/SettingsContext";

const plans = [
  { id: "basic", label: "Basic", price: "$29 / mo" },
  { id: "premium", label: "Premium", price: "$49 / mo" },
  { id: "vip", label: "VIP", price: "$79 / mo" },
];

export function MembershipRenewal() {
  const { colors } = useSettings();

  return (
    <GlassScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.heroShell} intensity={35}>
          <LinearGradient
            colors={["#0F172A", "#6366F1", "#818CF8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroTitle}>Membership Renewal</Text>
            <Text style={styles.heroSubtitle}>Your plan is active until Nov 30, 2026.</Text>
          </LinearGradient>
        </GlassCard>

        <GlassCard style={styles.statusCard}>
          <View style={styles.statusCardInner}>
            <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Current Plan</Text>
            <Text style={[styles.statusValue, { color: colors.text }]}>Premium - AED 199 / month</Text>
            <Text style={styles.statusMeta}>Auto-renew enabled</Text>
          </View>
        </GlassCard>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Upgrade Options</Text>
        <View style={styles.planList}>
          {plans.map((plan) => (
            <GlassCard key={plan.id} style={styles.planCard}>
              <View style={styles.planCardInner}>
                <Text style={[styles.planLabel, { color: colors.text }]}>{plan.label}</Text>
                <Text style={[styles.planPrice, { color: colors.textMuted }]}>{plan.price}</Text>
                <TouchableOpacity style={[styles.planButton, { backgroundColor: colors.glass }]}>
                  <Text style={styles.planButtonText}>Choose Plan</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Renew Membership</Text>
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
    color: "#E0E7FF",
    marginTop: 6,
  },
  statusCard: {
    borderRadius: 24,
    marginBottom: 20,
  },
  statusCardInner: {
    padding: 18,
  },
  statusLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
  },
  statusMeta: {
    marginTop: 4,
    color: "#10B981",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  planList: {
    gap: 12,
    marginBottom: 20,
  },
  planCard: {
    borderRadius: 24,
  },
  planCardInner: {
    padding: 18,
  },
  planLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  planPrice: {
    marginTop: 6,
    marginBottom: 10,
  },
  planButton: {
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: "center",
  },
  planButtonText: {
    color: "#4338CA",
    fontWeight: "700",
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
