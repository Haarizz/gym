import React from 'react';
import { View, Image, Text, StyleSheet, ImageStyle } from 'react-native';
import { BrandColors } from '../../core/theme';

/**
 * Generic, reusable avatar component.
 *
 * - Renders an Image when `imageUrl` is provided.
 * - Falls back to a circular badge with `initials` otherwise.
 * - Fully configurable size/colors with sensible defaults so it
 *   can be dropped in anywhere in the app without extra styling.
 */
import type { ViewStyle, StyleProp } from 'react-native';

interface AvatarProps {
  initials?: string;
  name?: string;
  imageUrl?: string;
  size?: number | 'sm' | 'md' | 'lg';
  backgroundColor?: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_SIZE = 40;
const DEFAULT_INITIALS = '?';

const getNumericSize = (size?: number | 'sm' | 'md' | 'lg'): number => {
  if (typeof size === 'number') return size;
  if (size === 'sm') return 32;
  if (size === 'md') return 40;
  if (size === 'lg') return 48;
  return DEFAULT_SIZE;
};

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  name,
  imageUrl,
  size = DEFAULT_SIZE,
  backgroundColor = BrandColors.teal,
  textColor = BrandColors.white,
  style,
}) => {
  const numericSize = getNumericSize(size);
  const dimensionStyle = {
    width: numericSize,
    height: numericSize,
    borderRadius: numericSize / 2,
  };

  const computedInitials =
    initials ||
    (name
      ? name
          .split(' ')
          .map((n) => n[0])
          .join('')
      : DEFAULT_INITIALS);

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, dimensionStyle, style as ImageStyle]}
        accessibilityRole="image"
        accessibilityLabel={computedInitials ? `${computedInitials} avatar` : 'User avatar'}
      />
    );
  }

  const fontSize = Math.round(numericSize * 0.4);
  const displayInitials = (computedInitials?.trim() || DEFAULT_INITIALS)
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      style={[styles.container, dimensionStyle, { backgroundColor }, style]}
      accessibilityRole="text"
      accessibilityLabel={`${displayInitials} avatar`}
    >
      <Text style={[styles.initials, { color: textColor, fontSize }]} numberOfLines={1}>
        {displayInitials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  initials: {
    fontWeight: '600',
  },
});

export default Avatar;