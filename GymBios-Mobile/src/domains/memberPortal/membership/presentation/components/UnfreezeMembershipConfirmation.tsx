import { Alert, Modal, Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

interface UnfreezeMembershipConfirmationProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function UnfreezeMembershipConfirmation({
  visible,
  onClose,
  onConfirm,
  isLoading,
}: UnfreezeMembershipConfirmationProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Unfreeze Membership</Text>
            </View>
            <Pressable hitSlop={12} onPress={onClose} style={styles.closeButton} disabled={isLoading}>
              <Feather name="x" size={20} color={BrandColors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.body}>
            <View style={styles.infoBox}>
              <Feather name="info" size={24} color={BrandColors.teal} />
              <Text style={styles.infoText}>
                Your membership is currently frozen. By unfreezing, your membership will become active immediately, and your expiry date will be extended by the number of days your account was frozen.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable 
              style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]} 
              onPress={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Unfreeze</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: BrandColors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: TypographyScale.title,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  closeButton: {
    padding: 6,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.screenBackground,
  },
  body: {
    padding: Spacing.four,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0FDFA',
    padding: Spacing.four,
    borderRadius: Radius.md,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  infoText: {
    flex: 1,
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    padding: Spacing.four,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  confirmButton: {
    backgroundColor: BrandColors.teal,
    paddingVertical: Spacing.four,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
