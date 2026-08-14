import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors } from '@/core/theme';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
}

export function StarRating({ rating, onRatingChange, size = 'md', readonly = false }: StarRatingProps) {
  const getIconSize = () => {
    switch (size) {
      case 'sm': return 16;
      case 'md': return 24;
      case 'lg': return 32;
    }
  };

  const iconSize = getIconSize();

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          disabled={readonly}
          onPress={() => !readonly && onRatingChange?.(star)}
          style={({ pressed }) => [
            styles.star,
            !readonly && pressed && { opacity: 0.7 },
          ]}
        >
          <Feather
            name="star"
            size={iconSize}
            color={star <= (rating || 0) ? BrandColors.memberGold : '#E5E7EB'}
            style={star <= (rating || 0) ? styles.filled : styles.empty}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
  },
  star: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  filled: {
    // Fill color for SVG not supported directly via Feather, but we mimic with text color. 
    // Usually FontAwesome has a solid star, but Feather doesn't. 
    // We'll just rely on the color prop.
  },
  empty: {
  },
});
