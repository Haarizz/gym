import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface DetailCardProps {
  title?: string;
  icon?: keyof typeof Feather.glyphMap;
  /** Trailing header content, e.g. a status pill. */
  right?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Card shell shared by the member detail sections, styled after the staff detail cards. */
export function DetailCard({ title, icon, right, children, style }: DetailCardProps) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, style]}>
      {title ? (
        <View style={styles.titleRow}>
          {icon ? (
            <View style={styles.iconChip}>
              <Feather name={icon} size={14} color={BrandColors.teal} />
            </View>
          ) : null}
          <Typography variant="bodySmallBold" style={styles.title}>
            {title}
          </Typography>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

interface DetailFieldProps {
  label: string;
  value?: ReactNode;
  full?: boolean;
}

/** Caption + value cell for the two-column grid inside a DetailCard. */
export function DetailField({ label, value, full }: DetailFieldProps) {
  const isEmpty = value === undefined || value === null || value === '';
  return (
    <View style={full ? styles.fieldFull : styles.field}>
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
      {isEmpty ? (
        <Typography variant="bodySmall" color="textSecondary">—</Typography>
      ) : typeof value === 'string' || typeof value === 'number' ? (
        <Typography variant="bodySmallBold">{value}</Typography>
      ) : (
        value
      )}
    </View>
  );
}

export function DetailGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    padding: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.md,
  },
  iconChip: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(50,127,116,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.md,
    columnGap: '4%',
  },
  field: {
    width: '48%',
    gap: Spacing.half,
  },
  fieldFull: {
    width: '100%',
    gap: Spacing.half,
  },
});
