import { Pressable, StyleSheet, View } from 'react-native';
import { Trans, useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Text } from '@/shared/components/AppText';
import { formatDate } from '@/core/i18n';
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

type FeatherName = keyof typeof Feather.glyphMap;

const BENEFIT_STYLE: Record<string, { icon: FeatherName; color: string; bg: string }> = {
  access:     { icon: 'activity',    color: '#0D9488', bg: 'rgba(13,148,136,0.12)' },
  facilities: { icon: 'grid',        color: '#0284C7', bg: 'rgba(2,132,199,0.12)' },
  sessions:   { icon: 'award',       color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
  trainers:   { icon: 'users',       color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
  streams:    { icon: 'video',       color: '#E11D48', bg: 'rgba(225,29,72,0.12)' },
  addon:      { icon: 'plus-circle', color: '#D97706', bg: 'rgba(217,119,6,0.12)' },
  plan_notes: { icon: 'file-text',   color: BrandColors.teal, bg: 'rgba(27,90,76,0.12)' },
};
const DEFAULT_STYLE = { icon: 'check-circle' as FeatherName, color: BrandColors.teal, bg: 'rgba(27,90,76,0.12)' };

const PERIODS = ['Payment', 'Week', 'Month', 'Year'] as const;

interface BenefitView {
  title: string;
  description?: string | null;
  meta?: string;
  /** 0–1 share of a limited access allowance already used. */
  progress?: number;
}

/** Builds the translated text for a benefit from its type and raw values. */
function describeBenefit(b: BenefitInfo, t: TFunction): BenefitView {
  const fallback = { title: b.name, description: b.description };
  switch (b.type) {
    case 'access': {
      if (b.count == null) return fallback;
      if (!b.unit) {
        return {
          title: t('membership.benefits.access.unlimitedTitle'),
          description: t('membership.benefits.access.unlimitedDesc', { count: b.count }),
        };
      }
      const period = PERIODS.find(p => p === b.period) ?? 'Payment';
      const used = b.used ?? 0;
      const amount = t(`membership.benefits.access.amount.${b.unit}`, { count: b.count });
      return {
        title: t(`membership.benefits.access.title.${period}`, { amount }),
        description: t(`membership.benefits.access.usage.${period}`, {
          used,
          left: Math.max(0, b.count - used),
        }),
        progress: b.count > 0 ? Math.min(1, used / b.count) : undefined,
      };
    }
    case 'facilities':
      return { title: t('membership.benefits.facilitiesTitle') };
    case 'sessions':
      if (b.count == null) return fallback;
      return {
        title: t('membership.benefits.sessionsTitle', { count: b.count }),
        description: b.items?.length ? t('membership.benefits.sessionsTrainers') : null,
      };
    case 'trainers':
      return { title: t('membership.benefits.trainersTitle'), description: t('membership.benefits.trainersDesc') };
    case 'streams':
      return { title: t('membership.benefits.streamsTitle') };
    case 'addon':
      return {
        title: b.name,
        description: b.description,
        meta: b.expires_at
          ? `${t('membership.benefits.addonLabel')} · ${t('membership.benefits.addonUntil', { date: formatDate(b.expires_at, 'PP') })}`
          : t('membership.benefits.addonLabel'),
      };
    case 'plan_notes':
      return { title: t('membership.benefits.planNotesTitle'), description: b.description };
    default:
      return fallback;
  }
}

export function MembershipBenefitsTab({
  membership,
  onClaimOffer,
  onOpenFreeze,
}: MembershipBenefitsTabProps) {
  const { t } = useTranslation();
  const benefits = membership.benefits ?? [];

  return (
    <View style={styles.container}>
      {/* Plan Benefits — only what the plan and active add-ons actually include */}
      <GlassSurface radius={Radius.lg} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{t('membership.benefits.title')}</Text>
          {benefits.length > 0 && (
            <Text style={styles.cardSubtitle}>
              {t('membership.benefits.subtitle', { plan: membership.type })}
            </Text>
          )}
        </View>

        {benefits.length > 0 ? (
          <View style={styles.benefitsGrid}>
            {benefits.map((benefit) => {
              const view = describeBenefit(benefit, t);
              const look = BENEFIT_STYLE[benefit.type ?? ''] ?? DEFAULT_STYLE;
              const items = benefit.type === 'addon' ? [] : benefit.items ?? [];
              return (
                <View key={benefit.id} style={styles.benefitCard}>
                  <View style={[styles.iconCircle, { backgroundColor: look.bg }]}>
                    <Feather name={look.icon} size={18} color={look.color} />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitName}>{view.title}</Text>
                    {view.meta ? <Text style={[styles.benefitMeta, { color: look.color }]}>{view.meta}</Text> : null}
                    {view.description ? <Text style={styles.benefitDesc}>{view.description}</Text> : null}
                    {view.progress != null && (
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${view.progress * 100}%`, backgroundColor: look.color },
                          ]}
                        />
                      </View>
                    )}
                    {items.length > 0 && (
                      <View style={styles.chips}>
                        {items.map(item => (
                          <View key={item} style={styles.chip}>
                            <Text style={styles.chipText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>{t('membership.benefits.empty')}</Text>
        )}
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
    marginBottom: Spacing.three,
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
    gap: 3,
  },
  benefitName: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  benefitMeta: {
    fontSize: 11,
    fontWeight: '700',
  },
  benefitDesc: {
    fontSize: 12,
    color: BrandColors.textSecondary,
    lineHeight: 17,
    fontWeight: '400',
  },
  progressTrack: {
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    marginTop: Spacing.one,
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.one,
  },
  chip: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    fontStyle: 'italic',
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
