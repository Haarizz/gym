import { StyleSheet, View, Pressable } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { Surface } from '@/shared/components/Surface';

interface CheckInHubCardProps {
  title: string;
  description: string;
  iconName: keyof typeof Feather.glyphMap;
  onPress: () => void;
}

export function CheckInHubCard({ title, description, iconName, onPress }: CheckInHubCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
      <Surface style={styles.card}>
        <View style={styles.iconContainer}>
          <Feather name={iconName} size={24} color={BrandColors.teal} />
        </View>
        <View style={styles.textContainer}>
          <Typography variant="subtitle" style={styles.title}>{title}</Typography>
          <Typography variant="bodySmall" color="textSecondary">{description}</Typography>
        </View>
        <Feather name="chevron-right" size={20} color={BrandColors.textSecondary} />
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginBottom: Spacing.three,
  },
  pressed: {
    opacity: 0.75,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: Radius.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: '#E6F0EA', // Light primary color background
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    marginBottom: Spacing.half,
  },
});
