import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { Trans, useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/shared/components/AppText';
import { formatClockTime, formatDate } from '@/core/i18n';
import Feather from '@expo/vector-icons/Feather';
import { useQueryClient } from '@tanstack/react-query';
import { BrandColors, Colors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { CurrencyValue } from '@/core/providers';
import { toast } from '@/shared/components/Toasts/toastStore';
import { PaymentBottomSheet } from '@/shared/payment';
import type { PaymentResult } from '@/shared/payment/types';
import { queryKeys, useAvailableClasses, useCreateMemberBooking } from '../../hooks/useMemberBookings';
import { useMyWallet } from '../../../wallet/useMyWallet';
import {
  RewardPassPicker,
  selectionDiscount,
  type RewardSelection,
} from '@/domains/member-referrals/presentation/components/RewardPassPicker';
import { discountCodeApi } from '@/domains/member-referrals/infrastructure/discountCodeApi';
import type { PassContext } from '@/domains/member-referrals/domain/types';
import type { AvailableClassData, SessionType } from '../../domain/MemberBookingData';
import { formatRefundDeadline, REFUND_CUTOFF_HOURS } from '../../domain/refundPolicy';

interface BookClassModalProps {
  visible: boolean;
  onClose: () => void;
  /** A promotion code to fill in and apply on a priced session, e.g. from the dashboard's offer */
  promoCode?: string;
}

const formatTime = formatClockTime;

const SESSION_TYPES: SessionType[] = ['class', 'pt', 'facility'];

// Mirrors the backend's PassContext.forSessionType — facility sessions take no Reward Pass.
function passContextFor(type: SessionType | undefined): PassContext | null {
  if (type === 'pt') return 'PT';
  if (type === 'class') return 'CLASS';
  return null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// select → review (discount, wallet, refund policy) → pay (shared PaymentBottomSheet).
type Step = 'select' | 'review' | 'pay';

export function BookClassModal({ visible, onClose, promoCode }: BookClassModalProps) {
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('select');
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [selected, setSelected] = useState<AvailableClassData | null>(null);
  // A Reward Pass or a promo/referral code — at most one.
  const [rewardSel, setRewardSel] = useState<RewardSelection>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);

  const dates = useMemo(() => [0, 1, 2, 3, 4].map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return {
      offset,
      dayName: offset === 0 ? t('bookings.book.today') : formatDate(d, 'EEE'),
      dateNum: d.getDate(),
      isoString: d.toISOString().split('T')[0],
    };
    // Day names follow the app language.
  }), [t, i18n.language]);

  const selectedDate = dates.find((d) => d.offset === selectedDayOffset) ?? dates[0];

  const { data: availableClasses, isLoading, isError } = useAvailableClasses(selectedDate.isoString);
  const { mutate: createBooking, isPending: isCreating } = useCreateMemberBooking();
  const { data: wallet } = useMyWallet(visible);

  // ── Pricing (display only — the server re-prices and refuses a mismatch) ──
  const price = selected?.price ?? 0;
  const isPriced = price > 0;
  const passContext = passContextFor(selected?.type);
  // A Free PT / Class pass covers the whole session.
  const discount = rewardSel?.kind === 'pass' ? price : selectionDiscount(rewardSel, price);
  const net = round2(Math.max(0, price - discount));
  const walletBalance = wallet?.balance ?? 0;
  const walletApplied = useWallet ? round2(Math.min(walletBalance, net)) : 0;
  const toPay = round2(net - walletApplied);
  const deadline = formatRefundDeadline(selected?.refundDeadline);
  const refundable = selected?.refundableIfBookedNow ?? true;

  const reset = () => {
    setStep('select');
    setSelected(null);
    setRewardSel(null);
    setUseWallet(false);
    setPolicyAccepted(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = (payment?: PaymentResult) => {
    if (!selected) return;
    createBooking(
      {
        classId: selected.classId,
        rewardPassId: rewardSel?.kind === 'pass' ? rewardSel.pass.id : undefined,
        couponCode: rewardSel?.kind === 'coupon' ? rewardSel.coupon.code : undefined,
        walletAmount: walletApplied > 0 ? walletApplied : undefined,
        expectedAmount: isPriced ? net : undefined,
        paymentMethodUsed: payment?.paymentMethodUsed,
        paymentBreakdown: payment?.paymentBreakdown,
        bankAccountCode: payment?.bankAccountCode,
        bankAccountName: payment?.bankAccountName,
        paymentDueDate: payment?.summary.paymentDueDate,
      },
      {
        onSuccess: (booking) => {
          if (booking.status?.toUpperCase() === 'PENDING_APPROVAL') {
            toast.success(
              t('bookings.book.awaitingApprovalMessage', {
                name: selected.className,
                method: payment?.paymentMethodUsed ?? '',
              }),
              { title: t('bookings.book.awaitingApprovalTitle'), duration: 5000 },
            );
          } else {
            toast.success(t('bookings.book.confirmedMessage', { name: selected.className }), {
              title: t('bookings.book.confirmedTitle'),
            });
          }
          close();
        },
        onError: (err: any) => {
          if (err?.body?.error === 'SESSION_FULL') {
            // Someone took the last seat while this member was paying — nothing was charged.
            queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'availableClasses'] });
            toast.error(t('bookings.book.classFullMessage'), {
              title: t('bookings.book.classFullTitle'),
              duration: 5000,
            });
            reset();
            return;
          }
          toast.error(err?.message || t('bookings.book.failedMessage'), { title: t('bookings.book.failedTitle') });
          setStep('review');
        },
      },
    );
  };

  const onContinueFromReview = () => {
    if (toPay > 0) setStep('pay');
    else submit();
  };

  const reviewBlocked = isPriced && !policyAccepted;

  return (
    <>
      <Modal visible={visible && step !== 'pay'} animationType="slide" transparent statusBarTranslucent onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                {step === 'review' && (
                  <Pressable hitSlop={12} onPress={() => setStep('select')} style={styles.backButton}>
                    <Feather name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'} size={20} color={BrandColors.textPrimary} />
                  </Pressable>
                )}
                <View style={styles.headerText}>
                  <Text style={styles.title}>{step === 'review' ? t('bookings.book.reviewTitle') : t('bookings.book.title')}</Text>
                  <Text style={styles.subtitle}>
                    {step === 'review' ? selected?.className : t('bookings.book.subtitle')}
                  </Text>
                </View>
              </View>
              <Pressable hitSlop={12} onPress={close} style={styles.closeButton}>
                <Feather name="x" size={20} color={BrandColors.textPrimary} />
              </Pressable>
            </View>

            {step === 'select' ? (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
                {/* Date Selector */}
                <Text style={styles.sectionTitle}>{t('bookings.book.selectDate')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datesRow}>
                  {dates.map((item) => {
                    const isSelected = selectedDayOffset === item.offset;
                    return (
                      <Pressable
                        key={item.offset}
                        style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                        onPress={() => {
                          setSelectedDayOffset(item.offset);
                          setSelected(null);
                        }}
                      >
                        <Text style={[styles.dayName, isSelected && styles.textSelected]}>{item.dayName}</Text>
                        <Text style={[styles.dateNum, isSelected && styles.textSelected]}>{item.dateNum}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Class Selector */}
                <Text style={[styles.sectionTitle, { marginTop: Spacing.four }]}>{t('bookings.book.availableSessions')}</Text>
                <View style={styles.classList}>
                  {isLoading && (
                    <View style={styles.centerContainer}>
                      <ActivityIndicator size="large" color={BrandColors.memberGold} />
                    </View>
                  )}
                  {isError && (
                    <View style={styles.centerContainer}>
                      <Text style={styles.errorText}>{t('bookings.book.loadError')}</Text>
                    </View>
                  )}
                  {!isLoading && !isError && (!availableClasses || availableClasses.length === 0) && (
                    <View style={styles.centerContainer}>
                      <Text style={styles.emptyText}>{t('bookings.book.empty')}</Text>
                    </View>
                  )}
                  {!isLoading && !isError && availableClasses?.map((cls) => {
                    const isSelected = selected?.classId === cls.classId;
                    const isBooked = !!cls.memberBookingState;
                    // null spots = no capacity limit.
                    const isFull = cls.availableSpots != null && cls.availableSpots <= 0;
                    const isDisabled = isBooked || isFull;
                    const fewLeft = cls.availableSpots != null && cls.availableSpots > 0 && cls.availableSpots <= 3;

                    return (
                      <Pressable
                        key={cls.classId}
                        disabled={isDisabled}
                        accessibilityState={{ disabled: isDisabled, selected: isSelected }}
                        style={[
                          styles.classCard,
                          isSelected && styles.classCardSelected,
                          isFull && styles.classCardFull,
                          isDisabled && !isSelected && styles.classCardDisabled,
                        ]}
                        onPress={() => {
                          if (passContextFor(cls.type) !== passContext) setRewardSel(null);
                          setSelected(cls);
                        }}
                      >
                        <View style={styles.classInfo}>
                          {cls.type && SESSION_TYPES.includes(cls.type) && (
                            <Text style={styles.typeBadge}>{t(`bookings.book.types.${cls.type}`)}</Text>
                          )}
                          <Text style={[styles.className, isSelected && styles.classNameSelected]}>
                            {cls.className}
                          </Text>
                          <Text style={styles.classDetails}>
                            {cls.trainerName
                              ? t('bookings.book.withTrainerDuration', { name: cls.trainerName, minutes: cls.durationMinutes })
                              : cls.type === 'facility'
                                ? t('bookings.book.duration', { minutes: cls.durationMinutes })
                                : t('bookings.book.withInstructorDuration', { minutes: cls.durationMinutes })}
                          </Text>
                          <View style={styles.locationTag}>
                            <Feather name="map-pin" size={11} color={BrandColors.textSecondary} />
                            <Text style={styles.locationText}>{cls.location || t('bookings.book.noLocation')}</Text>
                          </View>

                          {isBooked ? (
                            <Text style={styles.statusTextBooked}>{t('bookings.book.alreadyBooked')}</Text>
                          ) : isFull ? (
                            <View style={styles.fullBadge}>
                              <Feather name="slash" size={11} color={Colors.light.error} />
                              <Text style={styles.fullBadgeText}>{t('bookings.book.classFull')}</Text>
                            </View>
                          ) : cls.availableSpots != null ? (
                            <Text style={[styles.spotsText, fewLeft && styles.spotsTextFew]}>
                              {t('bookings.book.spotsLeft', { count: cls.availableSpots })}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.rightColumn}>
                          <View style={styles.timeTag}>
                            <Text style={styles.timeTagText}>{formatTime(cls.startTime)}</Text>
                          </View>
                          {cls.price && cls.price > 0 ? (
                            <CurrencyValue style={styles.priceText} amount={cls.price} />
                          ) : (
                            <Text style={styles.freeText}>{t('bookings.book.free')}</Text>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
                {selected && (
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryName}>{selected.className}</Text>
                    <Text style={styles.classDetails}>
                      {formatDate(selected.date, 'PP')} • {formatTime(selected.startTime)} •{' '}
                      {t('bookings.book.duration', { minutes: selected.durationMinutes })}
                    </Text>
                    {selected.trainerName ? (
                      <Text style={styles.classDetails}>{t('bookings.withTrainer', { name: selected.trainerName })}</Text>
                    ) : null}
                  </View>
                )}

                {isPriced ? (
                  <>
                    <RewardPassPicker
                      passContext={passContext}
                      value={rewardSel}
                      onChange={setRewardSel}
                      acceptPromotions
                      validateCode={(code) => discountCodeApi.validate(code, price)}
                      initialCode={promoCode}
                    />

                    <View style={styles.priceCard}>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>{t('bookings.book.sessionPrice')}</Text>
                        <CurrencyValue style={styles.priceValue} amount={price} />
                      </View>
                      {discount > 0 && (
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>
                            {rewardSel?.kind === 'pass'
                              ? t('bookings.book.rewardPass')
                              : rewardSel?.kind === 'coupon' && rewardSel.coupon.source === 'PROMOTION'
                                ? rewardSel.coupon.name || t('bookings.book.promotion')
                                : t('bookings.book.coupon')}
                          </Text>
                          <CurrencyValue style={styles.discountText} amount={-discount} />
                        </View>
                      )}
                      {walletBalance > 0 && net > 0 && (
                        <View style={styles.walletRow}>
                          <View style={styles.walletText}>
                            <Text style={styles.priceLabel}>{t('bookings.book.useWallet')}</Text>
                            <Text style={styles.walletHint}>
                              <Trans
                                i18nKey="bookings.book.walletAvailable"
                                components={{ amount: <CurrencyValue amount={walletBalance} /> }}
                              />
                            </Text>
                          </View>
                          <Switch
                            value={useWallet}
                            onValueChange={setUseWallet}
                            trackColor={{ true: BrandColors.memberGold, false: '#CBD5E1' }}
                          />
                        </View>
                      )}
                      {walletApplied > 0 && (
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>{t('bookings.book.fromWallet')}</Text>
                          <CurrencyValue style={styles.discountText} amount={-walletApplied} />
                        </View>
                      )}
                      <View style={styles.divider} />
                      <View style={styles.priceRow}>
                        <Text style={styles.totalLabel}>{t('bookings.book.totalToPay')}</Text>
                        <CurrencyValue style={styles.totalValue} amount={toPay} />
                      </View>
                    </View>

                    {/* Refund policy — must be acknowledged before paying. */}
                    <View style={[styles.policyCard, !refundable && styles.policyCardWarning]}>
                      <View style={styles.policyHeader}>
                        <Feather
                          name={refundable ? 'info' : 'alert-triangle'}
                          size={16}
                          color={refundable ? BrandColors.teal : Colors.light.error}
                        />
                        <Text style={styles.policyTitle}>{t('bookings.book.cancellationPolicy')}</Text>
                      </View>
                      {refundable ? (
                        <Text style={styles.policyText}>
                          <Trans
                            i18nKey={
                              rewardSel?.kind === 'pass' && net === 0
                                ? 'bookings.book.policyRefundablePass'
                                : 'bookings.book.policyRefundable'
                            }
                            values={{
                              deadline: deadline ?? t('bookings.book.hoursBeforeSession', { hours: REFUND_CUTOFF_HOURS }),
                              hours: REFUND_CUTOFF_HOURS,
                            }}
                            components={{ b: <Text style={styles.policyStrong} /> }}
                          />
                        </Text>
                      ) : (
                        <Text style={styles.policyText}>
                          <Trans
                            i18nKey="bookings.book.policyNotRefundable"
                            values={{ hours: REFUND_CUTOFF_HOURS }}
                            components={{ b: <Text style={styles.policyStrong} /> }}
                          />
                        </Text>
                      )}
                      <Pressable
                        style={styles.checkRow}
                        onPress={() => setPolicyAccepted((v) => !v)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: policyAccepted }}
                      >
                        <Feather
                          name={policyAccepted ? 'check-square' : 'square'}
                          size={18}
                          color={policyAccepted ? BrandColors.memberGold : BrandColors.textSecondary}
                        />
                        <Text style={styles.checkText}>{t('bookings.book.acceptPolicy')}</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <View style={styles.priceCard}>
                    <View style={styles.priceRow}>
                      <Text style={styles.totalLabel}>{t('bookings.book.price')}</Text>
                      <Text style={styles.freeTotal}>{t('bookings.book.free')}</Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={[styles.footer, { paddingBottom: Math.max(Spacing.four, insets.bottom + Spacing.two) }]}>
              {step === 'select' ? (
                <Pressable
                  style={[styles.confirmButton, !selected && styles.confirmButtonDisabled]}
                  onPress={() => setStep('review')}
                  disabled={!selected}
                >
                  <Text style={styles.confirmButtonText}>{t('bookings.book.continue')}</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.confirmButton, (reviewBlocked || isCreating) && styles.confirmButtonDisabled]}
                  onPress={onContinueFromReview}
                  disabled={reviewBlocked || isCreating}
                >
                  {isCreating ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : toPay > 0 ? (
                    <Text style={styles.confirmButtonText}>
                      <Trans
                        i18nKey="bookings.book.continueToPayment"
                        components={{ amount: <CurrencyValue amount={toPay} /> }}
                      />
                    </Text>
                  ) : (
                    <Text style={styles.confirmButtonText}>{t('bookings.book.confirmBooking')}</Text>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {selected && (
        <PaymentBottomSheet
          visible={visible && step === 'pay'}
          amount={toPay}
          title={selected.className}
          subtitle={`${formatDate(selected.date, 'PP')} • ${formatTime(selected.startTime)}`}
          allowDiscount={false}
          isProcessing={isCreating}
          onClose={() => setStep('review')}
          onComplete={(result) => submit(result)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: BrandColors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '85%',
    paddingTop: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  headerText: {
    flex: 1,
  },
  backButton: {
    padding: 6,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.screenBackground,
  },
  title: {
    fontSize: TypographyScale.title,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.screenBackground,
  },
  body: {
    padding: Spacing.four,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.two,
  },
  datesRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dateCard: {
    width: 64,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.screenBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  dateCardSelected: {
    backgroundColor: BrandColors.memberGold,
    borderColor: BrandColors.memberGold,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  dateNum: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    marginTop: 2,
  },
  textSelected: {
    color: '#FFFFFF',
  },
  classList: {
    gap: Spacing.two + 2,
    paddingBottom: Spacing.four,
  },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.screenBackground,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  classCardSelected: {
    borderColor: BrandColors.memberGold,
    backgroundColor: '#FEFCE8',
  },
  classCardFull: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  classCardDisabled: {
    opacity: 0.6,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: BrandColors.teal,
    marginBottom: 2,
  },
  classNameSelected: {
    color: BrandColors.memberGold,
  },
  classDetails: {
    fontSize: TypographyScale.small,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 11,
    color: BrandColors.textSecondary,
  },
  statusTextBooked: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.teal,
    marginTop: 4,
  },
  fullBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: '#FEE2E2',
  },
  fullBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.error,
  },
  spotsText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.textSecondary,
    marginTop: 4,
  },
  spotsTextFew: {
    color: BrandColors.trainerAmber,
  },
  rightColumn: {
    alignItems: 'flex-end',
    gap: Spacing.one + 2,
    marginStart: Spacing.two,
  },
  timeTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.sm,
  },
  timeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.trainerAmber,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  freeText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.teal,
  },
  centerContainer: {
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: Colors.light.error,
    fontSize: 14,
  },
  emptyText: {
    color: BrandColors.textSecondary,
    fontSize: 14,
  },
  summaryCard: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.screenBackground,
    marginBottom: Spacing.four,
  },
  summaryName: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  priceCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: Spacing.four,
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: BrandColors.textSecondary,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  discountText: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.teal,
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  walletText: {
    flex: 1,
  },
  walletHint: {
    fontSize: 12,
    color: BrandColors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: Spacing.one,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  freeTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.teal,
  },
  policyCard: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
    marginBottom: Spacing.six,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  policyCardWarning: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  policyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  policyText: {
    fontSize: 13,
    lineHeight: 19,
    color: BrandColors.textPrimary,
  },
  policyStrong: {
    fontWeight: '800',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  checkText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  footer: {
    padding: Spacing.four,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: BrandColors.surface,
  },
  confirmButton: {
    backgroundColor: BrandColors.memberGold,
    paddingVertical: Spacing.four,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
