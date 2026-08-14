import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Typography } from '@/shared/components/Typography';
import { Radius, Spacing, BrandColors } from '@/core/theme';

interface VisitorPhotoPickerProps {
  photoUri: string | null;
  onPhotoChange: (uri: string | null) => void;
}

export function VisitorPhotoPicker({ photoUri, onPhotoChange }: VisitorPhotoPickerProps) {
  const handleUseCamera = () => {
    // In real app, integrate with expo-image-picker camera
    onPhotoChange('file://dummy/camera/photo.jpg');
  };

  const handleUploadPhoto = () => {
    // In real app, integrate with expo-image-picker gallery
    onPhotoChange('file://dummy/gallery/photo.jpg');
  };

  return (
    <View style={styles.container}>
      <Typography variant="bodySmall" color="textSecondary" style={styles.label}>
        Photo (Optional)
      </Typography>
      
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleUseCamera}>
          <Feather name="camera" size={16} color={BrandColors.textSecondary} style={styles.icon} />
          <Typography variant="bodySmall" color="textSecondary">Use Camera</Typography>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn} onPress={handleUploadPhoto}>
          <Feather name="upload" size={16} color={BrandColors.textSecondary} style={styles.icon} />
          <Typography variant="bodySmall" color="textSecondary">Upload Photo</Typography>
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
    marginRight: Spacing.two,
  }
});
