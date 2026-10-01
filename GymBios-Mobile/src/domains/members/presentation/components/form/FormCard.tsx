import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface FormCardProps {
  icon: ComponentProps<typeof Feather>['name'];
  title: string;
  description?: string;
  /** Rendered at the right of the header row (e.g. an "Edit" link). */
  action?: ReactNode;
  children?: ReactNode;
}

/** A titled white card grouping related fields within a member form step. */
export function FormCard({ icon, title, description, action, children }: FormCardProps) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.iconTile}>
          <Feather name={icon} size={16} color={BrandColors.teal} />
        </View>
        <View style={styles.headerText}>
          <Typography variant="body" style={styles.title}>
            {title}
          </Typography>
          {description ? (
            <Typography variant="caption" color="textSecondary">
              {description}
            </Typography>
          ) : null}
        </View>
        {action}
      </View>
      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

/** Field label with a red asterisk, for the shared Input which has no `required` prop. */
export function RequiredLabel({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <>
      {children}
      <Text style={{ color: theme.error }}> *</Text>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.white,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(50,127,116,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
  },
  content: {
    marginTop: Spacing.three,
    gap: Spacing.md,
  },
});
