import { StyleSheet } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';

export const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  backdropDismissArea: {
    ...StyleSheet.absoluteFill,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.four,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 24,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  iconBadgeDanger: {
    backgroundColor: '#fee2e2',
  },
  iconBadgeWarning: {
    backgroundColor: '#fef3c7',
  },
  iconBadgePrimary: {
    backgroundColor: '#eef7f6',
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: BrandColors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonPressed: {
    backgroundColor: '#e2e8f0',
    transform: [{ scale: 0.98 }],
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  confirmButtonDanger: {
    backgroundColor: '#ef4444',
  },
  confirmButtonWarning: {
    backgroundColor: '#f59e0b',
  },
  confirmButtonPrimary: {
    backgroundColor: BrandColors.teal,
  },
  confirmButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
