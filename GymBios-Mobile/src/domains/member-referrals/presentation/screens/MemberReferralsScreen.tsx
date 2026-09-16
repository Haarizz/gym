import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography } from '@/shared/components/Typography';
import { Surface } from '@/shared/components/Surface';
import { Badge } from '@/shared/components/Badge';
import { Loader } from '@/shared/components/Loader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { AppHeader } from '@/shared/components/AppHeader';
import {
  useReferralProfile,
  useReferralHistory,
  useMyReferralClaim,
  useRetryReferralClaim,
} from '../hooks/useMemberReferrals';
import { Spacing, Colors } from '@/core/theme';
import Feather from '@expo/vector-icons/Feather';

const CLAIM_BADGE_TONE = {
  PENDING: 'default' as const,
  SUCCESSFUL: 'success' as const,
  INVALID: 'muted' as const,
  EXPIRED: 'muted' as const,
};

export const MemberReferralsScreen = ({ onBack }: { onBack?: () => void }) => {
  const router = useRouter();
  const { data: profile, isLoading: isLoadingProfile } = useReferralProfile();
  const { data: history = [], isLoading: isLoadingHistory } = useReferralHistory();
  const { data: myClaim, isLoading: isLoadingMyClaim } = useMyReferralClaim();
  const { mutate: retryClaim, isPending: isRetrying } = useRetryReferralClaim();
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

  if (isLoadingProfile) {
    return (
      <View style={styles.center}>
        <Loader />
      </View>
    );
  }

  return (
    <ScreenLayout>
      <AppHeader 
        title="Referrals" 
        subtitle="Invite friends & earn rewards"
        colors={['#327f74', '#2a6b62']} 
        onBack={handleBack} 
      />
      <ScrollView style={styles.content}>
        
        <Surface style={styles.shareCard}>
          <Typography variant="subtitle" style={styles.shareTitle}>Your Referral Link</Typography>
          <View style={styles.codeContainer}>
            <Typography variant="body" style={[styles.codeText, { fontWeight: 'bold' }]}>{profile?.referralCode}</Typography>
          </View>
          <Typography variant="bodySmall" color="textSecondary" style={styles.shareDescription}>
            Share this link with friends. When they join, you'll earn rewards!
          </Typography>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Feather name="share-2" size={20} color="#fff" />
            <Typography variant="body" style={{ color: '#fff', marginLeft: Spacing.one, fontWeight: 'bold' }}>Share Now</Typography>
          </TouchableOpacity>
        </Surface>

        <Typography variant="title" style={styles.historyTitle}>
          Referral Code You Used
        </Typography>

        {isLoadingMyClaim ? (
          <Loader />
        ) : !myClaim ? (
          <View style={styles.emptyState}>
            <Typography variant="body" color="textSecondary">You haven't entered anyone's referral code.</Typography>
          </View>
        ) : (
          <Surface style={styles.historyCard}>
            <View style={styles.historyRow}>
              <View style={{ flex: 1 }}>
                <Typography variant="body" style={{ fontWeight: 'bold' }}>Referred by {myClaim.referrerName}</Typography>
                <Typography variant="bodySmall" color="textSecondary">
                  {new Date(myClaim.claimedAt).toLocaleDateString()}
                </Typography>
              </View>
              <Badge label={myClaim.status} tone={CLAIM_BADGE_TONE[myClaim.status]} />
            </View>
            {myClaim.canRetry && (
              <>
                <TouchableOpacity
                  style={[styles.retryButton, isRetrying && { opacity: 0.7 }]}
                  onPress={handleRetry}
                  disabled={isRetrying}
                >
                  <Feather name="refresh-cw" size={16} color="#2a6b62" />
                  <Typography variant="bodySmall" style={{ color: '#2a6b62', marginLeft: Spacing.half, fontWeight: 'bold' }}>
                    {isRetrying ? 'Retrying...' : 'Retry'}
                  </Typography>
                </TouchableOpacity>
                {retryError && (
                  <Typography variant="bodySmall" style={{ color: '#d4183d', marginTop: Spacing.two }}>
                    {retryError}
                  </Typography>
                )}
              </>
            )}
          </Surface>
        )}

        <Typography variant="title" style={styles.historyTitle}>
          Referral History
        </Typography>

        {isLoadingHistory ? (
          <Loader />
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <Typography variant="body" color="textSecondary">No referrals yet.</Typography>
          </View>
        ) : (
          history.map(item => (
            <Surface key={item.id} style={styles.historyCard}>
              <View style={styles.historyRow}>
                <View>
                  <Typography variant="body" style={{ fontWeight: 'bold' }}>Referred Member ID: {item.refereeGlobalUserId}</Typography>
                  <Typography variant="bodySmall" color="textSecondary">{new Date(item.createdAt).toLocaleDateString()}</Typography>
                </View>
                <Badge label={item.status} />
              </View>
            </Surface>
          ))
        )}

      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  shareCard: {
    padding: Spacing.three,
    marginBottom: Spacing.three,
    alignItems: 'center',
  },
  shareTitle: {
    marginBottom: Spacing.md,
  },
  codeContainer: {
    backgroundColor: '#f0f4f8',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  codeText: {
    letterSpacing: 2,
    fontSize: 20,
  },
  shareDescription: {
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  shareButton: {
    flexDirection: 'row',
    backgroundColor: '#2a6b62',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 24,
    alignItems: 'center',
  },
  historyTitle: {
    marginBottom: Spacing.md,
  },
  historyCard: {
    padding: Spacing.md,
    marginBottom: Spacing.two,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: Spacing.two,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a6b62',
  },
  emptyState: {
    padding: Spacing.four,
    alignItems: 'center',
  },
});
