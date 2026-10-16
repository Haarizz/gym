import { useState } from 'react';
import { I18nManager, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/shared/components/AppText';
import { GlassBlob, GlassSurface, Loader } from '@/shared/components';
import { Avatar } from '@/shared/components/Avatar';
import { formatTimeAgo } from '@/core/i18n';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { initialsOf, type StaffReview } from '../../domain/TeamMember';
import { useStaffProfile } from '../../hooks/useTeam';
import { avatarColor } from '../components/StaffCard';
import { RateStaffSheet } from '../components/RateStaffSheet';
import { StarRow } from '../components/StarRow';

/** One staff member: who they are, their rating breakdown and members' reviews. */
export function StaffProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { staffId } = useLocalSearchParams<{ staffId: string }>();
  const { data: profile, isLoading, isError, refetch, isRefetching } = useStaffProfile(Number(staffId));
  const [rateOpen, setRateOpen] = useState(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(member)/team' as any));

  const backButton = (
    <Pressable
      onPress={goBack}
      style={({ pressed }) => [styles.round, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={t('team.profile.back')}
    >
      <Feather name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'} size={22} color={BrandColors.textPrimary} />
    </Pressable>
  );

  if (isLoading || !profile) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.topBar}>{backButton}</View>
        <View style={styles.center}>
          {isError ? (
            <>
              <Text style={styles.muted}>{t('team.profile.loadFailed')}</Text>
              <Pressable onPress={() => refetch()} style={styles.retry} accessibilityRole="button">
                <Text style={styles.retryText}>{t('team.retry')}</Text>
              </Pressable>
            </>
          ) : (
            <Loader />
          )}
        </View>
      </View>
    );
  }

  const { staff, distribution, topTags, reviews } = profile;
  const total = staff.ratingCount;
  const joinYear = staff.joinDate ? new Date(staff.joinDate).getFullYear() : null;

  return (
    <View style={styles.root}>
      <View style={styles.blobLayer} pointerEvents="none">
        <GlassBlob color={BrandColors.memberGold} size={320} opacity={0.38} top={-80} right={-110} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: 110 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={BrandColors.memberGold}
            colors={[BrandColors.memberGold]}
          />
        }
      >
        <View style={styles.topBar}>{backButton}</View>

        <View style={styles.hero}>
          <Avatar
            size={96}
            initials={initialsOf(staff.name)}
            imageUrl={staff.photoUrl ?? undefined}
            backgroundColor={avatarColor(staff.id)}
          />
          <Text style={styles.name} accessibilityRole="header">{staff.name}</Text>
          <Text style={styles.role}>{[staff.role, staff.department].filter(Boolean).join(' · ')}</Text>
          {staff.certifications.length > 0 && (
            <View style={[styles.tags, styles.tagsCentered]}>
              {staff.certifications.map(c => (
                <View key={c} style={styles.tag}>
                  <Text style={styles.tagText}>{c}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <GlassSurface radius={Radius.xl} style={styles.stats}>
          <Stat value={staff.averageRating != null ? staff.averageRating.toFixed(1) : '—'} label={t('team.profile.rating')} />
          <Stat value={String(total)} label={t('team.profile.ratings')} divider />
          <Stat value={joinYear ? String(joinYear) : '—'} label={t('team.profile.withUsSince')} divider />
        </GlassSurface>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{t('team.profile.ratingsAndReviews')}</Text>
          <Text style={styles.sectionCount}>{t('team.ratingCount', { count: total })}</Text>
        </View>

        {total === 0 ? (
          <Text style={[styles.muted, styles.padded]}>{t('team.profile.noReviews')}</Text>
        ) : (
          <>
            <GlassSurface radius={Radius.xl} style={styles.summary}>
              <View style={styles.summaryScore}>
                <Text style={styles.big}>{staff.averageRating!.toFixed(1)}</Text>
                <StarRow value={staff.averageRating} size={13} />
              </View>
              <View style={styles.bars}>
                {[5, 4, 3, 2, 1].map(star => (
                  <View key={star} style={styles.bar}>
                    <Text style={styles.barLabel}>{star}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${((distribution[star - 1] ?? 0) / total) * 100}%` }]} />
                    </View>
                  </View>
                ))}
              </View>
            </GlassSurface>

            {topTags.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, styles.padded]}>{t('team.profile.whatMembersSay')}</Text>
                <View style={[styles.tags, styles.padded]}>
                  {topTags.map(({ tag, count }) => (
                    <View key={tag} style={styles.praise}>
                      <Text style={styles.praiseText}>{t(`team.tags.${tag}`)} · {count}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <View style={styles.reviews}>
              {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
            </View>
          </>
        )}
      </ScrollView>

      <GlassSurface strong radius={26} style={[styles.actionBar, { bottom: Math.max(insets.bottom, Spacing.md) }]}>
        <Pressable
          onPress={() => setRateOpen(true)}
          style={({ pressed }) => [styles.action, styles.rateAction, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="star-outline" size={20} color="#6B4700" />
          <Text style={styles.rateActionText}>
            {staff.myRating ? t('team.profile.updateRating') : t('team.profile.rate')}
          </Text>
        </Pressable>
        <View
          style={[styles.action, styles.messageAction, styles.disabled]}
          accessible
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityLabel={`${t('team.profile.message')}, ${t('team.profile.messageSoon')}`}
        >
          <Feather name="message-circle" size={19} color="#FFFFFF" />
          <View>
            <Text style={styles.messageActionText}>{t('team.profile.message')}</Text>
            <Text style={styles.messageSoon}>{t('team.profile.messageSoon')}</Text>
          </View>
        </View>
      </GlassSurface>

      <RateStaffSheet member={rateOpen ? staff : null} onClose={() => setRateOpen(false)} />
    </View>
  );
}

function Stat({ value, label, divider }: { value: string; label: string; divider?: boolean }) {
  return (
    <View style={[styles.stat, divider && styles.statDivider]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ReviewCard({ review }: { review: StaffReview }) {
  const { t } = useTranslation();
  const name = review.mine
    ? t('team.profile.you')
    : review.anonymous
      ? t('team.profile.anonymous')
      : review.authorName ?? t('team.profile.memberFallback');

  return (
    <GlassSurface radius={Radius.lg} style={[styles.review, review.mine && styles.reviewMine]}>
      <View style={styles.reviewHead}>
        <Avatar
          size={40}
          initials={review.anonymous && !review.mine ? '?' : initialsOf(review.authorName ?? name)}
          backgroundColor="#EDE8DC"
          textColor="#4A4230"
        />
        <View style={styles.reviewWho}>
          <Text style={styles.reviewName}>{name}</Text>
          {!!review.updatedAt && <Text style={styles.reviewWhen}>{formatTimeAgo(review.updatedAt, { addSuffix: true })}</Text>}
        </View>
        <StarRow value={review.rating} size={12} />
      </View>
      {review.tags.length > 0 && (
        <View style={[styles.tags, styles.reviewTags]}>
          {review.tags.map(tag => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{t(`team.tags.${tag}`)}</Text>
            </View>
          ))}
        </View>
      )}
      {!!review.comment && <Text style={styles.reviewText}>{review.comment}</Text>}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  blobLayer: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    height: 380,
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    marginTop: 14,
    textAlign: 'center',
  },
  role: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagsCentered: {
    justifyContent: 'center',
    marginTop: 10,
  },
  tag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(30,41,59,0.06)',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.textSecondary,
  },
  stats: {
    flexDirection: 'row',
    margin: Spacing.three,
    paddingVertical: 14,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    borderStartWidth: 1,
    borderStartColor: 'rgba(30,41,59,0.08)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: Spacing.three,
  },
  sectionTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    marginTop: Spacing.two,
    marginBottom: 10,
  },
  sectionCount: {
    fontSize: TypographyScale.small,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  padded: {
    paddingHorizontal: Spacing.three,
  },
  muted: {
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginHorizontal: Spacing.three,
    padding: Spacing.three,
  },
  summaryScore: {
    alignItems: 'center',
    gap: 6,
  },
  big: {
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  bars: {
    flex: 1,
    gap: 5,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  barLabel: {
    width: 10,
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.textSecondary,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 9,
    backgroundColor: 'rgba(30,41,59,0.08)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 9,
    backgroundColor: '#F6B73C',
  },
  praise: {
    minHeight: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(30,41,59,0.08)',
  },
  praiseText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  reviews: {
    gap: 10,
    padding: Spacing.three,
  },
  review: {
    padding: 14,
  },
  reviewMine: {
    borderWidth: 2,
    borderColor: '#F6B73C',
  },
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewWho: {
    flex: 1,
  },
  reviewName: {
    fontSize: TypographyScale.body,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  reviewWhen: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  reviewTags: {
    marginTop: 10,
  },
  reviewText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#3D3525',
    marginTop: 10,
  },
  actionBar: {
    position: 'absolute',
    start: Spacing.md,
    end: Spacing.md,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  action: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  rateAction: {
    backgroundColor: '#FDF0CF',
  },
  rateActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6B4700',
  },
  messageAction: {
    backgroundColor: BrandColors.teal,
  },
  messageActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  messageSoon: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  disabled: {
    opacity: 0.5,
  },
  retry: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.teal,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
