import React from 'react';
import { Modal, View, StyleSheet, Pressable, Alert } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { Button } from '@/shared/components/Button';

interface ReferralQrCodeModalProps {
  visible: boolean;
  onClose: () => void;
  link: string | null;
  onCopyLink: (link: string) => void;
}

export function ReferralQrCodeModal({
  visible,
  onClose,
  link,
  onCopyLink,
}: ReferralQrCodeModalProps) {
  if (!link) return null;

  const fullLink = link.startsWith('http') ? link : `https://${link}`;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Typography variant="title" style={styles.title}>
              Referral QR Code
            </Typography>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={BrandColors.textPrimary} />
            </Pressable>
          </View>

          <Typography variant="bodySmall" color="textSecondary" style={styles.subtitle}>
            Scan to open the referral link
          </Typography>

          <View style={styles.qrContainer}>
            <View style={styles.qrPlaceholder}>
              <Feather name="code" size={120} color={BrandColors.teal} />
            </View>
          </View>

          <Typography variant="caption" color="textSecondary" style={styles.linkText} numberOfLines={2}>
            {fullLink}
          </Typography>

          <Button
            title="Copy Link"
            variant="outline"
            onPress={() => onCopyLink(fullLink)}
            style={styles.copyBtn}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    marginBottom: Spacing.three,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: '#f8fafc',
    borderRadius: Radius.md,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  qrPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    textAlign: 'center',
    fontSize: 11,
    marginBottom: Spacing.three,
  },
  copyBtn: {
    width: '100%',
  },
});
