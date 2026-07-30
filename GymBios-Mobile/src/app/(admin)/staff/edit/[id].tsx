import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { StaffWizardScreen } from '@/domains/hr/presentation/screens/StaffWizardScreen';
import { useStaff } from '@/domains/hr/presentation/hooks/useStaff';
import type { Staff } from '@/domains/hr/domain/Staff';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Typography } from '@/shared/components/Typography';

export default function EditStaffRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedStaff, loadStaff, loading } = useStaff();
  const [staff, setStaff] = useState<Staff | null>(null);

  useEffect(() => {
    if (id) {
      loadStaff(id).then(setStaff).catch(() => {});
    }
  }, [id, loadStaff]);

  const handleSuccess = useCallback(() => {
    router.back();
  }, [router]);

  if (loading || !staff) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
        <Typography variant="body" color="textSecondary">
          Loading staff data...
        </Typography>
      </View>
    );
  }

  return (
    <StaffWizardScreen
      mode="edit"
      initialData={staff}
      staffId={id}
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