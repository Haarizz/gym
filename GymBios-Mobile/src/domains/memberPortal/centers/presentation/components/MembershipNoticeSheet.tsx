import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Text } from '@/shared/components/AppText';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

interface MembershipNoticeSheetProps {
  visible: boolean;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  /** Busy state for the primary action (e.g. switching gym). */
  primaryBusy?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onClose: () => void;
}

/**
 * A short bottom sheet about the member's memberships before (or instead of) a purchase:
 * "you're already a member here" or "this adds another gym".
 */
export function MembershipNoticeSheet({
  visible,
  icon,
  title,
  body,
  primaryLabel,
  onPrimary,
  primaryBusy,
  secondaryLabel,
  onSecondary,
  onClose,
}: MembershipNoticeSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityRole="none">
        <Pressable style={styles.sheet} onPress={() => {}} accessibilityRole="none">
          <View style={styles.body}>
            <View style={styles.icon}>
              <Feather name={icon} size={28} color={BrandColors.memberGold} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.text}>{body}</Text>
          </View>

          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              onPress={onPrimary}
              disabled={primaryBusy}
              accessibilityRole="button"
              accessibilityState={{ busy: !!primaryBusy }}
            >
              {primaryBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryText}>{primaryLabel}</Text>
              )}
            </Pressable>
            {!!secondaryLabel && (
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                onPress={onSecondary ?? onClose}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryText}>{secondaryLabel}</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
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
  body: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.screenBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  title: {
    fontSize: TypographyScale.title,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    textAlign: 'center',
  },
  text: {
    fontSize: 14,
    color: BrandColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: Spacing.four,
    gap: Spacing.two,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  pressed: {
    opacity: 0.85,
  },
  primaryButton: {
    backgroundColor: BrandColors.memberGold,
    paddingVertical: Spacing.four,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  primaryText: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryButton: {
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: TypographyScale.body,
    fontWeight: '700',
    color: BrandColors.textSecondary,
  },
});
