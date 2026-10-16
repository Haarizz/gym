import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '@/shared/components/AppText';
import { GlassBlob, GlassSurface, Loader } from '@/shared/components';
import { Avatar } from '@/shared/components/Avatar';
import { TAB_BAR_HEIGHT } from '@/shared/layouts/ScreenLayout';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { initialsOf, isTrainer, type TeamMember } from '../../domain/TeamMember';
import { useTeam } from '../../hooks/useTeam';
import { StaffCard, avatarColor } from '../components/StaffCard';
import { RateStaffSheet } from '../components/RateStaffSheet';
import { StarRow } from '../components/StarRow';

type Filter = 'all' | 'trainers' | 'staff';
const FILTERS: Filter[] = ['all', 'trainers', 'staff'];

/** The member's gym team: everyone active at their branch, with ratings. */
export function MemberTeamScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: team = [], isLoading, isError, refetch, isRefetching } = useTeam();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [rating, setRating] = useState<TeamMember | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return team.filter(m =>
      (filter === 'all' || (filter === 'trainers') === isTrainer(m.role)) &&
      (!q || [m.name, m.role, m.department ?? '', ...m.certifications].join(' ').toLowerCase().includes(q)),
    );
  }, [team, query, filter]);

  const topRated = useMemo(
    () => team
      .filter(m => m.averageRating != null)
      .sort((a, b) => b.averageRating! - a.averageRating! || b.ratingCount - a.ratingCount)[0],
    [team],
  );

  const openProfile = (m: TeamMember) => router.push(`/(member)/team/${m.id}` as any);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Loader />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.blobLayer} pointerEvents="none">
        <GlassBlob color={BrandColors.memberGold} size={320} opacity={0.38} top={-60} right={-110} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
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
        <Text style={styles.title} accessibilityRole="header">{t('team.title')}</Text>

        <GlassSurface strong radius={Radius.lg} style={styles.search}>
          <Feather name="search" size={18} color={BrandColors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('team.searchPlaceholder')}
            placeholderTextColor="#7A8684"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable hitSlop={8} onPress={() => setQuery('')} accessibilityRole="button">
              <Feather name="x" size={16} color="#7A8684" />
            </Pressable>
          )}
        </GlassSurface>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map(f => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.chip, filter === f && styles.chipOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === f }}
            >
              <Text style={[styles.chipText, filter === f && styles.chipTextOn]}>{t(`team.filters.${f}`)}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {isError ? (
          <View style={styles.message}>
            <Text style={styles.messageText}>{t('team.loadFailed')}</Text>
            <Pressable onPress={() => refetch()} style={styles.retry} accessibilityRole="button">
              <Text style={styles.retryText}>{t('team.retry')}</Text>
            </Pressable>
          </View>
        ) : team.length === 0 ? (
          <View style={styles.message}>
            <Feather name="users" size={28} color={BrandColors.textSecondary} />
            <Text style={styles.messageText}>{t('team.empty')}</Text>
          </View>
        ) : (
          <>
            {topRated && filter === 'all' && !query && (
              <>
                <Text style={styles.sectionTitle}>{t('team.topRated')}</Text>
                <Pressable
                  onPress={() => openProfile(topRated)}
                  style={({ pressed }) => [styles.featured, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={t('team.openA11y', { name: topRated.name })}
                >
                  <Text style={styles.featuredBadge}>{t('team.topRatedBadge')}</Text>
                  <Avatar
                    size={52}
                    initials={initialsOf(topRated.name)}
                    imageUrl={topRated.photoUrl ?? undefined}
                    backgroundColor={avatarColor(topRated.id)}
                  />
                  <View style={styles.featuredBody}>
                    <Text style={styles.featuredName} numberOfLines={1}>{topRated.name}</Text>
                    <Text style={styles.featuredRole} numberOfLines={1}>{topRated.role}</Text>
                    <View style={styles.ratingRow}>
                      <StarRow value={topRated.averageRating} />
                      <Text style={styles.featuredRating}>
                        {topRated.averageRating!.toFixed(1)} ({topRated.ratingCount})
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </>
            )}

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>{t('team.allStaff')}</Text>
              <Text style={styles.sectionCount}>{t('team.people', { count: rows.length })}</Text>
            </View>

            {rows.length === 0 ? (
              <Text style={[styles.messageText, styles.noResults]}>{t('team.noResults')}</Text>
            ) : (
              <View style={styles.list}>
                {rows.map(m => (
                  <StaffCard key={m.id} member={m} onOpen={() => openProfile(m)} onRate={() => setRating(m)} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <RateStaffSheet member={rating} onClose={() => setRating(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.screenBackground,
  },
  blobLayer: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    height: 360,
    overflow: 'hidden',
  },
  content: {
    padding: Spacing.three,
  },
  title: {
    fontSize: TypographyScale.title,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.md,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: BrandColors.textPrimary,
    paddingVertical: 0,
  },
  chips: {
    gap: Spacing.two,
    paddingVertical: 14,
  },
  chip: {
    height: 38,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.full,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  chipOn: {
    backgroundColor: BrandColors.textPrimary,
    borderColor: BrandColors.textPrimary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  chipTextOn: {
    color: '#FFFFFF',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
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
  featured: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#FBDD94',
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    end: 12,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    overflow: 'hidden',
    backgroundColor: 'rgba(90,62,0,0.12)',
    color: '#5A3E00',
  },
  featuredBody: {
    flex: 1,
    minWidth: 0,
    paddingTop: Spacing.two,
  },
  featuredName: {
    fontSize: 17,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  featuredRole: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5A3E00',
    marginTop: 2,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredRating: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B4700',
  },
  list: {
    gap: Spacing.md,
  },
  message: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.five,
  },
  messageText: {
    fontSize: TypographyScale.body,
    color: BrandColors.textSecondary,
    textAlign: 'center',
  },
  noResults: {
    paddingVertical: Spacing.four,
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
  pressed: {
    opacity: 0.85,
  },
});
