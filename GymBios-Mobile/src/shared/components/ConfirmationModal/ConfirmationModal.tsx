import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors } from '@/core/theme';

import { styles } from './ConfirmationModal.styles';
import type { ConfirmationModalProps } from './ConfirmationModal.types';

export function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  icon,
  loading = false,
  onConfirm,
  onClose,
  children,
}: ConfirmationModalProps) {
  if (!visible) {
    return null;
  }

  const defaultIconName =
    variant === 'danger'
      ? 'log-out'
      : variant === 'warning'
        ? 'alert-triangle'
        : 'help-circle';

  const iconName = (icon || defaultIconName) as keyof typeof Feather.glyphMap;

  const iconColor =
    variant === 'danger'
      ? '#ef4444'
      : variant === 'warning'
        ? '#f59e0b'
        : BrandColors.teal;

  const badgeStyle =
    variant === 'danger'
      ? styles.iconBadgeDanger
      : variant === 'warning'
        ? styles.iconBadgeWarning
        : styles.iconBadgePrimary;

  const confirmBtnStyle =
    variant === 'danger'
      ? styles.confirmButtonDanger
      : variant === 'warning'
        ? styles.confirmButtonWarning
        : styles.confirmButtonPrimary;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={loading ? undefined : onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropDismissArea}
          onPress={loading ? undefined : onClose}
          accessibilityLabel="Dismiss modal backdrop"
        />

        <View style={styles.dialogContainer}>
          {/* Icon Header Badge */}
          <View style={[styles.iconBadge, badgeStyle]}>
            <Feather name={iconName} size={28} color={iconColor} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Description / Message */}
          <Text style={styles.message}>{message}</Text>

          {children}

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
              onPress={onClose}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={cancelText}
            >
              <Text style={styles.cancelText}>{cancelText}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.confirmButton,
                confirmBtnStyle,
                pressed && styles.confirmButtonPressed,
                loading && styles.confirmButtonDisabled,
              ]}
              onPress={onConfirm}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={confirmText}
            >
              {loading && <ActivityIndicator size="small" color="#ffffff" />}
              <Text style={styles.confirmText}>{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

