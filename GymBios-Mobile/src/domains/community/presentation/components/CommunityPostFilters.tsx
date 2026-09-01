import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useCommunityTheme } from '../../hooks/useCommunityTheme';
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
  const { primaryColor, headerColors } = useCommunityTheme();
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
                ? { backgroundColor: primaryColor, borderColor: primaryColor }
                : { backgroundColor: theme.backgroundElement },
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
                { color: isSelected ? '#fff' : '#7A7E8C' },
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
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },

  pill: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ECEBF2', // var(--line)
    backgroundColor: '#FFFFFF',
  },

  pillPressed: {
    opacity: 0.75,
  },

  pillLabel: {
    fontWeight: '600',
    fontSize: 13,
  },
});
