import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { MembershipStatusCard, type MembershipDetails } from '../components/MembershipStatusCard';
import { MembershipBenefitsTab } from '../components/MembershipBenefitsTab';
import { MembershipPaymentsTab } from '../components/MembershipPaymentsTab';
import { MembershipAddonsTab } from '../components/MembershipAddonsTab';
import { FreezeMembershipModal } from '../components/FreezeMembershipModal';
import { RenewMembershipModal } from '../components/RenewMembershipModal';

import { useMemberMembership } from '../../hooks/useMemberMembership';
import { useMemberAddOns } from '../../hooks/useMemberAddOns';
import { useFreezeMembership } from '../../hooks/useFreezeMembership';
import { useUnfreezeMembership } from '../../hooks/useUnfreezeMembership';
import { UnfreezeMembershipConfirmation } from '../components/UnfreezeMembershipConfirmation';
type MembershipTabType = 'benefits' | 'payments' | 'addons';

export function MemberMembershipScreen() {
  const { data: memberState, isLoading: isMembershipLoading, isError: isMembershipError, refetch: refetchMembership, isRefetching: isMembershipRefetching } = useMemberMembership();
  
  const [addonsPage, setAddonsPage] = useState(1);
  const { data: addonsData, isLoading: isAddonsLoading, isError: isAddonsError, refetch: refetchAddons, isRefetching: isAddonsRefetching } = useMemberAddOns({ page: addonsPage, limit: 5 });
  
  const [activeTab, setActiveTab] = useState<MembershipTabType>('benefits');
  const [isFreezeModalOpen, setIsFreezeModalOpen] = useState(false);
  const [isUnfreezeModalOpen, setIsUnfreezeModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);

  const freezeMutation = useFreezeMembership();
  const unfreezeMutation = useUnfreezeMembership();

  const handleFreezeConfirm = (days: number, reason: string) => {
    freezeMutation.mutate(
      { durationDays: days, reason },
      {
        onSuccess: () => {
          setIsFreezeModalOpen(false);
        },
      }
    );
  };

  const handleUnfreezeConfirm = () => {
    unfreezeMutation.mutate(undefined, {
      onSuccess: () => {
        setIsUnfreezeModalOpen(false);
      },
    });
  };

  const handleRenewSuccess = () => {
    Alert.alert('Coming Soon', 'Renew mutation will be implemented soon.');
  };

  const onRefresh = () => {
    refetchMembership();
    refetchAddons();
  };

  const membership: MembershipDetails | null = useMemo(() => {
    if (!memberState) return null;
    
    const { membership: ms, benefits, freeze, renewal_offer: renewalOffer } = memberState;
    return {
      type: ms?.plan?.name || 'Unknown Plan',
      status: ms?.status || 'UNKNOWN',
      startDate: ms?.start_date || '',
      endDate: ms?.expiry_date || '',
      daysRemaining: ms?.remaining_days || 0,
      totalDays: ms?.total_days || 0,
      autoRenew: ms?.auto_renew || false,
      price: ms?.plan ? `₹${ms.plan.price} / ${ms.plan.duration}` : 'N/A',
      benefits: benefits ? benefits.map(b => b.name) : [],
      freezeAvailable: freeze?.available || false,
      freezeDaysAllowed: freeze?.allowed_days || 0,
      isFrozen: freeze?.is_frozen || false,
      renewalOfferAvailable: renewalOffer?.available || false,
    };
  }, [memberState]);

  const isLoading = isMembershipLoading;
  const isError = isMembershipError;
  const isRefetching = isMembershipRefetching || isAddonsRefetching;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={BrandColors.teal} />
      </View>
    );
  }

  if (isError || !membership) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, styles.center]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
      >
        <Feather name="alert-triangle" size={48} color={BrandColors.trainerAmber} />
        <Text style={styles.errorText}>Failed to load membership data.</Text>
        <Pressable style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          tintColor={BrandColors.teal}
          colors={[BrandColors.teal]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Membership Card */}
      <MembershipStatusCard membership={membership} />

      {/* Quick Action Buttons */}
      <View style={styles.quickActionsRow}>
        <Pressable
          style={({ pressed }) => [styles.actionButtonGold, pressed && styles.pressed]}
          onPress={() => setIsRenewModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Renew Membership"
        >
          <Feather name="refresh-cw" size={20} color={BrandColors.memberGold} />
          <Text style={styles.actionButtonGoldText}>Renew Now</Text>
        </Pressable>

        {membership.isFrozen ? (
          <Pressable
            style={({ pressed }) => [styles.actionButtonAmber, pressed && styles.pressed]}
            onPress={() => setIsUnfreezeModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Unfreeze Membership"
          >
            <Feather name="play-circle" size={20} color={BrandColors.trainerAmber} />
            <Text style={styles.actionButtonAmberText}>Unfreeze</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.actionButtonAmber, pressed && styles.pressed]}
            onPress={() => setIsFreezeModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Freeze Membership"
          >
            <Feather name="pause-circle" size={20} color={BrandColors.trainerAmber} />
            <Text style={styles.actionButtonAmberText}>Freeze</Text>
          </Pressable>
        )}
      </View>

      {/* Segmented Tab Selector */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabItem, activeTab === 'benefits' && styles.tabItemActive]}
          onPress={() => setActiveTab('benefits')}
        >
          <Text
            style={[styles.tabText, activeTab === 'benefits' && styles.tabTextActive]}
          >
            Benefits
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabItem, activeTab === 'payments' && styles.tabItemActive]}
          onPress={() => setActiveTab('payments')}
        >
          <Text
            style={[styles.tabText, activeTab === 'payments' && styles.tabTextActive]}
          >
            Payments
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabItem, activeTab === 'addons' && styles.tabItemActive]}
          onPress={() => setActiveTab('addons')}
        >
          <Text
            style={[styles.tabText, activeTab === 'addons' && styles.tabTextActive]}
          >
            Add-ons
          </Text>
        </Pressable>
      </View>

      {/* Tab Content */}
      {activeTab === 'benefits' && (
        <MembershipBenefitsTab
          membership={membership}
          onClaimOffer={() => setIsRenewModalOpen(true)}
          onOpenFreeze={() => setIsFreezeModalOpen(true)}
        />
      )}

      {activeTab === 'payments' && <MembershipPaymentsTab />}

      {activeTab === 'addons' && (
        <MembershipAddonsTab 
          data={addonsData} 
          isLoading={isAddonsLoading} 
          isError={isAddonsError} 
          page={addonsPage} 
          setPage={setAddonsPage} 
        />
      )}

      {/* Modals */}
      <FreezeMembershipModal
        visible={isFreezeModalOpen}
        daysAvailable={membership.freezeDaysAllowed}
        isLoading={freezeMutation.isPending}
        onClose={() => setIsFreezeModalOpen(false)}
        onConfirm={handleFreezeConfirm}
      />

      <UnfreezeMembershipConfirmation
        visible={isUnfreezeModalOpen}
        isLoading={unfreezeMutation.isPending}
        onClose={() => setIsUnfreezeModalOpen(false)}
        onConfirm={handleUnfreezeConfirm}
      />

      <RenewMembershipModal
        visible={isRenewModalOpen}
        onClose={() => setIsRenewModalOpen(false)}
        onSuccess={handleRenewSuccess}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.six + 50,
    gap: Spacing.four,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    color: BrandColors.textSecondary,
    marginVertical: Spacing.four,
  },
  retryButton: {
    backgroundColor: BrandColors.teal,
    paddingHorizontal: Spacing.six,
    paddingVertical: Spacing.three,
    borderRadius: Radius.full,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  actionButtonGold: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: BrandColors.surface,
    paddingVertical: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: BrandColors.memberGold,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  actionButtonGoldText: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.memberGold,
  },
  actionButtonAmber: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: BrandColors.surface,
    paddingVertical: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: BrandColors.trainerAmber,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  actionButtonAmberText: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.trainerAmber,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    padding: 3,
    borderRadius: Radius.lg,
  },
  tabItem: {
    flex: 1,
    paddingVertical: Spacing.two + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  tabItemActive: {
    backgroundColor: BrandColors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  tabTextActive: {
    color: BrandColors.textPrimary,
    fontWeight: '800',
  },
});
