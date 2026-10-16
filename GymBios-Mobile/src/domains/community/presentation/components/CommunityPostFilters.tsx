import { Trans, useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useCommunityTheme } from '../../hooks/useCommunityTheme';
import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components';

const POST_TYPES = [
  { value: undefined, labelKey: 'all' },
  { value: 'achievement', labelKey: 'achievements' },
  { value: 'question', labelKey: 'questions' },
  { value: 'tip', labelKey: 'tips' },
] as const;

interface CommunityPostFiltersProps {
  selectedType: string | undefined;
  onSelectType: (type: string | undefined) => void;
}

export function CommunityPostFilters({ selectedType, onSelectType }: CommunityPostFiltersProps) {
  const { t } = useTranslation();
  const { primaryColor, headerColors } = useCommunityTheme();
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      // ScrollView defaults to flexShrink: 1, so without this the feed list below
      // squeezes the pill row (clipping the labels) as its content grows.
      style={{ flexGrow: 0, flexShrink: 0 }}
    >
      {POST_TYPES.map((pt) => {
        const isSelected = selectedType === pt.value;

        return (
          <Pressable
            key={pt.labelKey}
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
            accessibilityLabel={t('community.filterBy', { type: t(`community.types.${pt.labelKey}`) })}
            hitSlop={4}
          >
            <Typography
              variant="caption"
              style={[
                styles.pillLabel,
                { color: isSelected ? '#fff' : '#7A7E8C' },
              ]}
            >
              {t(`community.types.${pt.labelKey}`)}
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
    paddingBottom: 4,
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
