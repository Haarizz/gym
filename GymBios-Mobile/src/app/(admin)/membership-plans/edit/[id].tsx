import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { EditMembershipPlanScreen } from '@/domains/membershipPlans/presentation/screens/EditMembershipPlanScreen';
import { Typography } from '@/shared/components/Typography';

export default function EditMembershipPlanRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const planId = id ? parseInt(id, 10) : NaN;

  const handleSuccess = useCallback(() => {
    router.back();
  }, [router]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  if (isNaN(planId)) {
    return (
      <View style={styles.center}>
        <Typography variant="body" color="textSecondary">
          Invalid plan ID.
        </Typography>
      </View>
    );
  }

  return (
    <EditMembershipPlanScreen
      planId={planId}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});