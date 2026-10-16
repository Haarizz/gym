import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import { Typography } from '@/shared/components/Typography';
import { usePhotoPicker } from '@/shared/components/AvatarPicker';
import { Radius, Spacing, BrandColors } from '@/core/theme';

interface VisitorPhotoPickerProps {
  photoUri: string | null;
  onPhotoChange: (uri: string | null) => void;
}

export function VisitorPhotoPicker({ photoUri, onPhotoChange }: VisitorPhotoPickerProps) {
  const { t } = useTranslation();
  const { takePhoto, chooseFromGallery } = usePhotoPicker();

  const handleUseCamera = async () => {
    const uri = await takePhoto();
    if (uri) onPhotoChange(uri);
  };

  const handleUploadPhoto = async () => {
    const uri = await chooseFromGallery();
    if (uri) onPhotoChange(uri);
  };

  return (
    <View style={styles.container}>
      <Typography variant="bodySmall" color="textSecondary" style={styles.label}>
        {t('checkIn.walkIn.photoOptional')}
      </Typography>

      {photoUri ? (
        <View style={styles.previewRow}>
          <Image source={{ uri: photoUri }} style={styles.preview} />
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => onPhotoChange(null)}
            accessibilityRole="button"
            accessibilityLabel={t('checkIn.walkIn.removePhotoA11y')}
          >
            <Feather name="x" size={14} color={BrandColors.white} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleUseCamera}>
          <Feather name="camera" size={16} color={BrandColors.textSecondary} style={styles.icon} />
          <Typography variant="bodySmall" color="textSecondary">
            {photoUri ? t('checkIn.walkIn.retake') : t('checkIn.walkIn.useCamera')}
          </Typography>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleUploadPhoto}>
          <Feather name="upload" size={16} color={BrandColors.textSecondary} style={styles.icon} />
          <Typography variant="bodySmall" color="textSecondary">
            {photoUri ? t('checkIn.walkIn.chooseAnother') : t('checkIn.walkIn.uploadPhoto')}
          </Typography>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.two,
  },
  label: {
    marginBottom: Spacing.two,
  },
  previewRow: {
    alignSelf: 'center',
    marginBottom: Spacing.three,
  },
  preview: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F0F0F0',
  },
  removeBtn: {
    position: 'absolute',
    top: 0,
    end: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
  },
  icon: {
    marginEnd: Spacing.two,
  }
});
