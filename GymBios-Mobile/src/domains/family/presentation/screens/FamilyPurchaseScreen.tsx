import { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, ActivityIndicator, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Feather from '@expo/vector-icons/Feather';
import * as Crypto from 'expo-crypto';

import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { Dropdown } from '@/shared/components/Dropdown';
import { DatePicker } from '@/shared/components/DatePicker';
import { Typography } from '@/shared/components/Typography';
import { useTranslation } from 'react-i18next';
import type { ParseKeys } from 'i18next';
import { i18n } from '@/core/i18n';
import { toast } from '@/shared/components/Toasts/toastStore';
import { ApiError } from '@/core/platform/api/types';
import { CurrencyValue, useCurrency } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { PaymentBottomSheet } from '@/shared/payment/presentation/bottomSheets/PaymentBottomSheet';
import type { PaymentResult } from '@/shared/payment/types';

import { useCenterDetails, useCenterPlans, type CenterPlan } from '@/domains/discovery';
import { useAuthStore } from '@/domains/auth/store/authStore';
import { getMaxBirthDate, getMinBirthDate } from '@/domains/profile/domain/dateOfBirthRules';
import { usePurchaseFamilyPlan } from '../../hooks/usePurchaseFamilyPlan';
import { useFamilyQuote } from '../../hooks/useFamilyQuote';
import type { FamilyPurchaseRequest } from '../../infrastructure/familyApi';

// Messages are resolved when validation runs, so they follow the current language.
const msg = (key: ParseKeys) => ({ error: () => i18n.t(key) });

const familyMemberSchema = z.object({
  name: z.string().trim().min(1, msg('family.nameRequired')),
  // Required: every family member becomes a member record, and members.email is NOT NULL.
  email: z.string().trim().min(1, msg('family.emailRequired')).email(msg('family.emailInvalid')),
  phone: z.string().trim().optional(),
  relationship: z.string().min(1, msg('family.relationshipRequired')),
  isMinor: z.boolean(),
  dateOfBirth: z.date().nullable().optional(),
  // '' = same plan as the buyer
  membershipPlanId: z.string(),
});

const formSchema = z.object({
  members: z.array(familyMemberSchema),
});

type FormValues = z.infer<typeof formSchema>;

// Values are what the API stores (English); only the labels are translated.
const FAMILY_RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other'] as const;
const COUPLE_RELATIONSHIPS = ['Spouse', 'Partner'] as const;

const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Family/Couple plans: collect the family members before payment, the way the web
 * app's add-member form does. Pricing comes from the backend quote, never a local
 * estimate. Each member with an email is invited to the app after purchase and
 * gets the membership as soon as they log in with that email.
 *
 * mode=change: an existing member of this gym switching onto the plan (from
 * Membership → Renew / Change plan) — they become the family head instead of
 * joining as a new member.
 */
export function FamilyPurchaseScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { tenantSlug = '', branchId: branchIdParam, planId, mode } =
    useLocalSearchParams<{ tenantSlug: string; branchId: string; planId: string; mode?: string }>();
  const branchId = Number(branchIdParam) || 0;
  const isPlanChange = mode === 'change';

  const { data: details, isLoading: isDetailsLoading } = useCenterDetails(tenantSlug, branchId);
  const { data: plans, isLoading: isPlansLoading } = useCenterPlans(tenantSlug, branchId);
  const purchaseMutation = usePurchaseFamilyPlan();

  const selectedPlan: CenterPlan | null = useMemo(
    () => plans?.find((p) => p.id === Number(planId)) ?? null,
    [plans, planId],
  );
  const [isPaymentVisible, setIsPaymentVisible] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  const isCouple = selectedPlan?.planType?.toLowerCase() === 'couple';

  const { control, handleSubmit, getValues, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { members: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'members' });
  const watchMembers = useWatch({ control, name: 'members' });

  // Same caps MemberService.enforceFamilyMemberCaps applies (adults include the buyer).
  const limits = useMemo(() => {
    const positive = (n: number | null | undefined) => (n != null && n > 0 ? n : null);
    if (isCouple) return { total: 1, adults: 1, children: 0 };
    const allowExtra = selectedPlan?.allowAdditionalMembers !== false;
    const maxTotal = positive(selectedPlan?.maxFamilyMembers);
    const maxAdults = positive(selectedPlan?.maxAdultMembers);
    return {
      total: maxTotal != null && !allowExtra ? maxTotal - 1 : null,
      adults: maxAdults != null ? maxAdults - 1 : null,
      children: positive(selectedPlan?.maxChildMembers),
    };
  }, [selectedPlan, isCouple]);

  // Like the web form: under individual billing an adult may pick their own
  // (non-family) plan; under family_head billing everyone is on the one invoice.
  const allowsOwnPlan = selectedPlan?.familyBillingMode !== 'family_head';
  // Dropdown labels are plain strings, so these use the text form (e.g. "AED 500").
  const { formatCurrency } = useCurrency();
  const ownPlanOptions = useMemo(() => {
    const individualPlans = (plans ?? []).filter((p) => {
      const type = p.planType?.toLowerCase();
      return p.id !== selectedPlan?.id && type !== 'family' && type !== 'couple';
    });
    return [
      { label: t('family.sameAsYours'), value: '' },
      ...individualPlans.map((p) => ({ label: `${p.name} · ${formatCurrency(p.effectivePrice ?? p.price)}`, value: String(p.id) })),
    ];
  }, [plans, selectedPlan, formatCurrency]);

  const minorFlags = useMemo(() => watchMembers.map((m) => !isCouple && !!m.isMinor), [watchMembers, isCouple]);
  const memberPlanIds = useMemo(
    () =>
      watchMembers.map((m, i) =>
        allowsOwnPlan && !minorFlags[i] && m.membershipPlanId ? Number(m.membershipPlanId) : null,
      ),
    [watchMembers, minorFlags, allowsOwnPlan],
  );
  const adultCount = minorFlags.filter((m) => !m).length;
  const childCount = minorFlags.length - adultCount;
  const canAddMember = limits.total == null || watchMembers.length < limits.total;
  const limitLines = useMemo(() => {
    if (isCouple) return [t('family.youAndPartner')];
    const lines: string[] = [];
    if (limits.total != null) lines.push(t('family.youPlusPeople', { count: limits.total }));
    if (limits.adults != null) lines.push(t('family.upToAdults', { count: limits.adults }));
    if (limits.children != null) lines.push(t('family.upToChildren', { count: limits.children }));
    return lines;
  }, [limits, isCouple, t]);

  const { data: quote, isFetching: isQuoteFetching, error: quoteError } =
    useFamilyQuote(tenantSlug, branchId, selectedPlan?.id, minorFlags, memberPlanIds);

  const handleReviewAndPay = (data: FormValues) => {
    if (data.members.length === 0) {
      toast.error(t(isCouple ? 'family.addPartnerToContinue' : 'family.addAtLeastOne'));
      return;
    }
    if (limits.adults != null && adultCount > limits.adults) {
      toast.error(t('family.adultsLimit', { count: limits.adults }));
      return;
    }
    if (limits.children != null && childCount > limits.children) {
      toast.error(t('family.childrenLimit', { count: limits.children }));
      return;
    }
    const emails = data.members.map((m) => m.email.trim().toLowerCase());
    if (new Set(emails).size !== emails.length) {
      toast.error(t('family.uniqueEmails'));
      return;
    }
    if (quoteError) {
      toast.error(quoteError.message);
      return;
    }
    if (!quote) {
      toast.error(t('family.priceLoading'));
      return;
    }
    // One key per payment attempt: retries from the open sheet reuse it, so a
    // request that reached the server but lost its response isn't charged twice.
    setIdempotencyKey(Crypto.randomUUID());
    setIsPaymentVisible(true);
  };

  const handlePaymentComplete = (paymentResult: PaymentResult) => {
    if (!selectedPlan) return;

    const request: FamilyPurchaseRequest = {
      planId: selectedPlan.id,
      paymentMethodUsed: paymentResult.paymentMethodUsed,
      paymentBreakdown: paymentResult.paymentBreakdown,
      paidAmount: paymentResult.summary.paidAmount,
      paymentDueDate: paymentResult.summary.paymentDueDate,
      bankAccountCode: paymentResult.bankAccountCode,
      bankAccountName: paymentResult.bankAccountName,
      connectedMembers: getValues('members').map((m, i) => ({
        name: m.name.trim(),
        email: m.email.trim(),
        phone: m.phone?.trim() || undefined,
        relationship: m.relationship,
        isMinor: minorFlags[i],
        dateOfBirth: minorFlags[i] && m.dateOfBirth ? toIsoDate(m.dateOfBirth) : undefined,
        membershipPlanId: memberPlanIds[i] ?? undefined,
      })),
    };

    purchaseMutation.mutate(
      { idempotencyKey, tenantSlug, branchId, request, isPlanChange },
      {
        onSuccess: (result) => {
          setIsPaymentVisible(false);
          useAuthStore.getState().setActiveTenant(tenantSlug);

          toast.success(
            isPlanChange
              ? t('family.switched', { plan: selectedPlan.name })
              : result.approvalPending
                ? t('family.bookedPendingApproval', { plan: selectedPlan.name })
                : t('family.purchased', { plan: selectedPlan.name }),
          );
          if (result.invitedEmails.length > 0) {
            toast.info(
              t('family.invitationsSent', { emails: result.invitedEmails.join(', ') }),
            );
          }
          router.replace(isPlanChange ? '/(member)/membership' : '/(member)');
        },
        // The API client already shows the server's error message; the sheet stays
        // open so a retry reuses this attempt's idempotency key.
        onError: (error) => {
          // The server rejected this attempt outright and rolled it back, so nothing
          // was charged. The retry will likely carry a different payload (edited
          // payment details), which the backend refuses under the same key
          // ("Idempotency key already used with different payload") — start a new
          // attempt instead. Network errors / 5xx / "already in progress"
          // (INVALID_STATE) keep the key, since that request may still land.
          if (
            error instanceof ApiError &&
            error.status >= 400 && error.status < 500 &&
            error.body?.code !== 'INVALID_STATE'
          ) {
            setIdempotencyKey(Crypto.randomUUID());
          }
        },
      },
    );
  };

  const isLoading = isDetailsLoading || isPlansLoading;
  const relationshipOptions = (isCouple ? COUPLE_RELATIONSHIPS : FAMILY_RELATIONSHIPS).map((value) => ({
    label: t(`family.relationships.${value}`),
    value,
  }));

  return (
    <ScreenLayout>
      <AppHeader
        title={t(isCouple ? 'family.coupleTitle' : 'family.familyTitle')}
        subtitle={t(isCouple ? 'family.coupleSubtitle' : 'family.familySubtitle')}
        colors={[BrandColors.teal, BrandColors.tealDark]}
        onBack={() => router.back()}
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BrandColors.teal} />
        </View>
      ) : !selectedPlan ? (
        <View style={styles.center}>
          <Typography variant="body" color="error">{t('family.notFound')}</Typography>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.summaryCard}>
            <Typography variant="title" color="primary">{selectedPlan.name}</Typography>
            {!!selectedPlan.description && (
              <Typography variant="body" color="textSecondary" style={styles.planDesc}>
                {selectedPlan.description}
              </Typography>
            )}
            {limitLines.map((line) => (
              <View key={line} style={styles.planMetaRow}>
                <Feather name="users" size={16} color={BrandColors.teal} />
                <Typography variant="bodySmall" color="textSecondary">{line}</Typography>
              </View>
            ))}
            <View style={styles.planMetaRow}>
              <Feather name="file-text" size={16} color={BrandColors.teal} />
              <Typography variant="bodySmall" color="textSecondary">
                {selectedPlan.familyBillingMode === 'family_head'
                  ? t('family.billedTogether')
                  : isCouple
                    ? t('family.partnerBilledSeparately')
                    : t('family.adultsOwnChildrenYou')}
              </Typography>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Typography variant="subtitle">{t(isCouple ? 'family.yourPartner' : 'family.familyMembers')}</Typography>
            <Typography variant="bodySmall" color="textSecondary">
              {t('family.inviteNote')}
            </Typography>
          </View>

          {fields.map((item, index) => {
            const isMinor = !isCouple && !!watchMembers[index]?.isMinor;
            const fee = quote?.billingMode === 'individual' ? quote.memberFees[index] : undefined;
            return (
              <View key={item.id} style={styles.memberCard}>
                <View style={styles.memberCardHeader}>
                  <Typography variant="subtitle" style={styles.bold}>
                    {isCouple ? t('family.partner') : t('family.memberN', { n: index + 1 })}
                  </Typography>
                  <Pressable onPress={() => remove(index)} style={styles.removeBtn} hitSlop={8}>
                    <Feather name="trash-2" size={18} color="#ef4444" />
                  </Pressable>
                </View>

                <Controller
                  control={control}
                  name={`members.${index}.name`}
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label={t('family.fullName')}
                      placeholder={t('family.enterName')}
                      value={value}
                      onChangeText={onChange}
                      error={errors.members?.[index]?.name?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name={`members.${index}.relationship`}
                  render={({ field: { onChange, value } }) => (
                    <Dropdown
                      label={t('family.relationship')}
                      options={relationshipOptions}
                      value={value}
                      onChange={onChange}
                      placeholder={t('family.selectRelationship')}
                      error={errors.members?.[index]?.relationship?.message}
                    />
                  )}
                />

                {!isCouple && (
                  <Controller
                    control={control}
                    name={`members.${index}.isMinor`}
                    render={({ field: { onChange, value } }) => (
                      <View style={styles.switchRow}>
                        <View>
                          <Typography variant="body" style={styles.semibold}>{t('family.under18')}</Typography>
                          <Typography variant="bodySmall" color="textSecondary">{t('family.billedOnInvoice')}</Typography>
                        </View>
                        <Switch
                          value={value}
                          onValueChange={onChange}
                          trackColor={{ true: BrandColors.teal, false: '#e2e8f0' }}
                        />
                      </View>
                    )}
                  />
                )}

                {!isMinor && allowsOwnPlan && ownPlanOptions.length > 1 && (
                  <Controller
                    control={control}
                    name={`members.${index}.membershipPlanId`}
                    render={({ field: { onChange, value } }) => (
                      <Dropdown
                        label={t('family.subscriptionOptional')}
                        options={ownPlanOptions}
                        value={value}
                        onChange={onChange}
                        placeholder={t('family.sameAsYours')}
                      />
                    )}
                  />
                )}

                {isMinor && (
                  <Controller
                    control={control}
                    name={`members.${index}.dateOfBirth`}
                    render={({ field: { onChange, value } }) => (
                      <DatePicker
                        label={t('family.dateOfBirthOptional')}
                        value={value ?? null}
                        onChange={onChange}
                        initialView="year"
                        minimumDate={getMinBirthDate()}
                        maximumDate={getMaxBirthDate()}
                      />
                    )}
                  />
                )}

                <Controller
                  control={control}
                  name={`members.${index}.email`}
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label={t(isMinor ? 'family.email' : 'family.emailForInvite')}
                      placeholder="name@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={value}
                      onChangeText={onChange}
                      error={errors.members?.[index]?.email?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name={`members.${index}.phone`}
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label={t('family.phoneOptional')}
                      placeholder={t('family.enterPhone')}
                      keyboardType="phone-pad"
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />

                {fee != null && (
                  <Typography variant="bodySmall" color="textSecondary" style={styles.memberFee}>
                    {isMinor
                      ? t('family.addedToInvoice')
                      : t('family.ownMembership', { plan: quote?.memberPlanNames[index] ?? selectedPlan.name })}
                    <CurrencyValue amount={fee} />
                  </Typography>
                )}
              </View>
            );
          })}

          {canAddMember && (
            <Button
              variant="outline"
              title={t(isCouple ? 'family.addPartner' : 'family.addFamilyMember')}
              onPress={() =>
                append({
                  name: '', email: '', phone: '', relationship: isCouple ? 'Spouse' : '',
                  isMinor: false, dateOfBirth: null, membershipPlanId: '',
                })
              }
              style={styles.addBtn}
            />
          )}

          <View style={styles.totalsCard}>
            <View style={styles.totalsHeader}>
              <Typography variant="subtitle">{t('family.summary')}</Typography>
              {isQuoteFetching && <ActivityIndicator size="small" color={BrandColors.teal} />}
            </View>
            {quoteError ? (
              <Typography variant="bodySmall" color="error" style={styles.totalRow}>
                {(quoteError as any).status >= 400 && (quoteError as any).status < 500
                  ? quoteError.message
                  : t('family.priceLoadError', { message: quoteError.message })}
              </Typography>
            ) : quote ? (
              <>
                {quote.billingMode === 'individual' ? (
                  <>
                    <View style={styles.totalRow}>
                      <Typography variant="body" color="textSecondary">{t('family.yourMembership')}</Typography>
                      <Typography variant="body"><CurrencyValue amount={quote.headFee} /></Typography>
                    </View>
                    <View style={styles.totalRow}>
                      <Typography variant="body" color="textSecondary">{t('family.familyMembersCount', { count: watchMembers.length })}</Typography>
                      <Typography variant="body"><CurrencyValue amount={quote.membersTotal} /></Typography>
                    </View>
                  </>
                ) : (
                  <View style={styles.totalRow}>
                    <Typography variant="body" color="textSecondary">
                      {t('family.familyInvoice', { count: watchMembers.length + 1 })}
                    </Typography>
                    <Typography variant="body"><CurrencyValue amount={quote.total} /></Typography>
                  </View>
                )}
                <View style={[styles.totalRow, styles.totalRowBold]}>
                  <Typography variant="title">{t('family.total')}</Typography>
                  <Typography variant="title" color="primary"><CurrencyValue amount={quote.total} /></Typography>
                </View>
              </>
            ) : null}
          </View>

          <Button
            title={t('family.reviewAndPay')}
            onPress={handleSubmit(handleReviewAndPay)}
            disabled={!quote || !!quoteError || isQuoteFetching || watchMembers.length === 0}
            style={styles.submitBtn}
          />
        </ScrollView>
      )}

      {selectedPlan && details && quote && (
        <PaymentBottomSheet
          visible={isPaymentVisible}
          amount={quote.total}
          title={t('family.subscribeTo', { plan: selectedPlan.name })}
          subtitle={details.centerName}
          allowDiscount={false}
          tenantSlug={tenantSlug || undefined}
          onClose={() => setIsPaymentVisible(false)}
          isProcessing={purchaseMutation.isPending}
          onComplete={handlePaymentComplete}
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  summaryCard: {
    backgroundColor: BrandColors.surface,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    marginBottom: Spacing.six,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  planDesc: {
    marginTop: Spacing.one,
    marginBottom: Spacing.three,
  },
  planMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  sectionHeader: {
    marginBottom: Spacing.three,
  },
  memberCard: {
    backgroundColor: '#fff',
    padding: Spacing.four,
    borderRadius: Radius.md,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: Spacing.two,
  },
  memberCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  bold: {
    fontWeight: 'bold',
  },
  semibold: {
    fontWeight: '600',
  },
  removeBtn: {
    padding: Spacing.two,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  memberFee: {
    marginTop: Spacing.one,
  },
  addBtn: {
    marginBottom: Spacing.six,
  },
  totalsCard: {
    backgroundColor: BrandColors.surface,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    marginBottom: Spacing.six,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  totalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  totalRowBold: {
    marginTop: Spacing.four,
    paddingTop: Spacing.four,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
  },
  submitBtn: {
    marginBottom: Spacing.six,
  },
});
