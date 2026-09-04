import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { Typography } from '@/shared/components';
import { ROLE_SELECTION_HREF } from '../../navigation/routes';

export function AdminLoginLink() {
  const router = useRouter();

  return (
    <Pressable
      style={styles.adminLink}
      onPress={() => router.push(ROLE_SELECTION_HREF)}>
      <Feather name="shield" size={16} color="#6E7C77" />
      <Typography style={styles.adminLinkText}>Administrator login</Typography>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: '#E3E9E5',
    marginTop: 20,
  },
  adminLinkText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#6E7C77',
  },
});
