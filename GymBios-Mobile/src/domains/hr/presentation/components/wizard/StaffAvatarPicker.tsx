import { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Avatar } from '@/shared/components/Avatar';
import { Typography } from '@/shared/components/Typography';

interface StaffAvatarPickerProps {
  photoUri?: string;
  photoUrl?: string;
  name: string;
  onChangePhoto: (uri?: string) => void;
}

export function StaffAvatarPicker({
  photoUri,
  photoUrl,
  name,
  onChangePhoto,
}: StaffAvatarPickerProps) {
  const theme = useTheme();

  const currentImage = photoUri || photoUrl;

  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'ST';

  const handleTakePhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Camera access is needed to take a profile photo.',
        );
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
      Alert.alert('Error', 'Camera is unavailable or an error occurred.');
    }
  }, [onChangePhoto]);

  const handleChooseGallery = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Gallery access is needed to select a photo.',
        );
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
      Alert.alert('Error', 'Unable to open image gallery.');
    }
  }, [onChangePhoto]);

  const handleRemovePhoto = useCallback(() => {
    onChangePhoto(undefined);
  }, [onChangePhoto]);

  const handlePress = useCallback(() => {
    const options: {
      text: string;
      style?: 'default' | 'cancel' | 'destructive';
      onPress?: () => void;
    }[] = [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Gallery', onPress: handleChooseGallery },
    ];

    if (currentImage) {
      options.push({
        text: 'Remove Photo',
        style: 'destructive',
        onPress: handleRemovePhoto,
      });
    }

    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Profile Photo', 'Choose an option', options);
  }, [currentImage, handleTakePhoto, handleChooseGallery, handleRemovePhoto]);

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
});