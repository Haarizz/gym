import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

interface PendingApprovalScreenProps {
  membershipPlan?: string | null;
  gymName?: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

/**
 * Shown in place of the member dashboard while a Cash/Credit/Mixed mobile
 * purchase is awaiting reception approval (see MobileDiscoveryController and
 * useMembershipApprovalStatus). App access to this gym stays locked
 * (TenantContextFilter 403s member endpoints) until staff approve or reject it
 * in the web app's Approvals tab — pull to refresh to check again.
 */
export function PendingApprovalScreen({
  membershipPlan,
  gymName,
  onRefresh,
  isRefreshing,
}: PendingApprovalScreenProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={BrandColors.memberGold}
          colors={[BrandColors.memberGold]}
        />
      }
    >
      <View style={styles.iconCircle}>
        <Feather name="clock" size={36} color={BrandColors.memberGold} />
      </View>
      <Text style={styles.title}>Payment Awaiting Approval</Text>
      <Text style={styles.subtitle}>
        {gymName ? `Your payment at ${gymName}` : 'Your payment'} is submitted and waiting for
        gym staff to confirm it was received.
        {membershipPlan ? ` (${membershipPlan})` : ''}
      </Text>
      <View style={styles.infoCard}>
        <Feather name="info" size={16} color="#6B7280" style={{ marginTop: 2 }} />
        <Text style={styles.infoText}>
          Show your payment confirmation at reception if you haven't already. Your app
          access unlocks automatically once staff approve it — pull down to check again.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
    gap: Spacing.three,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(242,187,61,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TypographyScale.body,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    gap: Spacing.two,
    backgroundColor: '#F9FAFB',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: Spacing.three,
    marginTop: Spacing.three,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
});
