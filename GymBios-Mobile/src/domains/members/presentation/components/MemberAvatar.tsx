import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/shared/components/Avatar';

interface MemberAvatarProps {
  name: string;
  photoUrl?: string;
  size?: number;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function MemberAvatar({
  name,
  photoUrl,
  size = 48,
}: MemberAvatarProps) {
  return (
    <View style={styles.container}>
      <Avatar
        initials={getInitials(name)}
        imageUrl={photoUrl}
        size={size}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});