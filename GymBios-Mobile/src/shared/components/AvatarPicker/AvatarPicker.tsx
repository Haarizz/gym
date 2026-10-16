import { useTranslation } from 'react-i18next';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Avatar } from '@/shared/components/Avatar';
import { Typography } from '@/shared/components/Typography';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';

import { usePhotoPicker } from './usePhotoPicker';

/** AppBottomSheet's close animation (220ms) plus time for the native Modal to dismiss. */
const SHEET_DISMISS_DELAY_MS = 400;

export interface AvatarPickerProps {
  photoUri?: string;
  photoUrl?: string;
  name: string;
  onChangePhoto: (uri?: string) => void;
  /**
   * 'compact' drops the "Tap to change photo" caption and shows a camera badge on a
   * teal-ringed avatar instead — used in the My Profile header card.
   */
  variant?: 'default' | 'compact';
}

export function AvatarPicker({
  photoUri,
  photoUrl,
  name,
  onChangePhoto,
  variant = 'default',
}: AvatarPickerProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);

  const currentImage = photoUri || photoUrl;

  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  const { takePhoto, chooseFromGallery } = usePhotoPicker();

  // Close the sheet first and launch the picker only once its Modal has gone:
  // iOS won't present the camera/gallery over a modal that is still dismissing,
  // which made these options silently do nothing on device.
  const closeSheetThen = useCallback(
    (pick: () => Promise<string | undefined>) => {
      setSheetVisible(false);
      setTimeout(async () => {
        const uri = await pick();
        if (uri) onChangePhoto(uri);
      }, SHEET_DISMISS_DELAY_MS);
    },
    [onChangePhoto],
  );

  const handleRemovePhoto = useCallback(() => {
    onChangePhoto(undefined);
  }, [onChangePhoto]);

  const handlePress = useCallback(() => {
    setSheetVisible(true);
  }, []);

  return (
    <View style={variant === 'compact' ? undefined : styles.container}>
      {variant === 'compact' ? (
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [styles.compactRing, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t(currentImage ? 'shared.photo.changeA11y' : 'shared.photo.addA11y')}
        >
          <Avatar
            initials={initials}
            imageUrl={currentImage || undefined}
            size={64}
            backgroundColor="rgba(50,127,116,0.12)"
            textColor={BrandColors.tealDark}
          />
          <View style={styles.cameraBadge}>
            <Feather name="camera" size={11} color={BrandColors.white} />
          </View>
        </Pressable>
      ) : (
        <>
          <Pressable
            onPress={handlePress}
            style={({ pressed }) => [
              styles.avatarWrapper,
              { borderColor: theme.border },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('shared.photo.selectA11y')}
          >
            <Avatar
              initials={initials}
              imageUrl={currentImage || undefined}
              size={76}
            />
          </Pressable>
          <Pressable onPress={handlePress} hitSlop={8}>
            <Typography variant="caption" color="primary" style={styles.hint}>
              {t(currentImage ? 'shared.photo.tapToChange' : 'shared.photo.tapToAdd')}
            </Typography>
          </Pressable>
        </>
      )}

      <AppBottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title={t('shared.photo.title')}
        subtitle={t('shared.photo.subtitle')}
      >
        <Pressable
          style={({ pressed }) => [
            styles.optionRow,
            { borderBottomColor: theme.border },
            pressed && { backgroundColor: theme.backgroundElement },
          ]}
          onPress={() => closeSheetThen(takePhoto)}
        >
          <Typography variant="body" style={{ color: theme.text }}>
            {t('shared.photo.takePhoto')}
          </Typography>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.optionRow,
            { borderBottomColor: theme.border },
            pressed && { backgroundColor: theme.backgroundElement },
          ]}
          onPress={() => closeSheetThen(chooseFromGallery)}
        >
          <Typography variant="body" style={{ color: theme.text }}>
            {t('shared.photo.chooseFromGallery')}
          </Typography>
        </Pressable>
        {currentImage ? (
          <Pressable
            style={({ pressed }) => [
              styles.optionRow,
              { borderBottomColor: theme.border, borderBottomWidth: 0 },
              pressed && { backgroundColor: theme.backgroundElement },
            ]}
            onPress={() => {
              setSheetVisible(false);
              handleRemovePhoto();
            }}
          >
            <Typography variant="body" style={{ color: theme.error }}>
              {t('shared.photo.removePhoto')}
            </Typography>
          </Pressable>
        ) : null}
      </AppBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  avatarWrapper: {
    borderRadius: Radius.full,
    borderWidth: 2,
    padding: Spacing.half,
  },
  pressed: {
    opacity: 0.8,
  },
  compactRing: {
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: BrandColors.teal,
    padding: 3,
  },
  cameraBadge: {
    position: 'absolute',
    start: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: BrandColors.teal,
    borderWidth: 2,
    borderColor: BrandColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    textAlign: 'center',
    fontWeight: '600',
  },
  optionRow: {
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
