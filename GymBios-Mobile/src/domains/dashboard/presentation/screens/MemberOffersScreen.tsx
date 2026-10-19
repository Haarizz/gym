import { I18nManager, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/shared/components/AppText';
import { GlassBlob, Loader } from '@/shared/components';
import { TAB_BAR_HEIGHT } from '@/shared/layouts/ScreenLayout';
import { BrandColors, Spacing, TypographyScale, Radius } from '@/core/theme';
import { useMemberOffers } from '../../hooks/useMemberOffers';
import { OfferCard } from '../components/OfferCard';

/** Every offer the member can use, best first — opened from the dashboard banner's "See all offers". */
export function MemberOffersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: offers = [], isLoading, isError, refetch, isRefetching } = useMemberOffers();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(member)' as any));

  return (
    <View style={styles.root}>
      <View style={styles.blobLayer} pointerEvents="none">
        <GlassBlob color={BrandColors.memberGold} size={320} opacity={0.38} top={-60} right={-110} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 32 }]}
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
        <View style={styles.titleRow}>
          <Pressable
            onPress={goBack}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t('memberHome.offers.back')}
          >
            <Feather name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'} size={22} color={BrandColors.textPrimary} />
          </Pressable>
          <View style={styles.titleText}>
            <Text style={styles.title} accessibilityRole="header">{t('memberHome.offers.title')}</Text>
            {!isLoading && !isError && offers.length > 0 && (
              <Text style={styles.subtitle}>{t('memberHome.offers.count', { count: offers.length })}</Text>
            )}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.message}><Loader /></View>
        ) : isError ? (
          <View style={styles.message}>
            <Text style={styles.messageText}>{t('memberHome.offers.loadFailed')}</Text>
            <Pressable onPress={() => refetch()} style={styles.retry} accessibilityRole="button">
              <Text style={styles.retryText}>{t('memberHome.offers.retry')}</Text>
            </Pressable>
          </View>
        ) : offers.length === 0 ? (
          <View style={styles.message}>
            <Feather name="gift" size={28} color={BrandColors.textSecondary} />
            <Text style={styles.messageText}>{t('memberHome.offers.empty')}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {offers.map((offer, index) => (
              <OfferCard key={offer.id} offer={offer} index={index} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
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
    height: 360,
    overflow: 'hidden',
  },
  content: {
    padding: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  back: {
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
  titleText: {
    flex: 1,
  },
  title: {
    fontSize: TypographyScale.title,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  list: {
    gap: Spacing.four,
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
