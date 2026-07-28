import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface StatCardProps {
  label: string;
  value: string;
  iconName: keyof typeof Feather.glyphMap;
  color: string;
}

export function StatCard({ label, value, iconName, color }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.icon, { backgroundColor: color }]}>
        <Feather name={iconName} size={20} color="#ffffff" />
      </View>
      <Typography variant="subtitle" style={styles.value}>
        {value}
      </Typography>
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
    </View>
  );
}

export function PlaceholderPanel({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.panel}>
      <Typography variant="subtitle">{title}</Typography>
      <Typography variant="bodySmall" color="textSecondary" style={styles.panelDescription}>
        {description}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: Spacing.half,
  },
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  panelDescription: {
    lineHeight: 20,
  },
});
