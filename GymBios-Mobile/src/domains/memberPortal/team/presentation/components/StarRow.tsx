import { StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { STAR_OFF, STAR_ON } from '../../../ratings/RatingSheet';

/** Read-only five-star display, rounded to the nearest whole star. */
export function StarRow({ value, size = 14 }: { value: number | null; size?: number }) {
  const filled = Math.round(value ?? 0);
  return (
    <View style={styles.row} accessible={false} importantForAccessibility="no-hide-descendants">
      {[1, 2, 3, 4, 5].map(i => (
        <MaterialCommunityIcons key={i} name="star" size={size} color={i <= filled ? STAR_ON : STAR_OFF} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 1,
  },
});
