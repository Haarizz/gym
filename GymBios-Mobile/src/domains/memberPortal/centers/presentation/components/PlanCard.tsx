import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Text } from '@/shared/components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { CenterPlan } from '@/domains/discovery';

interface PlanCardProps {
  plan: CenterPlan;
  /** Called when the card is tapped — opens the plan detail sheet. */
  onViewDetails: (plan: CenterPlan) => void;
  /** Facility id → display name, so a plan's selectedFacilities read as names. */
  facilityNames?: Record<string, string>;
  /** Renders the card on the gold gradient to make it stand out. */
  featured?: boolean;
}

const GOLD_INK = '#4A3410';
const MAX_PERKS = 3;

// Short highlights only — the description and full breakdown live in the detail sheet.
function buildPerks(t: TFunction, plan: CenterPlan, facilityNames: Record<string, string>): string[] {
  const perks: string[] = [];

  const facilities = plan.selectedFacilities || [];
  const named = facilities.map((id) => facilityNames[String(id)]).filter((n): n is string => !!n);
  named.forEach((name) => perks.push(name));
  const unnamed = facilities.length - named.length;
  if (unnamed > 0) {
    perks.push(
      named.length > 0
        ? t('centers.planCard.moreFacilities', { count: unnamed })
        : t('centers.planCard.accessToFacilities', { count: unnamed }),
    );
  }

  if (plan.maxSessions) perks.push(t('centers.planCard.upToSessions', { count: plan.maxSessions }));
  if (plan.maxFreezeDays) perks.push(t('centers.planCard.freezeUpTo', { count: plan.maxFreezeDays }));

  if (perks.length === 0) perks.push(t('centers.planCard.standardFeatures'));
  return perks.slice(0, MAX_PERKS);
}

export function PlanCard({ plan, onViewDetails, facilityNames = {}, featured = false }: PlanCardProps) {
  const { t } = useTranslation();
  // The plan's running offer — priced by the server, so this is what the member pays.
  const hasOffer = plan.offerActive && plan.offerDiscountAmount > 0;
  const payPrice = hasOffer ? plan.effectivePrice : plan.price;
  const duration =
    plan.duration || [plan.durationValue, plan.durationType].filter(Boolean).join(' ');
  const perks = buildPerks(t, plan, facilityNames);
  const accent = featured ? GOLD_INK : BrandColors.teal;

  const body = (
    <>
      {featured && <View style={styles.featuredBlob} pointerEvents="none" />}

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.planName, featured && styles.inkText]}>{plan.name}</Text>
          {!!duration && (
            <Text style={[styles.durationText, featured && styles.featuredMuted]}>{duration}</Text>
          )}
          {hasOffer && (
            <View style={[styles.offerBadge, featured && styles.offerBadgeFeatured]}>
              <Text style={styles.offerText} numberOfLines={1}>
                {plan.offerLabel || t('centers.planCard.limitedOffer')}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.priceContainer}>
          <Text style={[styles.price, featured && styles.inkText]}>
            <CurrencyValue amount={payPrice} />
          </Text>
          {hasOffer && (
            <Text style={[styles.originalPrice, featured && styles.featuredFaint]}>
              <CurrencyValue amount={plan.price} />
            </Text>
          )}
        </View>
      </View>

      <View style={styles.perksList}>
        {perks.map((perk, idx) => (
          <View key={idx} style={styles.perkRow}>
            <Feather name="check-circle" size={15} color={accent} style={styles.perkIcon} />
            <Text style={[styles.perkText, featured && styles.inkText]}>{perk}</Text>
          </View>
        ))}
      </View>

      <View style={styles.moreRow}>
        <Text style={[styles.moreText, { color: accent }]}>{t('centers.planCard.viewDetails')}</Text>
        <Feather name="chevron-right" size={14} color={accent} />
      </View>
    </>
  );

  return (
    <Pressable
      onPress={() => onViewDetails(plan)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={t('centers.planCard.viewDetailsA11y', { name: plan.name })}
    >
      {featured ? (
        <LinearGradient
          colors={['#FFE9A8', '#F9C74F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.inner}
        >
          {body}
        </LinearGradient>
      ) : (
        <View style={styles.inner}>{body}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: 24,
    shadowColor: '#3C486E',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  inner: {
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
  },
  featuredBlob: {
    position: 'absolute',
    end: -50,
    top: -60,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    marginEnd: Spacing.two,
    alignItems: 'flex-start',
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  inkText: {
    color: GOLD_INK,
  },
  durationText: {
    fontSize: 13,
    color: '#5F6B7A',
    marginTop: 2,
  },
  featuredMuted: {
    color: 'rgba(74,52,16,0.75)',
  },
  featuredFaint: {
    color: 'rgba(74,52,16,0.6)',
  },
  offerBadge: {
    marginTop: Spacing.two,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: '#FFF4D6',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
  },
  offerBadgeFeatured: {
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  offerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A6200',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  originalPrice: {
    fontSize: 12,
    color: '#5F6B7A',
    textDecorationLine: 'line-through',
  },
  perksList: {
    gap: 6,
    marginTop: 12,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  perkIcon: {
    marginTop: 1,
  },
  perkText: {
    flex: 1,
    fontSize: 13,
    color: '#5F6B7A',
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 14,
  },
  moreText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
