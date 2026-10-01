import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { Tone } from '../utils/memberDisplay';

interface TonePillProps {
  tone: Tone;
}

/** Tinted status pill, matching the badge on the staff cards. */
export function TonePill({ tone }: TonePillProps) {
  return (
    <View
      style={[styles.pill, { backgroundColor: `${tone.color}1A`, borderColor: `${tone.color}40` }]}
    >
      <Typography variant="caption" style={[styles.label, { color: tone.color }]}>
        {tone.label.toUpperCase()}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
});
