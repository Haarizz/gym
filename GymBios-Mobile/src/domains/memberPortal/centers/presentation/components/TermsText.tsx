import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import { Text } from '@/shared/components/AppText';
import { BrandColors } from '@/core/theme';

type TermsBlock = { kind: 'heading' | 'paragraph'; text: string };

/**
 * Splits plain-text terms into blocks: blank lines separate paragraphs, and a
 * short single line in ALL CAPS (e.g. "AGREEMENT TO TERMS") is a heading.
 * Mirrors the web Settings › Terms & Conditions preview.
 */
function parseTerms(terms: string): TermsBlock[] {
  return terms
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((text) => {
      const isHeading =
        !text.includes('\n') && text.length <= 80 && /\p{L}/u.test(text) && text === text.toUpperCase();
      return { kind: isHeading ? 'heading' : 'paragraph', text };
    });
}

/** Branch terms rendered with headings and justified paragraphs. */
export function TermsText({ terms, style }: { terms: string; style?: StyleProp<TextStyle> }) {
  const blocks = parseTerms(terms);
  return (
    <View style={styles.container}>
      {blocks.map((block, i) =>
        block.kind === 'heading' ? (
          <Text key={i} style={styles.heading} accessibilityRole="header">
            {block.text}
          </Text>
        ) : (
          <Text key={i} style={[styles.paragraph, style]}>
            {block.text}
          </Text>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  heading: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: BrandColors.textPrimary,
    marginTop: 4,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
    color: '#3E4A5B',
    textAlign: 'justify',
  },
});
