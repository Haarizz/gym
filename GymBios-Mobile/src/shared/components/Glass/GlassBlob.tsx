import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

export interface GlassBlobProps {
  color: string;
  size?: number;
  opacity?: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}

// Decorative colour wash standing in for the reference file's blurred
// `.blob` elements — a two-stop radial-ish gradient fading to transparent,
// since there's no cross-platform CSS-blur equivalent without a new native
// dependency. Sits behind glass surfaces so their translucent fill has
// colour to read against.
export function GlassBlob({ color, size = 220, opacity = 0.45, top, left, right, bottom }: GlassBlobProps) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
          top,
          left,
          right,
          bottom,
        },
      ]}
    >
      <LinearGradient
        colors={[color, color, `${color}00`]}
        locations={[0, 0.45, 1]}
        start={{ x: 0.2, y: 0.15 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    overflow: 'hidden',
  },
});
