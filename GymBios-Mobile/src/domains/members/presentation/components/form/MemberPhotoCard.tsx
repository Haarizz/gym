import Feather from '@expo/vector-icons/Feather';
import { useCallback, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Avatar } from '@/shared/components/Avatar';
import { usePhotoPicker } from '@/shared/components/AvatarPicker';
import { Typography } from '@/shared/components/Typography';
import { uploadPhoto } from '@/shared/utils/uploadPhoto';
import type { MemberStepProps } from './stepTypes';

function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return letters || '?';
}

/**
 * Profile photo picker for the member form. Camera / gallery are plain buttons
 * (no intermediate sheet), and the picked image is uploaded straight away so the
 * stored URL is ready by the time the form is submitted.
 */
export function MemberPhotoCard({ data, updateField, errors }: MemberStepProps) {
  const theme = useTheme();
  const { takePhoto, chooseFromGallery } = usePhotoPicker();
  // Guards against a slow earlier upload overwriting a newer pick.
  const latestUri = useRef<string | undefined>(data.photoUri);

  const currentImage = data.photoUri || data.photoUrl || undefined;
  const uploading = data.photoStatus === 'uploading';
  const failed = data.photoStatus === 'error';

  const upload = useCallback(
    async (uri: string) => {
      latestUri.current = uri;
      updateField('photoUri', uri);
      updateField('photoStatus', 'uploading');
      try {
        const url = await uploadPhoto(uri);
        if (latestUri.current !== uri) return;
        updateField('photoUrl', url);
        updateField('photoStatus', 'idle');
      } catch {
        if (latestUri.current !== uri) return;
        updateField('photoUrl', '');
        updateField('photoStatus', 'error');
      }
    },
    [updateField],
  );

  const pickWith = useCallback(
    async (pick: () => Promise<string | undefined>) => {
      const uri = await pick();
      if (uri) await upload(uri);
    },
    [upload],
  );

  const handleRemove = useCallback(() => {
    latestUri.current = undefined;
    updateField('photoUri', undefined);
    updateField('photoUrl', '');
    updateField('photoStatus', 'idle');
  }, [updateField]);

  const statusText = uploading
    ? 'Uploading photo…'
    : failed
      ? 'Upload failed — tap Retry or pick another photo'
      : currentImage
        ? 'Looks good. You can change it any time.'
        : 'Optional · helps staff recognise the member at check-in';

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.avatarWrap}>
        <Avatar
          initials={initialsOf(data.name)}
          imageUrl={currentImage}
          size={72}
          backgroundColor="rgba(50,127,116,0.12)"
          textColor={BrandColors.tealDark}
        />
        {uploading ? (
          <View style={styles.avatarOverlay}>
            <ActivityIndicator color={BrandColors.white} />
          </View>
        ) : null}
        {currentImage && !uploading ? (
          <Pressable
            onPress={handleRemove}
            hitSlop={8}
            style={[styles.removeBadge, { backgroundColor: theme.error }]}
            accessibilityRole="button"
            accessibilityLabel="Remove photo"
          >
            <Feather name="x" size={12} color={BrandColors.white} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.body}>
        <Typography variant="bodySmallBold">Profile photo</Typography>
        <Typography
          variant="caption"
          style={{ color: failed || errors?.photoUrl ? theme.error : theme.textSecondary }}
        >
          {errors?.photoUrl ?? statusText}
        </Typography>

        <View style={styles.actions}>
          {failed && data.photoUri ? (
            <PhotoAction icon="refresh-cw" label="Retry" onPress={() => upload(data.photoUri!)} />
          ) : (
            <PhotoAction
              icon="camera"
              label="Camera"
              disabled={uploading}
              onPress={() => pickWith(takePhoto)}
            />
          )}
          <PhotoAction
            icon="image"
            label="Gallery"
            disabled={uploading}
            onPress={() => pickWith(chooseFromGallery)}
          />
        </View>
      </View>
    </View>
  );
}

interface PhotoActionProps {
  icon: 'camera' | 'image' | 'refresh-cw';
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

function PhotoAction({ icon, label, onPress, disabled }: PhotoActionProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.action,
        pressed && styles.actionPressed,
        disabled && styles.actionDisabled,
      ]}
    >
      <Feather name={icon} size={14} color={BrandColors.teal} />
      <Typography variant="caption" style={styles.actionLabel}>
        {label}
      </Typography>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: BrandColors.white,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  avatarWrap: {
    width: 72,
    height: 72,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: BrandColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(50,127,116,0.10)',
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionDisabled: {
    opacity: 0.4,
  },
  actionLabel: {
    color: BrandColors.teal,
    fontWeight: '700',
  },
});
