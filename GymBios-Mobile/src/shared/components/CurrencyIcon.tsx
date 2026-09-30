import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { getCurrencyDefinition, useCurrencyStore } from '@/core/providers';
import { CURRENCY_FONT_FAMILY } from '@/core/providers/currencyDefinitions';

interface CurrencyIconProps {
  size: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Money icon that shows the gym's display currency (web Settings page) instead
 * of a fixed "$" — the Dirham sign for AED. Sized and coloured like a Feather icon.
 */
export function CurrencyIcon({ size, color, style }: CurrencyIconProps) {
  const code = useCurrencyStore((s) => s.currencyCode);
  const fontLoaded = useCurrencyStore((s) => s.glyphFontLoaded);
  const def = getCurrencyDefinition(code);
  const useFontGlyph = !!def.fontGlyph && fontLoaded;
  const text = useFontGlyph ? def.fontGlyph! : def.textPrefix.trim();

  // The Dirham glyph is ~0.72em tall, a single Unicode symbol ~0.7em, and a
  // multi-letter fallback ("AED", "SAR") has to shrink to fit the icon box.
  const fontSize = useFontGlyph ? size * 1.05 : text.length > 1 ? size * 0.45 : size * 0.95;

  return (
    <View style={[{ width: size, height: size }, styles.box, style]} accessibilityLabel={def.code}>
      <Text
        allowFontScaling={false}
        style={[
          styles.text,
          { fontSize, lineHeight: size, color },
          useFontGlyph ? styles.fontGlyph : styles.textGlyph,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

type FeatherIconProps = ComponentProps<typeof Feather>;

/**
 * Drop-in for <Feather> where the icon name comes from data: 'dollar-sign'
 * (used across the app to mean "money") renders the configured currency symbol.
 */
export function FeatherIcon({ name, size = 24, color = '#000', style, ...rest }: FeatherIconProps) {
  if (name === 'dollar-sign') {
    return <CurrencyIcon size={size} color={String(color)} style={style as StyleProp<ViewStyle>} />;
  }
  return <Feather name={name} size={size} color={color} style={style} {...rest} />;
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  fontGlyph: {
    fontFamily: CURRENCY_FONT_FAMILY,
    fontWeight: 'normal',
  },
  textGlyph: {
    fontWeight: '700',
  },
});
