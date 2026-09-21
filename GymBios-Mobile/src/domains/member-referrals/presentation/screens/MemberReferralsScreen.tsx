import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Typography } from '@/shared/components/Typography';
import { Badge } from '@/shared/components/Badge';
import { Loader } from '@/shared/components/Loader';
import { GlassBlob, GlassHeader, GlassSurface, InfoRow } from '@/shared/components';
import {
  useReferralProfile,
  useReferralHistory,
  useMyReferralClaim,
  useRetryReferralClaim,
  useMyReferralRewards,
} from '../hooks/useMemberReferrals';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import Feather from '@expo/vector-icons/Feather';

const CLAIM_BADGE_TONE = {
  PENDING: 'default' as const,
  SUCCESSFUL: 'success' as const,
  INVALID: 'muted' as const,
  EXPIRED: 'muted' as const,
};

const REWARD_BADGE_TONE = {
  PENDING: 'default' as const,
  AVAILABLE: 'default' as const,
  CLAIMED: 'default' as const,
  REDEEMED: 'success' as const,
  EXPIRED: 'muted' as const,
  CANCELLED: 'muted' as const,
};

const REWARD_TYPE_LABEL: Record<string, string> = {
  WALLET_CREDIT: 'Wallet Credit',
  MEMBERSHIP_EXTENSION: 'Membership Extension',
  MEMBERSHIP_DISCOUNT: 'Membership Discount',
  FREE_PT: 'Free PT / Class',
  FREE_CLASS: 'Free Class',
  COUPON: 'Coupon',
  LOYALTY_POINTS: 'Loyalty Points',
  GIFT: 'Gift',
  CASH: 'Cash',
};

export const MemberReferralsScreen = ({ onBack }: { onBack?: () => void }) => {
  const router = useRouter();
  const { data: profile, isLoading: isLoadingProfile } = useReferralProfile();
  const { data: history = [], isLoading: isLoadingHistory } = useReferralHistory();
  const { data: myClaim, isLoading: isLoadingMyClaim } = useMyReferralClaim();
  const { mutate: retryClaim, isPending: isRetrying } = useRetryReferralClaim();
  const { data: myRewards = [], isLoading: isLoadingRewards } = useMyReferralRewards();
  const [retryError, setRetryError] = useState<string | null>(null);

  const handleRetry = () => {
    setRetryError(null);
    retryClaim(undefined, {
      onError: (err: any) => {
        setRetryError(err?.response?.data?.error || 'Retry failed. Please try again later.');
      },
    });
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleShare = async () => {
    if (profile?.url) {
      try {
        await Share.share({
          message: `Join me at GymBios! Use my referral link: ${profile.url}`,
          url: profile.url,
        });
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <GlassBlob color={BrandColors.teal} size={320} opacity={0.34} top={-40} right={-70} />
      <GlassBlob color={BrandColors.memberGold} size={280} opacity={0.26} top={380} left={-80} />
      <GlassBlob color={BrandColors.tealDark} size={240} opacity={0.2} top={800} right={-70} />

      <GlassHeader title="Referrals" subtitle="Invite friends & earn rewards" onBack={handleBack} />

      {isLoadingProfile ? (
        <View style={styles.center}>
          <Loader />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Share Card */}
          <GlassSurface radius={Radius.lg} style={[styles.card, styles.shareCard]}>
            <Typography variant="subtitle" style={styles.cardTitle}>
              Your Referral Link
            </Typography>
            <View style={styles.codeChip}>
              <Typography variant="body" style={styles.codeText}>
                {profile?.referralCode}
              </Typography>
            </View>
            <Typography variant="bodySmall" color="textSecondary" style={styles.shareDescription}>
              Share this link with friends. When they join, you&apos;ll earn rewards!
            </Typography>
            <Pressable style={styles.shareButton} onPress={handleShare}>
              <Feather name="share-2" size={18} color="#ffffff" />
              <Typography variant="bodySmallBold" style={styles.shareButtonText}>
                Share Now
              </Typography>
            </Pressable>
          </GlassSurface>

          {/* Referral Code You Used */}
          <GlassSurface radius={Radius.lg} style={styles.card}>
            <View style={styles.sectionHeader}>
              <Feather name="user-check" size={18} color={BrandColors.teal} style={styles.sectionIcon} />
              <Typography variant="subtitle" style={styles.cardTitle}>
                Referral Code You Used
              </Typography>
            </View>

            {isLoadingMyClaim ? (
              <Loader />
            ) : !myClaim ? (
              <Typography variant="bodySmall" style={styles.emptyText}>
                You haven&apos;t entered anyone&apos;s referral code.
              </Typography>
            ) : (
              <>
                <InfoRow
                  icon="user"
                  label="Referred By"
                  divider={false}
                  value={
                    <View>
                      <Typography variant="body" style={styles.rowValue}>
                        {myClaim.referrerName}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(myClaim.claimedAt).toLocaleDateString()}
                      </Typography>
                    </View>
                  }
                  right={<Badge label={myClaim.status} tone={CLAIM_BADGE_TONE[myClaim.status]} />}
                />
                {myClaim.canRetry && (
                  <>
                    <Pressable
                      style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
                      onPress={handleRetry}
                      disabled={isRetrying}
                    >
                      <Feather name="refresh-cw" size={14} color={BrandColors.tealDark} />
                      <Typography variant="caption" style={styles.retryText}>
                        {isRetrying ? 'Retrying...' : 'Retry'}
                      </Typography>
                    </Pressable>
                    {retryError && (
                      <Typography variant="caption" style={styles.retryErrorText}>
                        {retryError}
                      </Typography>
                    )}
                  </>
                )}
              </>
            )}
          </GlassSurface>

          {/* My Rewards */}
          <GlassSurface radius={Radius.lg} style={styles.card}>
            <View style={styles.sectionHeader}>
              <Feather name="gift" size={18} color={BrandColors.teal} style={styles.sectionIcon} />
              <Typography variant="subtitle" style={styles.cardTitle}>
                My Rewards
              </Typography>
            </View>

            {isLoadingRewards ? (
              <Loader />
            ) : myRewards.length === 0 ? (
              <Typography variant="bodySmall" style={styles.emptyText}>
                No rewards yet.
              </Typography>
            ) : (
              myRewards.map((reward, index) => (
                <InfoRow
                  key={reward.id}
                  icon="award"
                  divider={index > 0}
                  label={REWARD_TYPE_LABEL[reward.rewardType] ?? reward.rewardType}
                  value={
                    <View>
                      <Typography variant="body" style={styles.rowValue}>
                        {reward.rewardValue != null
                          ? `${reward.rewardValue}${reward.currency ? ' ' + reward.currency : ''}`
                          : reward.rewardName}
                      </Typography>
                      {reward.generatedDate && (
                        <Typography variant="caption" color="textSecondary">
                          {new Date(reward.generatedDate).toLocaleDateString()}
                        </Typography>
                      )}
                    </View>
                  }
                  right={<Badge label={reward.status} tone={REWARD_BADGE_TONE[reward.status] ?? 'default'} />}
                />
              ))
            )}
          </GlassSurface>

          {/* Referral History */}
          <GlassSurface radius={Radius.lg} style={styles.card}>
            <View style={styles.sectionHeader}>
              <Feather name="users" size={18} color={BrandColors.teal} style={styles.sectionIcon} />
              <Typography variant="subtitle" style={styles.cardTitle}>
                Referral History
              </Typography>
            </View>

            {isLoadingHistory ? (
              <Loader />
            ) : history.length === 0 ? (
              <Typography variant="bodySmall" style={styles.emptyText}>
                No referrals yet.
              </Typography>
            ) : (
              history.map((item, index) => (
                <InfoRow
                  key={item.id}
                  icon="user-plus"
                  divider={index > 0}
                  label="Referred Member"
                  value={
                    <View>
                      <Typography variant="body" style={styles.rowValue}>
                        ID: {item.refereeGlobalUserId}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </Typography>
                    </View>
                  }
                  right={<Badge label={item.status} />}
                />
              ))
            )}
          </GlassSurface>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  card: {
    padding: Spacing.four,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  sectionIcon: {
    marginRight: Spacing.two,
  },
  shareCard: {
    alignItems: 'center',
  },
  codeChip: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(50,127,116,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(50,127,116,0.18)',
  },
  codeText: {
    letterSpacing: 2,
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.tealDark,
  },
  shareDescription: {
    textAlign: 'center',
    marginTop: Spacing.three,
    marginBottom: Spacing.three,
  },
  shareButton: {
    flexDirection: 'row',
    backgroundColor: BrandColors.teal,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.full,
    alignItems: 'center',
    gap: Spacing.two,
  },
  shareButtonText: {
    color: '#ffffff',
  },
  emptyText: {
    color: 'rgba(30,42,58,0.45)',
    fontStyle: 'italic',
  },
  rowValue: {
    fontWeight: '700',
    color: BrandColors.textPrimary,
    fontSize: 14.5,
    marginBottom: 2,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(50,127,116,0.3)',
    backgroundColor: 'rgba(50,127,116,0.08)',
  },
  retryButtonDisabled: {
    opacity: 0.7,
  },
  retryText: {
    color: BrandColors.tealDark,
    fontWeight: '700',
  },
  retryErrorText: {
    color: BrandColors.danger,
    marginTop: Spacing.two,
  },
});
