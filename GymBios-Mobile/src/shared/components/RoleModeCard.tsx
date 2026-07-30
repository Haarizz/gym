import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface RoleModeCardProps {
  title: string;
  description: string;
  accentColor: string;
  borderColor: string;
  iconName: keyof typeof Feather.glyphMap;
  onPress: () => void;
}

export function RoleModeCard({
  title,
  description,
  accentColor,
  borderColor,
  iconName,
  onPress,
}: RoleModeCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && { borderColor, borderWidth: 2 },
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: accentColor }]}>
        <Feather name={iconName} size={24} color="#ffffffff" />
      </View>
      <View style={styles.content}>
        <Typography variant="subtitle" style={styles.title}>
          {title}
        </Typography>
        <Typography variant="bodySmall" color="textSecondary" style={styles.description}>
          {description}
        </Typography>
      </View>
    </Pressable>
  );
}

export function ComingSoonCard() {
  return (
    <View style={styles.comingSoon}>
      <View style={styles.comingSoonIcon}>
        <Feather name="video" size={24} color="#6b7280" />
      </View>
      <View style={styles.content}>
        <View style={styles.comingSoonHeader}>
          <Typography variant="subtitle" style={styles.title}>
            Virtual Studio
          </Typography>
          <BadgeMuted label="Coming Soon" />
        </View>
        <Typography variant="bodySmall" color="textSecondary" style={styles.description}>
          Create and manage online fitness programs, live sessions, and digital memberships.
        </Typography>
      </View>
    </View>
  );
}

function BadgeMuted({ label }: { label: string }) {
  return (
    <View style={styles.badgeMuted}>
      <Typography variant="caption" style={styles.badgeMutedText}>
        {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    padding: Spacing.four,
    flexDirection: 'row',
    gap: Spacing.three,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    color: '#000000ff',
    marginBottom: Spacing.one,
  },
  description: {
    lineHeight: 20,
  },
  comingSoon: {
    backgroundColor: '#fafafa',
    borderRadius: Radius.xl,
    padding: Spacing.four,
    flexDirection: 'row',
    gap: Spacing.three,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    opacity: 0.8,
  },
  comingSoonIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  badgeMuted: {
    backgroundColor: '#e5e7eb',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  badgeMutedText: {
    color: '#4b5563',
    fontSize: 10,
  },
});
