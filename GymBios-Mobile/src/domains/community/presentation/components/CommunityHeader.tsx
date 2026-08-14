import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';

import { BrandColors, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components';

export function CommunityHeader() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={[BrandColors.teal, BrandColors.tealDark]}
      style={styles.gradient}
    >
      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.iconWrap}>
          <Feather name="users" size={18} color="#fff" />
        </View>

        <View style={styles.titleContainer}>
          <Typography variant="bodySmallBold" style={styles.title}>
            Community
          </Typography>

          <Typography variant="caption" style={styles.subtitle}>
            Connect · Share · Inspire
          </Typography>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.md,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },

  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  titleContainer: {
    flex: 1,
  },

  title: {
    color: '#fff',
    fontSize: 16,
  },

  subtitle: {
    color: 'rgba(255,255,255,0.75)',
  },
});