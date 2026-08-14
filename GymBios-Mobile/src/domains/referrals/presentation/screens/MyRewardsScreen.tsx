import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { Button } from '@/shared/components/Button';
import { useCurrency, CurrencyGlyph } from '@/core/providers/CurrencyProvider';
import { ReferralHeader } from '../components/ReferralHeader';
import { useMembers } from '@/domains/members';
import { useRedeemReferralReward } from '../../hooks/useReferralActions';
import type { Member } from '@/domains/members';

export function MyRewardsScreen() {
  const router = useRouter();
  const { currencyCode } = useCurrency();
  const { members, loading: isMembersLoading } = useMembers();
  const redeemMutation = useRedeemReferralReward();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const filteredMembers = members.filter((m: Member) =>
    !searchQuery.trim()
      ? true
      : m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.phone && m.phone.includes(searchQuery)) ||
        (m.memberId && m.memberId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleRedeem = (rewardId: number, label: string) => {
    redeemMutation.mutate(rewardId, {
      onSuccess: () => {
        Alert.alert('Success', `${label} redeemed successfully.`);
      },
      onError: (err) => {
        Alert.alert('Error', err.message || 'Failed to redeem reward.');
      },
    });
  };

  return (
    <View style={styles.screen}>
      <ReferralHeader
        title="My Rewards"
        subtitle="Search a member to view and action their referral rewards"
        onBack={() => router.back()}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.body}>
          {/* Search Bar */}
          <Typography variant="bodySmall" style={styles.fieldLabel}>
            Search Member
          </Typography>
          <View style={styles.searchRow}>
            <Feather name="search" size={16} color={BrandColors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Member ID, Name, or Phone"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setShowPicker(true);
              }}
              onFocus={() => setShowPicker(true)}
            />
          </View>

          {showPicker && searchQuery.trim().length > 0 ? (
            <View style={styles.suggestionsBox}>
              {filteredMembers.slice(0, 5).map((m: Member) => (
                <Pressable
                  key={m.id}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setSelectedMember(m);
                    setSearchQuery(m.name);
                    setShowPicker(false);
                  }}
                >
                  <Typography variant="bodySmall" style={styles.suggestionName}>
                    {m.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {m.memberId || m.id} • {m.phone || 'No phone'}
                  </Typography>
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* Selected Member Summary */}
          {selectedMember ? (
            <View style={styles.memberSummaryCard}>
              <View style={styles.memberSummaryHeader}>
                <View style={styles.avatarIcon}>
                  <Feather name="user" size={18} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Typography variant="subtitle" style={styles.selectedName}>
                    {selectedMember.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    ID: {selectedMember.memberId || selectedMember.id}
                  </Typography>
                </View>
                <View style={styles.activeBadge}>
                  <Typography variant="caption" style={styles.activeBadgeText}>
                    {selectedMember.status || 'Active'}
                  </Typography>
                </View>
              </View>

              <View style={styles.memberInfoGrid}>
                <View style={styles.infoCol}>
                  <Typography variant="caption" color="textSecondary">
                    Plan
                  </Typography>
                  <Typography variant="bodySmall" style={styles.infoVal}>
                    {selectedMember.membershipPlanName || selectedMember.membershipType || 'Standard'}
                  </Typography>
                </View>
                <View style={styles.infoCol}>
                  <Typography variant="caption" color="textSecondary">
                    Phone
                  </Typography>
                  <Typography variant="bodySmall" style={styles.infoVal}>
                    {selectedMember.phone || '—'}
                  </Typography>
                </View>
              </View>
            </View>
          ) : null}

          {!selectedMember ? (
            <View style={styles.placeholderCard}>
              <View style={styles.placeholderIcon}>
                <Feather name="gift" size={32} color={BrandColors.teal} />
              </View>
              <Typography variant="subtitle" style={styles.placeholderTitle}>
                Search for a member to view their rewards
              </Typography>
              <Typography variant="bodySmall" color="textSecondary" style={styles.placeholderSubtitle}>
                Use the search bar above to select a member by name, ID, or phone.
              </Typography>
            </View>
          ) : (
            <>
              {/* Wallet Balance Card */}
              <View style={styles.walletCard}>
                <View style={styles.walletHeader}>
                  <Typography variant="caption" color="textSecondary">
                    Wallet Balance
                  </Typography>
                  <View style={styles.walletIcon}>
                    <Feather name="credit-card" size={16} color="#16a34a" />
                  </View>
                </View>
                <Typography variant="title" style={styles.walletBalance}>
                  <CurrencyGlyph code={currencyCode} /> 150.00
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Available referral credits for {selectedMember.name}
                </Typography>
              </View>

              {/* Earned Rewards List */}
              <Typography variant="subtitle" style={styles.sectionHeader}>
                Earned Referral Rewards
              </Typography>

              <View style={styles.rewardCard}>
                <View style={styles.rewardTop}>
                  <View style={{ flex: 1 }}>
                    <Typography variant="subtitle" style={styles.rewardName}>
                      Wallet Credit Reward
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Generated: 2026-08-01 • Expires: 2026-11-01
                    </Typography>
                  </View>
                  <Typography variant="subtitle" style={styles.rewardAmount}>
                    <CurrencyGlyph code={currencyCode} /> 50.00
                  </Typography>
                </View>
                <View style={styles.rewardActionRow}>
                  <Button
                    title="Claim Credit"
                    onPress={() => handleRedeem(1, 'Wallet credit')}
                    loading={redeemMutation.isPending}
                    style={styles.claimBtn}
                  />
                </View>
              </View>

              <View style={styles.rewardCard}>
                <View style={styles.rewardTop}>
                  <View style={{ flex: 1 }}>
                    <Typography variant="subtitle" style={styles.rewardName}>
                      Free Personal Training Session
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Generated: 2026-08-05 • Expires: 2026-09-05
                    </Typography>
                  </View>
                  <View style={styles.typeTag}>
                    <Typography variant="caption" style={styles.typeTagText}>
                      Free PT
                    </Typography>
                  </View>
                </View>
                <View style={styles.rewardActionRow}>
                  <Button
                    title="Book PT Session"
                    onPress={() => handleRedeem(2, 'PT Session')}
                    loading={redeemMutation.isPending}
                    style={styles.claimBtn}
                  />
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
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
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    marginBottom: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: BrandColors.textPrimary,
  },
  suggestionsBox: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
    marginBottom: Spacing.two,
  },
  suggestionItem: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionName: {
    fontWeight: '600',
  },
  memberSummaryCard: {
    backgroundColor: '#eff6ff',
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginTop: Spacing.three,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  memberSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  avatarIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedName: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  activeBadgeText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '600',
  },
  memberInfoGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#dbeafe',
  },
  infoCol: {
    flex: 1,
  },
  infoVal: {
    fontWeight: '600',
    marginTop: 2,
  },
  placeholderCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.four,
  },
  placeholderIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  placeholderTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  placeholderSubtitle: {
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  walletCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletIcon: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletBalance: {
    fontSize: 22,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginVertical: Spacing.one,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  rewardCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  rewardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardName: {
    fontSize: 14,
    fontWeight: '700',
  },
  rewardAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.teal,
  },
  typeTag: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  typeTagText: {
    color: '#7e22ce',
    fontSize: 11,
    fontWeight: '600',
  },
  rewardActionRow: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  claimBtn: {
    width: '100%',
  },
});
