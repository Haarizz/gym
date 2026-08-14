import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/shared/components/Card';
import { Typography } from '@/shared/components/Typography';
import { BrandColors, Spacing, Radius } from '@/core/theme';

interface WorkoutFeedbackHubItemProps {
  title: string;
  description?: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
}

export function WorkoutFeedbackHubItem({
  title,
  description,
  icon,
  onPress,
}: WorkoutFeedbackHubItemProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
      <Card style={styles.card}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Feather name={icon} size={24} color={BrandColors.teal} />
          </View>
          <View style={styles.textContainer}>
            <Typography variant="subtitle">
              {title}
            </Typography>
            {description && (
              <Typography variant="body" color="textSecondary" style={styles.description}>
                {description}
              </Typography>
            )}
          </View>
          <View style={styles.actionContainer}>
            <Text style={styles.actionText}>Open</Text>
            <Feather name="chevron-right" size={20} color={BrandColors.teal} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginBottom: Spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  card: {
    padding: Spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.screenBackgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  description: {
    marginTop: 2,
    fontSize: 13,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    color: BrandColors.teal,
    fontWeight: '600',
    marginRight: 4,
  },
});
