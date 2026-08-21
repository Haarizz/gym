import React, { useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { BrandColors } from '../../core/theme';
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
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

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
          .filter(Boolean)
          .map((n) => n[0])
          .join('')
      : DEFAULT_INITIALS);

  const fontSize = Math.round(numericSize * 0.4);
  const displayInitials = (computedInitials?.trim() || DEFAULT_INITIALS)
    .slice(0, 2)
    .toUpperCase();

  const isImageValid = Boolean(imageUrl && imageUrl.trim().length > 0 && failedUrl !== imageUrl);

  if (isImageValid && imageUrl) {
    return (
      <View style={[styles.container, dimensionStyle, { backgroundColor }, style]}>
        <Image
          source={{ uri: imageUrl }}
          style={[styles.image, dimensionStyle]}
          onError={() => setFailedUrl(imageUrl)}
          accessibilityRole="image"
          accessibilityLabel={computedInitials ? `${computedInitials} avatar` : 'User avatar'}
        />
      </View>
    );
  }

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