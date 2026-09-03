import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { Svg, Polyline } from 'react-native-svg';

import { Typography } from '@/shared/components';

export function AuthHeader() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 26 }]}>
      <LinearGradient
        colors={['#16815F', '#0E6653', '#0A3F34']}
        style={StyleSheet.absoluteFill as any}
      />
      <View style={styles.pulseWrap}>
        <Svg viewBox="0 0 360 34" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
          <Polyline
            points="0,17 60,17 78,4 92,30 108,17 360,17"
            fill="none"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <View style={styles.brand}>
        <View style={styles.brandMark}>
          <View style={styles.mark}>
            <Feather name="activity" size={18} color="white" />
          </View>
          <Typography style={styles.brandName}>GymBios</Typography>
        </View>
        <Typography style={styles.brandTag}>
          Track workouts, book classes, own your progress.
        </Typography>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    padding: 26,
    paddingBottom: 66,
    zIndex: 1,
  },
  pulseWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 34,
    height: 34,
  },
  brand: {
    position: 'relative',
    zIndex: 2,
    marginTop: 14,
  },
  brandMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  brandTag: {
    marginTop: 8,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '500',
  },
});
