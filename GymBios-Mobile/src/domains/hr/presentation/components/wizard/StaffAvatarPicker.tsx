import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Avatar } from '@/shared/components/Avatar';
import { Typography } from '@/shared/components/Typography';

interface StaffAvatarPickerProps {
  photoUrl?: string;
  name: string;
  onChangePhotoUrl: (url: string) => void;
}

export function StaffAvatarPicker({
  photoUrl,
  name,
  onChangePhotoUrl,
}: StaffAvatarPickerProps) {
  const theme = useTheme();

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => {
          // In a real app, this would open an image picker
          // For now, we just show the avatar
        }}
        style={[styles.avatarWrapper, { borderColor: theme.border }]}
      >
        <Avatar
          initials={initials}
          imageUrl={photoUrl || undefined}
          size={80}
        />
      </Pressable>
      <Typography variant="caption" color="textSecondary" style={styles.hint}>
        {name || 'Staff Name'}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  avatarWrapper: {
    borderRadius: Radius.full,
    borderWidth: 2,
    padding: Spacing.half,
  },
  hint: {
    textAlign: 'center',
  },
});