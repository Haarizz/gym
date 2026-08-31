import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { toast } from '@/shared/components/Toasts/toastStore';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Avatar } from '@/shared/components/Avatar';
import { Typography } from '@/shared/components/Typography';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';

export interface AvatarPickerProps {
  photoUri?: string;
  photoUrl?: string;
  name: string;
  onChangePhoto: (uri?: string) => void;
}

export function AvatarPicker({
  photoUri,
  photoUrl,
  name,
  onChangePhoto,
}: AvatarPickerProps) {
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

  const handleTakePhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        toast.warning('Camera access is needed to take a profile photo.', { title: 'Permission Required' });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onChangePhoto(result.assets[0].uri);
      }
    } catch (_err) {
      toast.error('Camera is unavailable or an error occurred.');
    }
  }, [onChangePhoto]);

  const handleChooseGallery = useCallback(async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        toast.warning('Gallery access is needed to select a photo.', { title: 'Permission Required' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onChangePhoto(result.assets[0].uri);
      }
    } catch (_err) {
      toast.error('Unable to open image gallery.');
    }
  }, [onChangePhoto]);

  const handleRemovePhoto = useCallback(() => {
    onChangePhoto(undefined);
  }, [onChangePhoto]);

  const handlePress = useCallback(() => {
    setSheetVisible(true);
  }, []);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.avatarWrapper,
          { borderColor: theme.border },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Tap to select photo"
      >
        <Avatar
          initials={initials}
          imageUrl={currentImage || undefined}
          size={76}
        />
      </Pressable>
      <Pressable onPress={handlePress} hitSlop={8}>
        <Typography variant="caption" color="primary" style={styles.hint}>
          {currentImage ? 'Tap to change photo' : 'Tap to add photo'}
        </Typography>
      </Pressable>

      <AppBottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="Profile Photo"
        subtitle="Choose an option"
      >
        <Pressable
          style={({ pressed }) => [
            styles.optionRow,
            { borderBottomColor: theme.border },
            pressed && { backgroundColor: theme.backgroundElement },
          ]}
          onPress={() => {
            setSheetVisible(false);
            handleTakePhoto();
          }}
        >
          <Typography variant="body" style={{ color: theme.text }}>
            Take Photo
          </Typography>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.optionRow,
            { borderBottomColor: theme.border },
            pressed && { backgroundColor: theme.backgroundElement },
          ]}
          onPress={() => {
            setSheetVisible(false);
            handleChooseGallery();
          }}
        >
          <Typography variant="body" style={{ color: theme.text }}>
            Choose from Gallery
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
              Remove Photo
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
