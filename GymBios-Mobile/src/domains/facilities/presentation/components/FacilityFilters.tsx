import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { BrandColors, Spacing, Radius } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

export type FacilityStatusFilter = 'All' | 'Active' | 'Inactive';

interface FacilityFiltersProps {
  status: FacilityStatusFilter;
  onChangeStatus: (status: FacilityStatusFilter) => void;
}

export function FacilityFilters({ status, onChangeStatus }: FacilityFiltersProps) {
  const statuses: FacilityStatusFilter[] = ['All', 'Active', 'Inactive'];

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      contentContainerStyle={styles.container}
    >
      {statuses.map((s) => {
        const isActive = s === status;
        return (
          <TouchableOpacity
            key={s}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => onChangeStatus(s)}
          >
            <Typography 
              variant="bodySmallBold" 
              color={isActive ? 'primary' : 'textSecondary'}
              style={isActive ? styles.textActive : undefined}
            >
              {s}
            </Typography>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  pill: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillActive: {
    backgroundColor: '#e6f7f4',
    borderColor: BrandColors.teal,
  },
  textActive: {
    color: BrandColors.teal,
  },
});
