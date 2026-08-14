import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle, type StyleProp } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';

interface HubActionButtonProps {
  title: string;
  iconName?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function HubActionButton({ title, iconName, onPress, style }: HubActionButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        style,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      {iconName && (
        <View style={styles.iconContainer}>
          <Feather name={iconName} size={16} color={BrandColors.teal} />
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.surface,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(50, 127, 116, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
});
