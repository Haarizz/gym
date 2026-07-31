import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Typography } from '@/shared/components/Typography';
import type { MembershipPlan } from '../../domain/MembershipPlan';
import { useMembershipPlans } from '../hooks/useMembershipPlans';
import { MembershipPlanForm } from '../components/MembershipPlanForm';

interface EditMembershipPlanScreenProps {
  planId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditMembershipPlanScreen({
  planId,
  onSuccess,
  onCancel,
}: EditMembershipPlanScreenProps) {
  const theme = useTheme();
  const { loadPlanById, loading } = useMembershipPlans();
  const [plan, setPlan] = useState<MembershipPlan | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadPlanById(planId)
      .then((result) => setPlan(result))
      .catch(() => setLoadError('Failed to load plan. Please go back and try again.'));
  }, [planId, loadPlanById]);

  if (loading && !plan) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Typography variant="body" color="textSecondary">
          {loadError}
        </Typography>
      </View>
    );
  }

  if (!plan) {
    return null;
  }

  return (
    <MembershipPlanForm
      mode="edit"
      initialData={plan}
      planId={planId}
      onSuccess={onSuccess}
      onCancel={onCancel}
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
