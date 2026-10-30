import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Button } from '@/shared/components';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

interface MembershipSuspendedScreenProps {
  gymName?: string | null;
  suspendedReason?: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

/**
 * Shown in place of this gym's member screens when staff suspended the membership
 * from the member page. Only this gym's member features are closed
 * (TenantContextFilter 403s them) — the account, Community and gym discovery keep
 * working, so this points the member there instead of leaving them stuck.
 */
export function MembershipSuspendedScreen({
  gymName,
  suspendedReason,
  onRefresh,
  isRefreshing,
}: MembershipSuspendedScreenProps) {
  const { t } = useTranslation();
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
        <Feather name="pause-circle" size={36} color="#D97706" />
      </View>
      <Text style={styles.title}>{t('approval.suspendedTitle')}</Text>
      <Text style={styles.subtitle}>
        {gymName ? t('approval.suspendedAtGym', { gym: gymName }) : t('approval.suspendedGeneric')}
      </Text>
      <View style={styles.reasonCard}>
        <Text style={styles.reasonLabel}>{t('approval.reason')}</Text>
        <Text style={styles.reasonText}>
          {suspendedReason?.trim() || t('approval.noReason')}
        </Text>
      </View>
      <View style={styles.infoCard}>
        <Feather name="info" size={16} color="#6B7280" style={{ marginTop: 2 }} />
        <Text style={styles.infoText}>{t('approval.suspendedInfo')}</Text>
      </View>
      <Button
        title={t('approval.openCommunity')}
        onPress={() => router.push('/(member)/community' as any)}
        style={styles.button}
      />
      <Button
        title={t('approval.browseGyms')}
        variant="outline"
        onPress={() => router.push('/(member)/centers' as any)}
        style={styles.secondaryButton}
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
    backgroundColor: 'rgba(217,119,6,0.12)',
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
    backgroundColor: '#FFFBEB',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: Spacing.three,
    marginTop: Spacing.three,
    gap: 4,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonText: {
    fontSize: 14,
    color: '#78350F',
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
  secondaryButton: {
    alignSelf: 'stretch',
  },
});
