import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { BrandColors, Spacing } from '@/core/theme';
import { Button, GlassBlob, Typography } from '@/shared/components';
import { useAuthStore } from '@/domains/auth/store/authStore';
import { useRestoreSession } from '@/domains/auth';

import { useMyGymMemberships } from '../gymMembershipsApi';
import { useGymSwitch } from '../useGymSwitch';
import { GymMembershipList } from './GymMembershipList';

/**
 * Shown in place of the member tabs when a member who belongs to several gyms signs
 * in with no gym remembered on this device (fresh install, new phone). Once they pick
 * one it is remembered, and later sign-ins open it directly; switching afterwards is
 * done from the profile hub or the header.
 */
export function ChooseGymScreen() {
  const { t } = useTranslation();
  const { data: gyms, isLoading, isError, refetch } = useMyGymMemberships();
  // The layout already sits on the member home, which renders as soon as a gym is set.
  const { pendingTenant, select } = useGymSwitch({ goHome: false, announce: false });
  const { logout, isLoggingOut } = useRestoreSession();

  // The list changed since sign-in (a membership was removed): nothing left to choose.
  useEffect(() => {
    if (!gyms || pendingTenant) return;
    if (gyms.length === 1) {
      select(gyms[0]);
    } else if (gyms.length === 0) {
      useAuthStore.setState({ gymChoicePending: false });
    }
  }, [gyms, pendingTenant, select]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <GlassBlob color={BrandColors.teal} size={320} opacity={0.32} top={-90} right={-70} />
      <GlassBlob color={BrandColors.memberGold} size={260} opacity={0.24} top={420} left={-80} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Typography variant="title" accessibilityRole="header">{t('gymSwitcher.pickerTitle')}</Typography>
          <Typography color="textSecondary">{t('gymSwitcher.pickerSubtitle')}</Typography>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={BrandColors.teal} style={styles.loader} />
        ) : isError ? (
          <View style={styles.error}>
            <Typography color="textSecondary">{t('gymSwitcher.loadFailed')}</Typography>
            <Button label={t('gymSwitcher.retry')} variant="outline" onPress={() => refetch()} />
          </View>
        ) : (
          <GymMembershipList
            gyms={gyms ?? []}
            activeTenant={null}
            pendingTenant={pendingTenant}
            onSelect={select}
          />
        )}

        <Pressable
          onPress={() => logout()}
          disabled={isLoggingOut}
          style={styles.signOut}
          accessibilityRole="button"
        >
          <Typography style={styles.signOutText}>{t('gymSwitcher.signOut')}</Typography>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.two,
  },
  loader: {
    marginTop: Spacing.six,
  },
  error: {
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  signOut: {
    alignSelf: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  signOutText: {
    color: BrandColors.redDeep,
    fontWeight: '700',
  },
});
