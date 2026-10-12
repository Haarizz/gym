import type { ComponentPropsWithRef } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';

import { Fonts } from '@/core/theme';

/**
 * Drop-in replacements for React Native's Text/TextInput that apply the app font.
 * The font comes first in the style array, so an explicit `fontFamily` (monospace,
 * currency glyphs) still overrides it. Import these instead of the react-native ones.
 */
export function Text({ style, ...rest }: ComponentPropsWithRef<typeof RNText>) {
  return <RNText style={[styles.font, style]} {...rest} />;
}

export function TextInput({ style, ...rest }: ComponentPropsWithRef<typeof RNTextInput>) {
  return <RNTextInput style={[styles.font, style]} {...rest} />;
}

const styles = StyleSheet.create({
  font: {
    fontFamily: Fonts.sans,
  },
});
