import { Pressable, StyleSheet, View } from 'react-native';
import { useCommunityTheme } from '../../hooks/useCommunityTheme';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Height of the CommunityBottomNav bar so the FAB sits above it.
const BOTTOM_NAV_HEIGHT = 74;

interface CommunityFabProps {
  onPress: () => void;
}

/**
 * Floating action button for creating a new community post.
 * Positioned above the Community bottom navigation bar.
 */
export function CommunityFab({ onPress }: CommunityFabProps) {
  const { primaryColor, headerColors } = useCommunityTheme();
  const insets = useSafeAreaInsets();
  const bottomOffset =
    BOTTOM_NAV_HEIGHT +
    (insets.bottom > 0 ? insets.bottom : Platform.OS === 'android' ? 8 : 12) +
    8;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { bottom: bottomOffset },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Create community post"
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
    right: 20,
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
