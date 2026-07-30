import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Spacing, Radius, BrandColors } from '../../core/theme';

/**
 * Generic container component that provides the app's standard
 * "card" surface: white background, rounded corners, subtle shadow
 * and consistent padding.
 *
 * Contains no business logic — purely presentational and reusable
 * across any domain in the app.
 */
interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,

    // Subtle shadow (iOS)
    shadowColor: BrandColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,

    // Subtle shadow (Android)
    elevation: 3,
  },
});

export default Card;