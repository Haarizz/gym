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
interface AvatarProps {
  initials?: string;
  imageUrl?: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
}

const DEFAULT_SIZE = 40;
const DEFAULT_INITIALS = '?';

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  imageUrl,
  size = DEFAULT_SIZE,
  backgroundColor = BrandColors.teal,
  textColor = BrandColors.white,
}) => {
  const dimensionStyle: ImageStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, dimensionStyle]}
        accessibilityRole="image"
        accessibilityLabel={initials ? `${initials} avatar` : 'User avatar'}
      />
    );
  }

  // Scale font relative to avatar size so initials stay proportional
  // at any requested size.
  const fontSize = Math.round(size * 0.4);
  const displayInitials = (initials?.trim() || DEFAULT_INITIALS)
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      style={[styles.container, dimensionStyle, { backgroundColor }]}
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