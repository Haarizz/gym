import { Trans, useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useCommunityTheme } from '../../hooks/useCommunityTheme';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';

import { useCommunityNavInset } from './CommunityBottomNav';

interface CommunityFabProps {
  onPress: () => void;
}

/**
 * Floating action button for creating a new community post.
 * Positioned above the Community bottom navigation bar.
 */
export function CommunityFab({ onPress }: CommunityFabProps) {
  const { t } = useTranslation();
  const { primaryColor, headerColors } = useCommunityTheme();
  const bottomOffset = useCommunityNavInset() + 12;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { bottom: bottomOffset },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('community.createPostA11y')}
    >
      <LinearGradient
        colors={headerColors as unknown as readonly [string, string, ...string[]]}
        style={[styles.fab, { shadowColor: '#000' }]}
      >
        <Feather name="plus" size={26} color="#fff" />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    end: 20,
    zIndex: 100,
  },

  fab: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',

    // Android
    elevation: 8,

    // iOS
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.95 }],
  },
});
