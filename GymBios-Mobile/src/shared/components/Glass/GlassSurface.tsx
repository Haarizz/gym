import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { Glass, Radius } from '@/core/theme';

export interface GlassSurfaceProps extends ViewProps {
  /** Colour(s) washed in under the frost, e.g. a role's brand colour(s). */
  tint?: string | readonly [string, string, ...string[]];
  /** Higher-opacity fill for panels that need to stay legible (e.g. the auth sheet). */
  strong?: boolean;
  radius?: number;
  /** Override the glass style. @default 'regular' */
  glassStyle?: 'regular' | 'clear' | 'none';
  /** Draw the light outline + top-edge highlight. Disable for edge-to-edge bars. @default true */
  bordered?: boolean;
  /** Cast the soft drop shadow. Disable for edge-to-edge bars (e.g. the app header),
   *  where it paints a grey band onto the content below. @default true */
  elevated?: boolean;
}

const glassAvailable = isLiquidGlassAvailable();

export function GlassSurface({
  tint,
  strong = false,
  radius = Radius.xl,
  glassStyle = 'regular',
  bordered = true,
  elevated = true,
  style,
  children,
  ...rest
}: GlassSurfaceProps) {
  const tintColors = tint
    ? (Array.isArray(tint) ? tint : [tint, tint]) as readonly [string, string, ...string[]]
    : null;

  // When a tint colour is provided, use a very light white sheen (12%) so the
  // tint reads through. When no tint (neutral panels), use the standard fill.
  const fillOpacity = tintColors ? 'rgba(255,255,255,0.12)' : (strong ? Glass.fillStrong : Glass.fill);

  if (glassAvailable) {
    return (
      <GlassView
        glassEffectStyle={glassStyle}
        colorScheme="light"
        style={[styles.glassContainer, { borderRadius: radius }, !bordered && styles.borderless, !elevated && styles.flat, style]}
        {...rest}
      >
        {tintColors && (
          <LinearGradient
            colors={tintColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
          />
        )}
        {/* Fill overlay */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius,
              backgroundColor: fillOpacity,
            },
          ]}
        />
        {/* Top-edge highlight (inner glow) */}
        {bordered && (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              styles.highlight,
              { borderRadius: radius },
            ]}
          />
        )}
        {children}
      </GlassView>
    );
  }

  // Fallback for when native glass isn't available (older Android / web)
  return (
    <View style={[styles.fallbackContainer, { borderRadius: radius }, !bordered && styles.borderless, !elevated && styles.flat, style]} {...rest}>
      {tintColors && (
        <LinearGradient
          colors={tintColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
      )}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            backgroundColor: fillOpacity,
          },
        ]}
      />
      {bordered && (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.highlight, { borderRadius: radius }]}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glassContainer: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Glass.border,
    shadowColor: Glass.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 6,
  },
  fallbackContainer: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Glass.border,
    // Android's `elevation` shadow shows through the translucent fill as a grey
    // inner rectangle; `boxShadow` only paints outside the border box.
    ...Platform.select({
      android: { boxShadow: `0px 8px 24px 0px ${Glass.shadowColor}` },
      default: {
        shadowColor: Glass.shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 24,
      },
    }),
  },
  borderless: {
    borderWidth: 0,
  },
  flat: {
    boxShadow: [],
    shadowOpacity: 0,
    elevation: 0,
  },
  highlight: {
    borderTopWidth: 1,
    borderTopColor: 'transparent',
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderColor: 'transparent',
  },
});
