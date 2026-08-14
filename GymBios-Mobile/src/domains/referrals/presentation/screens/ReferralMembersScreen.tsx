import React, { useState, useMemo, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  TextInput,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { ReferralHeader } from '../components/ReferralHeader';
import { ReferralMemberCard, type MemberReferralData } from '../components/ReferralMemberCard';
import { ReferralQrCodeModal } from '../components/ReferralQrCodeModal';
import { useReferrals } from '../../hooks/useReferrals';
import { useReferralFilters, type TierFilter } from '../hooks/useReferralFilters';

export function ReferralMembersScreen() {
  const router = useRouter();
  const { data: referralsPage, isLoading, refetch } = useReferrals({ size: 1000 });
  const [refreshing, setRefreshing] = useState(false);
  const [qrLink, setQrLink] = useState<string | null>(null);

  const {
    searchTerm,
    setSearchTerm,
    tierFilter,
    setTierFilter,
    dateRange,
    setDateRange,
  } = useReferralFilters();

  const referrals = referralsPage?.referrals ?? [];

  // Aggregate member performance list from referral data
  const membersList = useMemo(() => {
    const map: Record<string, MemberReferralData> = {};

    referrals.forEach((r) => {
      const name = r.referrerName || 'Unknown Member';
      if (!map[name]) {
        map[name] = {
          id: name,
          memberName: name,
          memberEmail: r.refereeEmail ? `ref-${name.toLowerCase().replace(/\s+/g, '')}@gym.com` : '',
          referralCode: r.referralCode || `REF-${name.substring(0, 3).toUpperCase()}`,
          referralLink: r.referralLink || `gymbios.app/ref/${r.referralCode || name.substring(0, 3)}`,
          totalReferrals: 0,
          successfulReferrals: 0,
          pendingReferrals: 0,
          totalRewardsEarned: 0,
          rewardBalance: 0,
          tier: 'Bronze',
        };
      }
      map[name].totalReferrals++;
      if (r.status === 'successful') {
        map[name].successfulReferrals++;
        map[name].totalRewardsEarned += Number(r.rewardAmount || 0);
        map[name].rewardBalance += Number(r.rewardAmount || 0);
      }
      if (r.status === 'pending') {
        map[name].pendingReferrals++;
      }
    });

    return Object.values(map).map((m) => {
      const s = m.successfulReferrals;
      const tier: MemberReferralData['tier'] =
        s >= 11 ? 'Platinum' : s >= 6 ? 'Gold' : s >= 3 ? 'Silver' : 'Bronze';
      return { ...m, tier };
    });
  }, [referrals]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return membersList.filter((m) => {
      const matchesSearch =
        !searchTerm.trim() ||
        m.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.memberEmail.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTier =
        tierFilter === 'all' || m.tier.toLowerCase() === tierFilter.toLowerCase();

      return matchesSearch && matchesTier;
    });
  }, [membersList, searchTerm, tierFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCopyCode = (code: string) => {
    Alert.alert('Referral Code', `Referral code "${code}" copied.`);
  };

  const handleCopyLink = (link: string) => {
    Alert.alert('Referral Link', `Referral link "${link}" copied.`);
  };

  return (
    <View style={styles.screen}>
      <ReferralHeader
        title="Referral Members"
        subtitle="View members and their referral performance"
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BrandColors.teal}
            colors={[BrandColors.teal]}
          />
        }
      >
        <View style={styles.body}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Feather name="search" size={16} color={BrandColors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or email..."
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm ? (
              <Pressable onPress={() => setSearchTerm('')} hitSlop={8}>
                <Feather name="x" size={16} color={BrandColors.textSecondary} />
              </Pressable>
            ) : null}
          </View>

          {/* Tier Filter Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tierScroll}>
            {(['all', 'platinum', 'gold', 'silver', 'bronze'] as TierFilter[]).map((tier) => (
              <Pressable
                key={tier}
                style={[styles.tierTab, tierFilter === tier && styles.tierTabActive]}
                onPress={() => setTierFilter(tier)}
              >
                <Typography
                  variant="caption"
                  style={[styles.tierTabText, tierFilter === tier && styles.tierTabTextActive]}
                >
                  {tier === 'all' ? 'All Tiers' : tier.charAt(0).toUpperCase() + tier.slice(1)}
                </Typography>
              </Pressable>
            ))}
          </ScrollView>

          {/* Members Cards List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={BrandColors.teal} />
              <Typography variant="bodySmall" color="textSecondary" style={{ marginTop: 8 }}>
                Loading referral members...
              </Typography>
            </View>
          ) : filteredMembers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="users" size={32} color={BrandColors.textSecondary} style={{ opacity: 0.5 }} />
              <Typography variant="bodySmall" color="textSecondary" style={{ marginTop: 8 }}>
                No members found matching filters.
              </Typography>
            </View>
          ) : (
            filteredMembers.map((member) => (
              <ReferralMemberCard
                key={member.id}
                member={member}
                onCopyCode={handleCopyCode}
                onCopyLink={handleCopyLink}
                onGenerateQr={(link) => setQrLink(link)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* QR Code Modal */}
      <ReferralQrCodeModal
        visible={Boolean(qrLink)}
        onClose={() => setQrLink(null)}
        link={qrLink}
        onCopyLink={handleCopyLink}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  body: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: Spacing.two,
  },
  searchIcon: {
    marginRight: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: BrandColors.textPrimary,
  },
  tierScroll: {
    marginBottom: Spacing.three,
  },
  tierTab: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.full,
    backgroundColor: '#ffffff',
    marginRight: Spacing.two,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tierTabActive: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
  tierTabText: {
    fontSize: 12,
    color: BrandColors.textSecondary,
    fontWeight: '600',
  },
  tierTabTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    padding: Spacing.five,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
  },
});
