import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { formatDate } from '@/core/i18n';
import { Typography } from '@/shared/components/Typography';
import type { PendingWalkInRegistration } from '../../../infrastructure/WalkInApi';

interface PendingSelfRegistrationsProps {
  pending: PendingWalkInRegistration[];
  selectedId?: number;
  onSelect: (registration: PendingWalkInRegistration) => void;
  onDismiss: (registration: PendingWalkInRegistration) => void;
}

/** Visitors who signed up with the walk-in QR; tapping one loads them into the form to take payment. */
export function PendingSelfRegistrations({ pending, selectedId, onSelect, onDismiss }: PendingSelfRegistrationsProps) {
  const { t } = useTranslation();
  if (pending.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Feather name="clock" size={14} color="#b45309" />
        <Typography variant="bodySmallBold" style={styles.title}>
          {t('checkIn.walkIn.pendingTitle', { count: pending.length })}
        </Typography>
      </View>
      <Typography variant="caption" color="textSecondary">
        {t('checkIn.walkIn.pendingSubtitle')}
      </Typography>

      {pending.map((r) => {
        const details = [r.phone, r.planName, r.referredByStaffName && t('checkIn.walkIn.pendingVia', { name: r.referredByStaffName })]
          .filter(Boolean)
          .join(' · ');
        return (
          <Pressable
            key={r.id}
            onPress={() => onSelect(r)}
            style={({ pressed }) => [styles.row, r.id === selectedId && styles.rowSelected, pressed && styles.rowPressed]}
            accessibilityRole="button"
            accessibilityLabel={t('checkIn.walkIn.pendingTakePaymentA11y', { name: r.name })}
          >
            <View style={styles.rowInfo}>
              <Typography variant="body" style={styles.name} numberOfLines={1}>{r.name}</Typography>
              <Typography variant="caption" color="textSecondary" numberOfLines={1}>{details}</Typography>
              <Typography variant="caption" color="textSecondary">{formatDate(r.createdAt, 'p')}</Typography>
            </View>
            <Pressable
              onPress={() => onDismiss(r)}
              hitSlop={8}
              style={styles.dismiss}
              accessibilityRole="button"
              accessibilityLabel={t('checkIn.walkIn.pendingDismissA11y', { name: r.name })}
            >
              <Feather name="x" size={16} color={BrandColors.textSecondary} />
            </Pressable>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  title: {
    color: '#92400e',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#ffffff',
  },
  rowSelected: {
    borderColor: BrandColors.teal,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontWeight: '600',
  },
  dismiss: {
    padding: Spacing.one,
  },
});
