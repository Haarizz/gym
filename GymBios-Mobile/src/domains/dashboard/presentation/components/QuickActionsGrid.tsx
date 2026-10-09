import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale, heroTint } from '@/core/theme';
import { GlassSurface } from '@/shared/components';

export interface QuickAction {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  /** Icon-circle fill; the tile gets a faint wash of the same colour. */
  color: string;
  /** Label colour — a darker shade of `color` so it stays legible on glass. */
  textColor: string;
  onPress: () => void;
}

interface QuickActionsGridProps {
  actions: QuickAction[];
  title?: string;
}

// Shared Quick Actions card for every role's dashboard. Explicit 2-column rows
// with flex: 1 cells (not percentage widths + gap, which overflow and wrap
// unevenly on narrow screens or large font scales), and the icon sits above
// the label so long labels never squeeze into a broken wrap.
export function QuickActionsGrid({ actions, title = 'Quick Actions' }: QuickActionsGridProps) {
  const rows: QuickAction[][] = [];
  for (let i = 0; i < actions.length; i += 2) rows.push(actions.slice(i, i + 2));

  return (
    <GlassSurface radius={18} style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((action) => (
              <Pressable
                key={action.label}
                style={({ pressed }) => [
                  styles.tile,
                  { backgroundColor: heroTint(action.color, 0.12) },
                  pressed && styles.pressed,
                ]}
                onPress={action.onPress}
                accessibilityRole="button"
                accessibilityLabel={action.label}
              >
                <View style={[styles.iconCircle, { backgroundColor: action.color }]}>
                  <Feather name={action.icon} size={18} color="#FFFFFF" />
                </View>
                <Text
                  style={[styles.label, { color: action.textColor }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
            {/* Keep a lone last tile at half width, aligned with the column above. */}
            {row.length === 1 && <View style={styles.spacer} />}
          </View>
        ))}
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
  },
  title: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.three,
    letterSpacing: -0.2,
  },
  grid: {
    gap: Spacing.two + 2,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
  },
  tile: {
    flex: 1,
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.lg,
  },
  spacer: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
});
