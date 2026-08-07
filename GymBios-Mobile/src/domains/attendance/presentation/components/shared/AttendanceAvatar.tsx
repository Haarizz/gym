import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/shared/components/Avatar';
import { getInitials } from './attendanceUtils';

interface AttendanceAvatarProps {
  name: string;
  photoUrl?: string;
  size?: number;
}

export function AttendanceAvatar({
  name,
  photoUrl,
  size = 44,
}: AttendanceAvatarProps) {
  return (
    <View style={styles.container}>
      <Avatar initials={getInitials(name)} imageUrl={photoUrl} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
