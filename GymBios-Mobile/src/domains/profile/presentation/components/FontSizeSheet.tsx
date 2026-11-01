import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { FONT_SIZES, useFontSizeStore, type FontSizeKey } from '@/core/theme/fontSizeStore';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Typography } from '@/shared/components/Typography';

const SAMPLE_FONT_SIZE = 16;

export const FONT_SIZE_LABEL_KEYS = {
  small: 'settings.fontSizeSmall',
  default: 'settings.fontSizeDefault',
  large: 'settings.fontSizeLarge',
  xlarge: 'settings.fontSizeExtraLarge',
} as const satisfies Record<FontSizeKey, string>;

interface FontSizeSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function FontSizeSheet({ visible, onClose }: FontSizeSheetProps) {
  const { t } = useTranslation();
  const fontSize = useFontSizeStore((s) => s.fontSize);
  const setFontSize = useFontSizeStore((s) => s.setFontSize);

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title={t('settings.fontSizeSheetTitle')}
      subtitle={t('settings.fontSizeSheetSubtitle')}
    >
      {/* Rendered with the live setting, so it previews the choice as it's tapped. */}
      <View style={styles.preview}>
        <Typography variant="body">{t('settings.fontSizePreview')}</Typography>
      </View>

      <View accessibilityRole="radiogroup">
        {FONT_SIZES.map((size) => {
          const isSelected = size.key === fontSize;
          return (
            <Pressable
              key={size.key}
              onPress={() => setFontSize(size.key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              style={({ pressed }) => [
                styles.option,
                isSelected && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
            >
              <View style={styles.sampleBox}>
                {/* Fixed size: each sample shows its own step regardless of the current one. */}
                <Typography
                  allowFontScaling={false}
                  style={[styles.sample, { fontSize: SAMPLE_FONT_SIZE * size.scale }]}
                >
                  Aa
                </Typography>
              </View>
              <Typography variant="body" style={[styles.label, isSelected && styles.labelSelected]}>
                {t(FONT_SIZE_LABEL_KEYS[size.key])}
              </Typography>
              {isSelected && <Feather name="check" size={18} color={BrandColors.teal} />}
            </Pressable>
          );
        })}
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  preview: {
    padding: Spacing.three,
    marginBottom: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.screenBackgroundAlt,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
  },
  optionSelected: {
    backgroundColor: 'rgba(50,127,116,0.08)',
  },
  optionPressed: {
    backgroundColor: '#f1f5f9',
  },
  sampleBox: {
    width: 40,
    alignItems: 'center',
    marginEnd: Spacing.three,
  },
  sample: {
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  labelSelected: {
    color: BrandColors.teal,
  },
});
