import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/shared/components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import type { CenterPlan } from '@/domains/discovery';

interface PlanDetailSheetProps {
  plan: CenterPlan | null;
  visible: boolean;
  onClose: () => void;
  onSubscribe: (plan: CenterPlan) => void;
  /** Facility id → display name map, used to resolve selectedFacilities. */
  facilityNames?: Record<string, string>;
}

// ─── Small helpers ──────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  label,
  color = BrandColors.teal,
  bgColor = 'rgba(47,107,94,0.1)',
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color?: string;
  bgColor?: string;
}) {
  return (
    <View style={sh.sectionHeader}>
      <View style={[sh.iconBadge, { backgroundColor: bgColor }]}>
        <Feather name={icon} size={14} color={color} />
      </View>
      <Text style={sh.sectionTitle}>{label}</Text>
    </View>
  );
}

function KV({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={sh.kv}>
      <Text style={sh.kvLabel}>{label}</Text>
      <Text style={[sh.kvValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}

// ─── Sheet shell ────────────────────────────────────────────────────────────

/** Drag distance (px) past which releasing the handle dismisses the sheet. */
const DISMISS_DISTANCE = 110;

export function SheetShell({
  visible,
  title,
  subtitle,
  onClose,
  footer,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [translateY] = useState(() => new Animated.Value(windowHeight));
  const [backdrop] = useState(() => new Animated.Value(0));
  // Keeps the Modal mounted until the close animation has finished.
  const [isMounted, setIsMounted] = useState(visible);
  if (visible && !isMounted) setIsMounted(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      translateY.setValue(windowHeight);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, damping: 22, stiffness: 220, mass: 0.9, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else if (isMounted) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: windowHeight, duration: 240, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setIsMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Dragging the handle/header pulls the sheet down; past the threshold it closes.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => translateY.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > DISMISS_DISTANCE || g.vy > 1.2) {
            onClose();
          } else {
            Animated.spring(translateY, { toValue: 0, damping: 20, stiffness: 240, useNativeDriver: true }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [onClose, translateY],
  );

  if (!isMounted) return null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={sh.modalRoot}>
        <Animated.View style={[sh.scrim, { opacity: backdrop }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          />
        </Animated.View>

        <Animated.View
          style={[sh.sheet, { maxHeight: windowHeight * 0.88, transform: [{ translateY }] }]}
          accessibilityViewIsModal
        >
          <View {...panResponder.panHandlers}>
            <View style={sh.grab}>
              <View style={sh.grabBar} />
            </View>
            <View style={sh.sheetHead}>
              <View style={sh.sheetHeadText}>
                <Text style={sh.sheetTitle} accessibilityRole="header">{title}</Text>
                {!!subtitle && <Text style={sh.sheetSubtitle}>{subtitle}</Text>}
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={({ pressed }) => [sh.closeButton, pressed && sh.pressed]}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <Feather name="x" size={16} color={BrandColors.textPrimary} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={sh.sheetBody}
            contentContainerStyle={sh.sheetBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          <View style={[sh.sheetFoot, { paddingBottom: 14 + insets.bottom }]}>{footer}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function PlanDetailSheet({
  plan,
  visible,
  onClose,
  onSubscribe,
  facilityNames = {},
}: PlanDetailSheetProps) {
  const { t } = useTranslation();

  if (!plan) return null;

  const hasOffer = plan.offerActive && plan.offerDiscountAmount > 0;
  const payPrice = hasOffer ? plan.effectivePrice : plan.price;
  const duration =
    plan.duration || [plan.durationValue, plan.durationType].filter(Boolean).join(' ');

  const facilities = (plan.selectedFacilities || [])
    .map((id) => facilityNames[String(id)])
    .filter((n): n is string => !!n);

  // Attendance label
  let attendanceLabel = t('centers.planDetail.unlimited');
  if (plan.attendanceLimit && plan.attendanceLimit !== 'unlimited') {
    attendanceLabel = plan.attendanceValue
      ? `${plan.attendanceValue}${plan.attendancePeriod ? ' ' + plan.attendancePeriod : ''}`
      : plan.attendanceLimit;
  }

  const subtitle = [plan.type, plan.planType].filter(Boolean).join(' · ');

  return (
    <SheetShell
      visible={visible}
      title={plan.name}
      subtitle={subtitle || undefined}
      onClose={onClose}
      footer={
        <Pressable
          style={({ pressed }) => [sh.subscribeWrapper, pressed && sh.pressed]}
          onPress={() => onSubscribe(plan)}
          accessibilityRole="button"
          accessibilityLabel={t('centers.planCard.subscribeA11y', { name: plan.name })}
        >
          <LinearGradient
            colors={[BrandColors.memberGold, BrandColors.trainerAmber]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={sh.subscribeButton}
          >
            <Text style={sh.subscribeText}>
              {t('centers.detail.subscribe')} · <CurrencyValue amount={payPrice} />
            </Text>
          </LinearGradient>
        </Pressable>
      }
    >
      {/* ── Price highlight ─────────────────────────────────── */}
      <LinearGradient
        colors={['#FFE9A8', '#F9C74F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={sh.priceHighlight}
      >
        <View style={sh.priceBlob} pointerEvents="none" />
        <View style={sh.priceRow}>
          <View>
            <Text style={sh.priceLabel}>{t('centers.planDetail.price')}</Text>
            <Text style={sh.priceBig}>
              <CurrencyValue amount={payPrice} />
            </Text>
            {hasOffer && (
              <Text style={sh.priceWas}>
                <CurrencyValue amount={plan.price} />
              </Text>
            )}
          </View>
          <View style={sh.priceRight}>
            <Text style={sh.priceLabel}>{t('centers.planDetail.duration')}</Text>
            <Text style={sh.priceDuration}>{duration}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Facts grid ─────────────────────────────────────── */}
      <View style={sh.factsGrid}>
        <View style={sh.factItem}>
          <Text style={sh.factLabel}>{t('centers.planDetail.planGroup')}</Text>
          <Text style={sh.factValue}>{plan.type || '—'}</Text>
        </View>
        <View style={sh.factItem}>
          <Text style={sh.factLabel}>{t('centers.planDetail.membershipType')}</Text>
          <Text style={sh.factValue}>{plan.planType || '—'}</Text>
        </View>
        <View style={sh.factItem}>
          <Text style={sh.factLabel}>{t('centers.planDetail.durationType')}</Text>
          <Text style={sh.factValue}>
            {plan.durationType
              ? plan.durationType.charAt(0).toUpperCase() + plan.durationType.slice(1)
              : '—'}
          </Text>
        </View>
        <View style={sh.factItem}>
          <Text style={sh.factLabel}>{t('centers.planDetail.maxSessions')}</Text>
          <Text style={sh.factValue}>
            {plan.maxSessions != null ? String(plan.maxSessions) : t('centers.planDetail.notLimited')}
          </Text>
        </View>
      </View>

      {/* ── About this plan ────────────────────────────────── */}
      {!!plan.description && (
        <View style={sh.section}>
          <Text style={sh.sectionTitlePlain}>{t('centers.planDetail.about')}</Text>
          <Text style={sh.descText}>{plan.description}</Text>
        </View>
      )}

      {/* ── Assignable trainers ────────────────────────────── */}
      {plan.assignableTrainers && plan.assignableTrainers.length > 0 && (
        <View style={sh.section}>
          <SectionHeader
            icon="users"
            label={t('centers.planDetail.assignableTrainers')}
            color="#8B5CF6"
            bgColor="rgba(139,92,246,0.1)"
          />
          <View style={sh.chipsRow}>
            {plan.assignableTrainers.map((name, i) => (
              <View key={i} style={sh.chip}>
                <Text style={sh.chipText}>{name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Access to training ─────────────────────────────── */}
      <View style={sh.section}>
        <SectionHeader icon="key" label={t('centers.planDetail.accessToTraining')} />
        <View style={sh.kvList}>
          <KV label={t('centers.planDetail.attendance')} value={attendanceLabel} />
          <KV
            label={t('centers.planDetail.capacity')}
            value={
              plan.membershipCapacity === 'limited' && plan.maxCapacity != null
                ? t('centers.planDetail.membersCount', { count: plan.maxCapacity })
                : t('centers.planDetail.noLimit')
            }
          />
        </View>
      </View>

      {/* ── Access to facilities ────────────────────────────── */}
      <View style={sh.section}>
        <SectionHeader
          icon="grid"
          label={t('centers.planDetail.accessToFacilities')}
          color="#C27A00"
          bgColor="rgba(245,199,66,0.15)"
        />
        {facilities.length > 0 ? (
          <View style={sh.chipsRow}>
            {facilities.map((name, i) => (
              <View key={i} style={sh.chip}>
                <Text style={sh.chipText}>{name}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={sh.hintText}>{t('centers.planDetail.noFacilities')}</Text>
        )}
      </View>

      {/* ── Freeze policy ──────────────────────────────────── */}
      {(plan.maxFreezeDays != null || plan.freeDaysAllowed != null) && (
        <View style={sh.section}>
          <SectionHeader icon="pause-circle" label={t('centers.planDetail.freezePolicy')} />
          <View style={sh.kvList}>
            {plan.maxFreezeDays != null && (
              <KV
                label={t('centers.planDetail.maxFreezeDays')}
                value={t('centers.planDetail.days', { count: plan.maxFreezeDays })}
              />
            )}
            {plan.freeDaysAllowed != null && (
              <KV
                label={t('centers.planDetail.freeFreezeDays')}
                value={t('centers.planDetail.days', { count: plan.freeDaysAllowed })}
                valueColor={BrandColors.teal}
              />
            )}
            {plan.maxFreezeOccurrences != null && (
              <KV
                label={t('centers.planDetail.maxOccurrences')}
                value={`${plan.maxFreezeOccurrences} ${plan.maxFreezeOccurrences > 1 ? t('centers.planDetail.times') : t('centers.planDetail.time')}`}
              />
            )}
          </View>
          {plan.chargePerExtraDay != null && (
            <View style={sh.kv}>
              <Text style={sh.kvLabel}>{t('centers.planDetail.extraDayCharge')}</Text>
              <CurrencyValue style={sh.kvValue} amount={plan.chargePerExtraDay} />
            </View>
          )}
          <View
            style={[
              sh.autoFreezeRow,
              plan.autoUnfreeze ? sh.autoFreezeOn : sh.autoFreezeOff,
            ]}
          >
            <Feather
              name={plan.autoUnfreeze ? 'check-circle' : 'info'}
              size={14}
              color={plan.autoUnfreeze ? BrandColors.teal : '#9CA3AF'}
            />
            <Text style={[sh.autoFreezeText, plan.autoUnfreeze ? sh.autoFreezeTextOn : sh.autoFreezeTextOff]}>
              {plan.autoUnfreeze
                ? t('centers.planDetail.autoUnfreezeOn')
                : t('centers.planDetail.autoUnfreezeOff')}
            </Text>
          </View>
        </View>
      )}
    </SheetShell>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const SHEET_BG = '#F6F7FC';

const CARD_SHADOW = {
  shadowColor: '#3C486E',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;

const sh = StyleSheet.create({
  // Sheet shell
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20,26,40,0.45)',
  },
  sheet: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#141A28',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -10 },
    elevation: 16,
  },
  grab: {
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: 'center',
  },
  grabBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CDD2DE',
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 6,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  sheetHeadText: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#5F6B7A',
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BrandColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...CARD_SHADOW,
  },
  sheetBody: {
    flexGrow: 0,
  },
  sheetBodyContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sheetFoot: {
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: SHEET_BG,
    borderTopWidth: 1,
    borderTopColor: '#ECEEF5',
  },

  // Subscribe footer
  subscribeWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: BrandColors.trainerAmber,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  subscribeButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeText: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },

  // Price highlight
  priceHighlight: {
    borderRadius: 22,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    overflow: 'hidden',
  },
  priceBlob: {
    position: 'absolute',
    end: -40,
    top: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(74,52,16,0.75)',
    marginBottom: 2,
  },
  priceBig: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4A3410',
    lineHeight: 32,
  },
  priceWas: {
    fontSize: 12,
    color: 'rgba(74,52,16,0.6)',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  priceRight: {
    alignItems: 'flex-end',
  },
  priceDuration: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4A3410',
  },

  // Facts grid
  factsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: Spacing.three,
  },
  factItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: BrandColors.surface,
    borderRadius: 16,
    padding: Spacing.three,
    ...CARD_SHADOW,
  },
  factLabel: {
    fontSize: 11,
    color: BrandColors.textSecondary,
    marginBottom: 2,
  },
  factValue: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },

  // Section
  section: {
    backgroundColor: BrandColors.surface,
    borderRadius: 20,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    ...CARD_SHADOW,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  sectionTitlePlain: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.two,
  },
  descText: {
    fontSize: 13,
    lineHeight: 20,
    color: BrandColors.textSecondary,
  },

  // KV list
  kvList: {
    gap: 0,
  },
  kv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.07)',
  },
  kvLabel: {
    fontSize: 13,
    color: BrandColors.textSecondary,
  },
  kvValue: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },

  // Chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(47,107,94,0.08)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.tealDark,
  },

  // Hint
  hintText: {
    fontSize: 12,
    color: BrandColors.textSecondary,
  },

  // Auto unfreeze row
  autoFreezeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  autoFreezeOn: {
    backgroundColor: 'rgba(47,107,94,0.08)',
  },
  autoFreezeOff: {
    backgroundColor: '#F9FAFB',
  },
  autoFreezeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  autoFreezeTextOn: {
    color: BrandColors.teal,
  },
  autoFreezeTextOff: {
    color: '#9CA3AF',
  },
});
