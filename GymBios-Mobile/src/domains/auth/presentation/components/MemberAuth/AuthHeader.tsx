import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Polyline, G, Path, Circle } from 'react-native-svg';

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
          <Svg viewBox="0 0 1430 1431" width={32} height={32}>
            <Circle cx="714.5" cy="715" r="708.75" fill="#FFFFFF" />
            <G transform="translate(0,1431) scale(0.1,-0.1)" fill="#3C7269">
              <Path d="M5460 10486 c-232 -45 -356 -115 -561 -313 -64 -62 -122 -113 -129 -113 -7 0 -65 51 -129 113 -104 102 -123 116 -180 135 -127 43 -283 18 -366 -59 -131 -121 -167 -295 -94 -450 24 -50 54 -86 135 -165 57 -56 104 -106 104 -113 0 -6 -45 -58 -101 -114 -176 -178 -260 -311 -301 -473 -18 -74 -22 -117 -22 -249 0 -144 3 -169 27 -246 36 -119 66 -184 125 -271 71 -105 139 -176 237 -248 47 -34 85 -64 85 -66 0 -3 -11 -21 -24 -42 -35 -55 -68 -123 -77 -157 -43 -160 -49 -196 -50 -320 -2 -113 2 -143 25 -227 94 -344 304 -564 649 -680 250 -84 602 -25 812 136 84 65 217 191 498 474 159 160 296 292 303 292 7 0 216 -203 465 -450 l452 -450 -66 -68 c-36 -37 -202 -204 -369 -372 -166 -168 -315 -321 -329 -340 -44 -58 -105 -189 -138 -295 -60 -191 -54 -342 27 -630 8 -30 89 -164 130 -215 123 -156 240 -245 398 -305 270 -102 551 -88 804 40 l55 28 37 -44 c20 -24 61 -73 90 -109 76 -92 156 -152 283 -215 334 -166 707 -132 998 92 34 26 108 92 164 146 l103 99 112 -109 c63 -60 133 -119 159 -131 150 -73 310 -43 423 79 74 80 99 146 100 264 0 123 -23 167 -160 305 -57 58 -104 110 -104 116 0 6 50 64 111 130 141 151 232 283 261 379 60 198 72 363 39 518 -23 111 -58 200 -119 304 -54 92 -124 168 -239 260 -51 41 -93 78 -93 83 0 5 13 30 30 56 33 53 84 207 101 308 7 41 10 122 7 200 -5 121 -8 139 -46 245 -56 156 -117 254 -232 370 -139 141 -307 229 -505 267 -190 35 -435 0 -592 -86 -129 -71 -222 -153 -568 -499 -181 -182 -337 -331 -345 -331 -8 0 -217 200 -464 444 l-448 444 20 29 c11 15 100 107 198 203 332 325 540 544 577 609 244 415 172 908 -178 1220 -129 116 -267 183 -452 221 -195 40 -399 12 -586 -81 -43 -21 -85 -39 -92 -39 -8 0 -22 11 -32 25 -42 59 -143 182 -169 206 -98 90 -283 187 -418 220 -102 25 -279 32 -366 15z" />
            </G>
          </Svg>
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
