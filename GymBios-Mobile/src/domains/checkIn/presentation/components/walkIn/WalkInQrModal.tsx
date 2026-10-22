import { ActivityIndicator, Modal, Pressable, Share, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { QrCode } from '@/shared/components/QrCode';
import { Typography } from '@/shared/components/Typography';
import { useMyWalkInLink } from '../../hooks/useWalkInSelfRegistrations';

interface WalkInQrModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * The signed-in user's walk-in QR. Visitors scan it to sign themselves up; for staff
 * it carries a personal code, so those sign-ups count toward their walk-in target.
 */
export function WalkInQrModal({ visible, onClose }: WalkInQrModalProps) {
  const { t } = useTranslation();
  const { data: link, isLoading, isError } = useMyWalkInLink(visible);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <Typography variant="subtitle" style={styles.title}>{t('checkIn.walkIn.qrTitle')}</Typography>

              {isLoading ? (
                <ActivityIndicator color={BrandColors.teal} style={styles.loader} />
              ) : isError || !link ? (
                <Typography variant="bodySmall" color="textSecondary" style={styles.center}>
                  {t('checkIn.walkIn.qrLoadError')}
                </Typography>
              ) : !link.enabled ? (
                <Typography variant="bodySmall" color="textSecondary" style={styles.center}>
                  {t('checkIn.walkIn.qrDisabled', { branch: link.branchName ?? '' })}
                </Typography>
              ) : (
                <>
                  <Typography variant="bodySmall" color="textSecondary" style={styles.center}>
                    {link.staffName
                      ? t('checkIn.walkIn.qrPersonalSubtitle')
                      : t('checkIn.walkIn.qrBranchSubtitle')}
                  </Typography>
                  <View style={styles.qr}>
                    <QrCode value={link.url} size={220} />
                  </View>
                  {link.branchName ? (
                    <Typography variant="bodySmallBold" style={styles.center}>{link.branchName}</Typography>
                  ) : null}
                  <Button
                    label={t('checkIn.walkIn.qrShare')}
                    variant="outline"
                    onPress={() => Share.share({ message: link.url })}
                  />
                </>
              )}

              <Pressable onPress={onClose} style={styles.close} accessibilityRole="button">
                <Typography variant="bodySmallBold" style={styles.closeText}>{t('checkIn.walkIn.qrClose')}</Typography>
              </Pressable>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
    alignItems: 'stretch',
  },
  title: {
    textAlign: 'center',
  },
  center: {
    textAlign: 'center',
  },
  loader: {
    marginVertical: Spacing.six,
  },
  qr: {
    alignSelf: 'center',
    padding: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#ffffff',
  },
  close: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  closeText: {
    color: BrandColors.textSecondary,
  },
});
