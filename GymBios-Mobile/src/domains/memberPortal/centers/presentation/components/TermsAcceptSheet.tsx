import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Spacing, TypographyScale } from '@/core/theme';
import { SheetShell } from './PlanDetailSheet';
import { TermsText } from './TermsText';

interface TermsAcceptSheetProps {
  visible: boolean;
  /** The branch's terms & policies, as entered in web Settings › Terms & Conditions. */
  terms: string;
  centerName?: string;
  onClose: () => void;
  /** Called once the member has ticked the agreement and tapped continue. */
  onAccept: () => void;
}

/** Shows the branch terms before a purchase; continuing requires ticking the agreement. */
export function TermsAcceptSheet({ visible, terms, centerName, onClose, onAccept }: TermsAcceptSheetProps) {
  const { t } = useTranslation();
  const [agreed, setAgreed] = useState(false);

  // Every purchase attempt asks again, so the tick is cleared whenever the sheet is left.
  const handleClose = () => {
    setAgreed(false);
    onClose();
  };
  const handleAccept = () => {
    setAgreed(false);
    onAccept();
  };

  return (
    <SheetShell
      visible={visible}
      title={t('centers.detail.termsSheetTitle')}
      subtitle={centerName || undefined}
      onClose={handleClose}
      footer={
        <View style={styles.footer}>
          <Pressable
            onPress={() => setAgreed((v) => !v)}
            style={styles.agreeRow}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
              {agreed && <Feather name="check" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.agreeText}>{t('centers.detail.termsAgree')}</Text>
          </Pressable>

          <Pressable
            onPress={handleAccept}
            disabled={!agreed}
            style={({ pressed }) => [styles.ctaWrapper, !agreed && styles.ctaDisabled, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityState={{ disabled: !agreed }}
          >
            <LinearGradient
              colors={[BrandColors.memberGold, BrandColors.trainerAmber]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaText}>{t('centers.detail.termsContinue')}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      }
    >
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Feather name="shield" size={16} color={BrandColors.teal} />
          <Text style={styles.cardTitle}>{t('centers.detail.terms')}</Text>
        </View>
        <TermsText terms={terms} />
      </View>
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: 20,
    padding: Spacing.four,
    marginBottom: Spacing.two,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  footer: {
    gap: 12,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#B8BFCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
  agreeText: {
    flex: 1,
    fontSize: 14,
    color: BrandColors.textPrimary,
  },
  ctaWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
});
