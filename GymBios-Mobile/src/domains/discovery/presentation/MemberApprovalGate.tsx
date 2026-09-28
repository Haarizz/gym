import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { BrandColors } from '@/core/theme';
import { Loader } from '@/shared/components';
import { useMembershipApprovalStatus } from '../hooks/useMembershipApprovalStatus';
import { PendingApprovalScreen } from './PendingApprovalScreen';

/**
 * Wraps member tabs whose APIs are tenant-scoped (dashboard, bookings,
 * membership, ...). While a Cash/Credit/Mixed purchase is awaiting reception
 * approval, TenantContextFilter 403s every one of those endpoints, so the
 * wrapped screen must not even mount — otherwise its queries fire and the user
 * gets a stack of "403" toasts behind the pending screen. Children only mount
 * once /api/members/me has confirmed access isn't pending.
 */
export function MemberApprovalGate({ children }: { children: ReactNode }) {
  const approval = useMembershipApprovalStatus();

  if (approval.isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <Loader message="Loading member portal..." />
      </View>
    );
  }

  if (approval.data?.approvalStatus === 'PENDING') {
    return (
      <PendingApprovalScreen
        membershipPlan={approval.data.membershipPlan}
        gymName={approval.data.gymName}
        onRefresh={() => approval.refetch()}
        isRefreshing={approval.isRefetching}
      />
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.screenBackground,
  },
});
