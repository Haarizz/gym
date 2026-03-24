import React from "react";
import { ImageBackground, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSettings } from "../context/SettingsContext";

type GlassScreenProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const GYM_BG_URL =
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80";

export function GlassScreen({ children, style }: GlassScreenProps) {
  const { colors } = useSettings();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      <ImageBackground source={{ uri: GYM_BG_URL }} style={StyleSheet.absoluteFill} resizeMode="cover">
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: colors.isDark ? "rgba(6, 10, 9, 0.62)" : "rgba(240, 246, 244, 0.72)",
            },
          ]}
        />
      </ImageBackground>
      <LinearGradient
        colors={[
          colors.isDark ? "#08110F" : "#F6FBFA",
          colors.isDark ? "#0E1816" : "#E8F2EF",
          colors.background,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.blob, styles.blobOne, { backgroundColor: colors.blobOne }]} />
      <View style={[styles.blob, styles.blobTwo, { backgroundColor: colors.blobTwo }]} />
      <View style={[styles.blob, styles.blobThree, { backgroundColor: colors.blobOne }]} />
      <LinearGradient
        colors={[
          "rgba(0,0,0,0)",
          colors.isDark ? "rgba(0,0,0,0.25)" : "rgba(15, 23, 42, 0.08)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.8,
  },
  blobOne: {
    width: 240,
    height: 240,
    top: -80,
    right: -70,
  },
  blobTwo: {
    width: 220,
    height: 220,
    top: 300,
    left: -90,
  },
  blobThree: {
    width: 200,
    height: 200,
    bottom: -50,
    right: -50,
  },
});
