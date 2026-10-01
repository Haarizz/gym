import { useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';

import { toast } from '@/shared/components/Toasts/toastStore';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

/**
 * Camera / gallery launchers for a square profile photo. Each resolves to the
 * picked local URI, or undefined if the user cancelled or permission was denied
 * (a toast explains the latter).
 *
 * Don't call these while a <Modal> (e.g. AppBottomSheet) is still on screen —
 * iOS silently refuses to present the picker over a dismissing modal.
 */
export function usePhotoPicker() {
  const takePhoto = useCallback(async (): Promise<string | undefined> => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        toast.warning(
          permission.canAskAgain
            ? 'Camera access is needed to take a profile photo.'
            : 'Camera access is turned off. Enable it in Settings to take a photo.',
          { title: 'Permission Required' },
        );
        return undefined;
      }

      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
      return result.canceled ? undefined : result.assets?.[0]?.uri;
    } catch {
      toast.error('Camera is unavailable on this device.');
      return undefined;
    }
  }, []);

  const chooseFromGallery = useCallback(async (): Promise<string | undefined> => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        toast.warning(
          permission.canAskAgain
            ? 'Gallery access is needed to select a photo.'
            : 'Photo access is turned off. Enable it in Settings to choose a photo.',
          { title: 'Permission Required' },
        );
        return undefined;
      }

      const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      return result.canceled ? undefined : result.assets?.[0]?.uri;
    } catch {
      toast.error('Unable to open image gallery.');
      return undefined;
    }
  }, []);

  return { takePhoto, chooseFromGallery };
}
