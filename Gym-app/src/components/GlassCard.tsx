import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSettings } from "../context/SettingsContext";

type GlassCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
};

export function GlassCard({ children, style, intensity = 45 }: GlassCardProps) {
  const { colors } = useSettings();
  const sheen = colors.isDark
    ? ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"]
    : ["rgba(255,255,255,0.38)", "rgba(255,255,255,0.08)"];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.glassStrong,
          borderColor: colors.isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.6)",
          shadowColor: colors.shadow,
        },
        style,
      ]}
    >
      <BlurView tint={colors.blurTint} intensity={intensity} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={sheen}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderRadius: 22,
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
    elevation: 6,
  },
  inner: {
    position: "relative",
  },
});
