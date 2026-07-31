import { ScrollView, StyleSheet, Pressable, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

const STATUS_OPTIONS = ['All', 'Active', 'Inactive', 'Draft', 'Archived'] as const;
export type StatusFilter = typeof STATUS_OPTIONS[number];

interface MembershipPlanFilterProps {
  selected: StatusFilter;
  onSelect: (filter: StatusFilter) => void;
}

export function MembershipPlanFilter({ selected, onSelect }: MembershipPlanFilterProps) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {STATUS_OPTIONS.map((option) => {
        const isActive = option === selected;
        return (
          <Pressable
            key={option}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? theme.primary : theme.backgroundElement,
                borderColor: isActive ? theme.primary : theme.border,
              },
            ]}
            onPress={() => onSelect(option)}
          >
            <Typography
              variant="caption"
              style={[
                styles.chipText,
                { color: isActive ? BrandColors.white : theme.textSecondary },
              ]}
            >
              {option}
            </Typography>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontWeight: '600',
    fontSize: 12,
  },
});
