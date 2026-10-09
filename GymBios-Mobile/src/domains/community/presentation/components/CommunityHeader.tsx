import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useCommunityTheme } from '../../hooks/useCommunityTheme';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';

import { Spacing } from '@/core/theme';
import { Typography } from '@/shared/components';
import { useCommunityMode } from '../../hooks/useCommunity';

interface CommunityHeaderProps {
  unreadCount: number;
  onNotificationsPress: () => void;
}

export function CommunityHeader({ unreadCount, onNotificationsPress }: CommunityHeaderProps) {
  const { headerColors, primaryColor } = useCommunityTheme();
  const router = useRouter();
  // The global Community is one community across every GymBios gym, not the selected gym's.
  const { mode } = useCommunityMode();
  const isGlobal = mode === 'global';

  return (
    <LinearGradient
      colors={headerColors as unknown as readonly [string, string, ...string[]]}
      style={styles.gradient}
    >
      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.heroAvatar}>
          <Typography variant="body" style={{ fontSize: 20 }}>👥</Typography>
        </View>

        <View style={styles.titleContainer}>
          <Typography variant="bodySmallBold" style={styles.title}>
            {isGlobal ? 'GymBios Community' : 'Community'}
          </Typography>

          <Typography variant="caption" style={styles.subtitle}>
            {isGlobal ? 'One community across GymBios gyms' : 'Connect · Share · Inspire'}
          </Typography>
        </View>

        <TouchableOpacity
          onPress={onNotificationsPress}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={
            unreadCount > 0 ? `Community notifications, ${unreadCount} unread` : 'Community notifications'
          }
        >
          <Feather name="bell" size={20} color="#fff" />
          {unreadCount > 0 && <View style={[styles.bellDot, { borderColor: primaryColor }]} />}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingTop: 54, // roughly 20 for content + 34 for safe area
    paddingHorizontal: 22,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  titleContainer: {
    flex: 1,
  },

  title: {
    color: '#1E2130', // using a dark color, wait, in HTML it uses accent-ink which is dark text. Previously it was '#fff'.
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 22,
  },

  subtitle: {
    color: 'rgba(30, 33, 48, 0.8)',
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 1,
  },

  bellDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#E24C6D',
    borderWidth: 1.5,
  },
});