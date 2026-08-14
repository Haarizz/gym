import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components';

const POST_TYPES = [
  { value: undefined, label: 'All' },
  { value: 'achievement', label: 'Achievements' },
  { value: 'question', label: 'Questions' },
  { value: 'tip', label: 'Tips' },
] as const;

interface CommunityPostFiltersProps {
  selectedType: string | undefined;
  onSelectType: (type: string | undefined) => void;
}

export function CommunityPostFilters({ selectedType, onSelectType }: CommunityPostFiltersProps) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={{ flexGrow: 0 }}
    >
      {POST_TYPES.map((pt) => {
        const isSelected = selectedType === pt.value;

        return (
          <Pressable
            key={pt.label}
            style={({ pressed }) => [
              styles.pill,
              isSelected
                ? { backgroundColor: BrandColors.teal }
                : { backgroundColor: theme.muted },
              pressed && styles.pillPressed,
            ]}
            onPress={() => onSelectType(pt.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={`Filter by ${pt.label}`}
            hitSlop={4}
          >
            <Typography
              variant="caption"
              style={[
                styles.pillLabel,
                { color: isSelected ? '#fff' : theme.text },
              ]}
            >
              {pt.label}
            </Typography>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },

  pill: {
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pillPressed: {
    opacity: 0.75,
  },

  pillLabel: {
    fontWeight: '600',
    fontSize: 12,
  },
});
