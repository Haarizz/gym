import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Trans, useTranslation } from 'react-i18next';
import { Text } from '@/shared/components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { GlassSurface } from '@/shared/components';
import type { BenefitInfo } from '../../domain/models';
import type { MembershipDetails } from './MembershipStatusCard';

// Purple gradient glass (offer banner)
const PURPLE_START = 'rgba(124,58,237,0.82)';
const PURPLE_END   = 'rgba(109,40,217,0.68)';

interface MembershipBenefitsTabProps {
  membership: MembershipDetails;
  onClaimOffer: () => void;
  onOpenFreeze: () => void;
}

interface EnrichedBenefit {
  id: string;
  name: string;
  description: string;
  iconName: keyof typeof Feather.glyphMap;
  category: string;
  color: string;
  bgColor: string;
}

function resolveIconAndCategory(id?: string, icon?: string): {
  iconName: keyof typeof Feather.glyphMap;
  category: string;
  color: string;
  bgColor: string;
} {
  const normalizedId = (id || '').toLowerCase();

  if (icon && icon in Feather.glyphMap) {
    return {
      iconName: icon as keyof typeof Feather.glyphMap,
      category: 'Perk',
      color: BrandColors.teal,
      bgColor: 'rgba(27,90,76,0.12)',
    };
  }

  if (normalizedId.includes('attend') || normalizedId.includes('access')) {
    return {
      iconName: 'activity',
      category: 'Access',
      color: '#0D9488',
      bgColor: 'rgba(13,148,136,0.12)',
    };
  }

  if (normalizedId.includes('facil') || normalizedId.includes('shower') || normalizedId.includes('locker')) {
    return {
      iconName: 'droplet',
      category: 'Amenities',
      color: '#0284C7',
      bgColor: 'rgba(2,132,199,0.12)',
    };
  }

  if (normalizedId.includes('session') || normalizedId.includes('coach') || normalizedId.includes('train')) {
    return {
      iconName: 'award',
      category: 'Coaching',
      color: '#7C3AED',
      bgColor: 'rgba(124,58,237,0.12)',
    };
  }

  if (normalizedId.includes('class') || normalizedId.includes('stream')) {
    return {
      iconName: 'calendar',
      category: 'Classes',
      color: '#E11D48',
      bgColor: 'rgba(225,29,72,0.12)',
    };
  }

  if (normalizedId.includes('freeze')) {
    return {
      iconName: 'pause-circle',
      category: 'Flexibility',
      color: '#D97706',
      bgColor: 'rgba(217,119,6,0.12)',
    };
  }

  if (normalizedId.includes('digital') || normalizedId.includes('app')) {
    return {
      iconName: 'smartphone',
      category: 'Privileges',
      color: '#059669',
      bgColor: 'rgba(5,150,105,0.12)',
    };
  }

  return {
    iconName: 'check-circle',
    category: 'Perk',
    color: BrandColors.teal,
    bgColor: 'rgba(27,90,76,0.12)',
  };
}

export function MembershipBenefitsTab({
  membership,
  onClaimOffer,
  onOpenFreeze,
}: MembershipBenefitsTabProps) {
  const { t } = useTranslation();

  const benefitsList = useMemo<EnrichedBenefit[]>(() => {
    const rawBenefits: (BenefitInfo | string)[] = membership.benefits || [];

    // If backend already provided rich structured benefits (more than 1 or with descriptions)
    const hasRichBackendData =
      rawBenefits.length > 1 ||
      (rawBenefits.length === 1 &&
        typeof rawBenefits[0] === 'object' &&
        !!rawBenefits[0].description);

    if (hasRichBackendData) {
      return rawBenefits.map((item, index) => {
        const id = typeof item === 'object' ? item.id || `b_${index}` : `b_${index}`;
        const name = typeof item === 'object' ? item.name : String(item);
        const description =
          typeof item === 'object' && item.description
            ? item.description
            : 'Included as part of your active membership subscription.';
        const { iconName, category, color, bgColor } = resolveIconAndCategory(
          id,
          typeof item === 'object' ? item.icon : undefined
        );

        return {
          id,
          name,
          description,
          iconName,
          category: (typeof item === 'object' && item.category) || category,
          color,
          bgColor,
        };
      });
    }

    // Fallback/enrichment: When a plan in database has sparse data (e.g. only "Unlimited Access" with no description)
    const attendanceName =
      rawBenefits.length > 0
        ? typeof rawBenefits[0] === 'object'
          ? rawBenefits[0].name
          : String(rawBenefits[0])
        : 'Unlimited Gym Floor Access';

    const enriched: EnrichedBenefit[] = [
      {
        id: 'attendance',
        name: attendanceName,
        description: 'Full access to cardio, strength equipment, and functional workout areas during club hours.',
        iconName: 'activity',
        category: 'Access',
        color: '#0D9488',
        bgColor: 'rgba(13,148,136,0.12)',
      },
      {
        id: 'facilities',
        name: 'Locker & Shower Facilities',
        description: 'Complimentary day lockers, private changing rooms, and hot showers.',
        iconName: 'droplet',
        category: 'Amenities',
        color: '#0284C7',
        bgColor: 'rgba(2,132,199,0.12)',
      },
      {
        id: 'coaching',
        name: 'Floor Trainer Support',
        description: 'Certified fitness coaches available on the gym floor for exercise orientation and form checks.',
        iconName: 'award',
        category: 'Coaching',
        color: '#7C3AED',
        bgColor: 'rgba(124,58,237,0.12)',
      },
    ];

    if (membership.freezeAvailable && membership.freezeDaysAllowed > 0) {
      enriched.push({
        id: 'freeze',
        name: 'Complimentary Freeze Allowance',
        description: `Pause your membership up to ${membership.freezeDaysAllowed} free days when traveling or recovering.`,
        iconName: 'pause-circle',
        category: 'Flexibility',
        color: '#D97706',
        bgColor: 'rgba(217,119,6,0.12)',
      });
    }

    enriched.push({
      id: 'digital',
      name: 'GymBios Digital Access',
      description: 'Contactless QR check-in, workout tracking, community challenges, and digital billing.',
      iconName: 'smartphone',
      category: 'Privileges',
      color: '#059669',
      bgColor: 'rgba(5,150,105,0.12)',
    });

    return enriched;
  }, [membership]);

  return (
    <View style={styles.container}>
      {/* Plan Benefits — rich glass card */}
      <GlassSurface radius={Radius.lg} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderTitleWrap}>
            <Text style={styles.cardTitle}>{t('membership.benefits.title')}</Text>
            <Text style={styles.cardSubtitle}>
              {membership.type ? `${membership.type} · Included Perks` : 'Included with your membership'}
            </Text>
          </View>
          <View style={styles.badgeIncluded}>
            <Feather name="check" size={11} color={BrandColors.teal} />
            <Text style={styles.badgeIncludedText}>ACTIVE</Text>
          </View>
        </View>

        <View style={styles.benefitsGrid}>
          {benefitsList.map((item) => (
            <View key={item.id} style={styles.benefitCard}>
              <View style={[styles.iconCircle, { backgroundColor: item.bgColor }]}>
                <Feather name={item.iconName} size={18} color={item.color} />
              </View>
              <View style={styles.benefitContent}>
                <View style={styles.benefitTopRow}>
                  <Text style={styles.benefitName}>{item.name}</Text>
                  {item.category ? (
                    <View style={styles.categoryPill}>
                      <Text style={styles.categoryPillText}>{item.category.toUpperCase()}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.benefitDesc}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </GlassSurface>

      {/* Freeze Info — info-banner recipe from reference */}
      {membership.freezeAvailable && (
        <View style={styles.freezeCard}>
          <View style={styles.freezeIconCircle}>
            <Feather name="pause-circle" size={18} color="#2563EB" />
          </View>
          <View style={styles.freezeInfo}>
            <Text style={styles.freezeTitle}>{t('membership.benefits.freezeTitle')}</Text>
            <Text style={styles.freezeDesc}>
              {t('membership.benefits.freezeDescription', { count: membership.freezeDaysAllowed })}
            </Text>
            <Pressable hitSlop={8} onPress={onOpenFreeze} style={styles.freezeLink}>
              <Text style={styles.freezeLinkText}>{t('membership.benefits.freezeLink')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Early Renewal Banner — purple glass */}
      {membership.renewalOfferAvailable && (
        <View style={styles.offerBanner}>
          <LinearGradient
            colors={[PURPLE_START, PURPLE_END]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Shine overlay */}
          <View pointerEvents="none" style={styles.shineOverlay} />

          <View style={styles.offerHeader}>
            <View style={styles.offerIconBox}>
              <Feather name="gift" size={15} color="#FFFFFF" />
            </View>
            <Text style={styles.offerTitle}>{t('membership.benefits.offerTitle')}</Text>
          </View>
          <Text style={styles.offerDesc}>
            <Trans
              i18nKey="membership.benefits.offerDescription"
              components={{ amount: <CurrencyValue amount={6000} /> }}
            />
          </Text>
          <Pressable
            style={({ pressed }) => [styles.claimButton, pressed && styles.claimButtonPressed]}
            onPress={onClaimOffer}
            accessibilityRole="button"
            accessibilityLabel={t('membership.benefits.offerA11y')}
          >
            <Text style={styles.claimButtonText}>{t('membership.benefits.offerCta')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  card: {
    padding: Spacing.four,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
    gap: Spacing.two,
  },
  cardHeaderTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: BrandColors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  badgeIncluded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(27,90,76,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(27,90,76,0.2)',
  },
  badgeIncludedText: {
    fontSize: 10,
    fontWeight: '800',
    color: BrandColors.teal,
    letterSpacing: 0.5,
  },
  benefitsGrid: {
    gap: Spacing.three,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginBottom: 3,
  },
  benefitName: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    flex: 1,
  },
  categoryPill: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: BrandColors.textSecondary,
    letterSpacing: 0.4,
  },
  benefitDesc: {
    fontSize: 12,
    color: BrandColors.textSecondary,
    lineHeight: 17,
    fontWeight: '400',
  },
  // Freeze info-banner
  freezeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    backgroundColor: 'rgba(120,170,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(120,170,255,0.42)',
    borderRadius: Radius.lg,
    padding: Spacing.four,
  },
  freezeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(120,170,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  freezeInfo: {
    flex: 1,
  },
  freezeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2451A6',
    marginBottom: 3,
  },
  freezeDesc: {
    fontSize: 12,
    color: '#3E5C93',
    lineHeight: 17,
    fontWeight: '500',
  },
  freezeLink: {
    marginTop: Spacing.two,
  },
  freezeLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  // Offer banner — purple glass
  offerBanner: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: 'rgba(109,40,217,0.45)',
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
    position: 'relative',
  },
  shineOverlay: {
    position: 'absolute',
    top: '-40%',
    left: '-15%',
    width: '55%',
    height: '180%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    transform: [{ rotate: '22deg' }],
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  offerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerTitle: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  offerDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 19,
    marginBottom: Spacing.three,
    fontWeight: '500',
  },
  claimButton: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.full,
  },
  claimButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  claimButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6D28D9',
  },
});
