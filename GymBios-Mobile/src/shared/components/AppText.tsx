import type { ComponentPropsWithRef } from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import { Fonts } from '@/core/theme';
import { MAX_COMBINED_FONT_SCALE, useFontScale } from '@/core/theme/fontSizeStore';

/**
 * Scales the explicit fontSize/lineHeight by the in-app font size setting. Text
 * without its own fontSize is left alone so nested Text keeps inheriting its
 * (already scaled) parent size instead of being scaled twice.
 */
function scaledFontStyle(style: StyleProp<TextStyle>, scale: number): TextStyle | null {
  const { fontSize, lineHeight } = StyleSheet.flatten(style) ?? {};
  const scaled: TextStyle = {};
  if (typeof fontSize === 'number') scaled.fontSize = fontSize * scale;
  if (typeof lineHeight === 'number') scaled.lineHeight = lineHeight * scale;
  return scaled.fontSize == null && scaled.lineHeight == null ? null : scaled;
}

/**
 * Applies the in-app font size. Text that opts out of device scaling
 * (`allowFontScaling={false}`, e.g. glyphs sized to match an icon) stays fixed too.
 */
function useFontScaling(
  style: StyleProp<TextStyle>,
  allowFontScaling: boolean | undefined,
  maxFontSizeMultiplier: number | null | undefined,
) {
  const scale = useFontScale();
  if (scale === 1 || allowFontScaling === false) {
    return { scaledStyle: null, maxFontSizeMultiplier };
  }
  return {
    scaledStyle: scaledFontStyle(style, scale),
    // Device text size multiplies on top of ours; cap the combined size.
    maxFontSizeMultiplier: maxFontSizeMultiplier ?? Math.max(1, MAX_COMBINED_FONT_SCALE / scale),
  };
}

/**
 * Drop-in replacements for React Native's Text/TextInput that apply the app font
 * and the in-app font size. The font comes first in the style array, so an explicit
 * `fontFamily` (monospace, currency glyphs) still overrides it. Import these
 * instead of the react-native ones.
 */
export function Text({ style, allowFontScaling, maxFontSizeMultiplier, ...rest }: ComponentPropsWithRef<typeof RNText>) {
  const scaling = useFontScaling(style, allowFontScaling, maxFontSizeMultiplier);
  return (
    <RNText
      style={[styles.font, style, scaling.scaledStyle]}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={scaling.maxFontSizeMultiplier}
      {...rest}
    />
  );
}

export function TextInput({ style, allowFontScaling, maxFontSizeMultiplier, ...rest }: ComponentPropsWithRef<typeof RNTextInput>) {
  const scaling = useFontScaling(style, allowFontScaling, maxFontSizeMultiplier);
  return (
    <RNTextInput
      style={[styles.font, style, scaling.scaledStyle]}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={scaling.maxFontSizeMultiplier}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  font: {
    fontFamily: Fonts.sans,
  },
});
