import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Button } from '@/shared/components';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

interface PaymentRejectedScreenProps {
  membershipPlan?: string | null;
  gymName?: string | null;
  rejectionReason?: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

/**
 * Shown in place of the member dashboard when staff rejected a Cash/Credit/Mixed
 * mobile purchase in the web app's Approvals tab. App access to this gym stays
 * locked (TenantContextFilter keeps 403ing member endpoints), so the wrapped
 * screens must not mount — this explains why, with staff's reason, instead.
 */
export function PaymentRejectedScreen({
  membershipPlan,
  gymName,
  rejectionReason,
  onRefresh,
  isRefreshing,
}: PaymentRejectedScreenProps) {
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
        <Feather name="x-circle" size={36} color="#DC2626" />
      </View>
      <Text style={styles.title}>Payment Rejected</Text>
      <Text style={styles.subtitle}>
        {gymName ? `Your payment at ${gymName}` : 'Your payment'}
        {membershipPlan ? ` for ${membershipPlan}` : ''} was not approved by gym staff, so your
        membership hasn't been activated.
      </Text>
      <View style={styles.reasonCard}>
        <Text style={styles.reasonLabel}>Reason</Text>
        <Text style={styles.reasonText}>
          {rejectionReason?.trim() || 'No reason was given. Please contact the gym for details.'}
        </Text>
      </View>
      <View style={styles.infoCard}>
        <Feather name="info" size={16} color="#6B7280" style={{ marginTop: 2 }} />
        <Text style={styles.infoText}>
          Please contact the gym's reception to sort out the payment, or purchase a plan again.
        </Text>
      </View>
      <Button
        title="Browse Gyms"
        onPress={() => router.push('/(member)/centers' as any)}
        style={styles.button}
      />
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
    backgroundColor: 'rgba(220,38,38,0.12)',
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
  reasonCard: {
    alignSelf: 'stretch',
    backgroundColor: '#FEF2F2',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: Spacing.three,
    marginTop: Spacing.three,
    gap: 4,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonText: {
    fontSize: 14,
    color: '#7F1D1D',
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
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  button: {
    alignSelf: 'stretch',
    marginTop: Spacing.two,
  },
});
