import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandColors, Spacing } from "@/core/theme";
import Feather from "@expo/vector-icons/Feather";

export function HrPayrollAnalyticsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Feather name="bar-chart-2" size={48} color={BrandColors.textSecondary} />
        <Text style={styles.title}>HR & Payroll Analytics</Text>
        <Text style={styles.subtitle}>This analytics dashboard is currently under construction.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: BrandColors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: BrandColors.textSecondary,
    textAlign: "center",
  },
});
