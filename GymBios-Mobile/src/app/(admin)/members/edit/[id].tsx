import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { MemberCreateEditScreen } from '@/domains/members/presentation/screens/MemberCreateEditScreen';
import { useMembers } from '@/domains/members/hooks/useMembers';
import { Typography } from '@/shared/components/Typography';
import type { Member } from '@/domains/members/domain/Member';

export default function EditMemberRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedMember, loadMember, loading } = useMembers();
  const [member, setMember] = useState<Member | null>(null);

  const memberId = id ? Number(id) : NaN;

  useEffect(() => {
    if (!Number.isNaN(memberId)) {
      loadMember(memberId).then(setMember).catch(() => {});
    }
  }, [memberId, loadMember]);

  const handleSuccess = useCallback(() => {
    router.back();
  }, [router]);

  if (Number.isNaN(memberId) || loading || !member) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
        <Typography variant="body" color="textSecondary">
          Loading member data...
        </Typography>
      </View>
    );
  }

  return (
    <MemberCreateEditScreen
      mode="edit"
      initialData={member}
      onSuccess={handleSuccess}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
});