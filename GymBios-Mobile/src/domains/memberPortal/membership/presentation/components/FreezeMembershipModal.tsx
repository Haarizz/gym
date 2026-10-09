import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { CurrencyValue } from '@/core/providers';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';

const MAX_2DP = { maximumFractionDigits: 2 };
import type { FreezeInfo } from '../../domain/models';

interface FreezeMembershipModalProps {
  visible: boolean;
  freeze: FreezeInfo;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (days: number, reason: string) => void;
}

const FREEZE_OPTIONS = [7, 14, 21, 30];
const FREEZE_REASONS = ['Travel / Vacation', 'Medical / Injury', 'Work / Relocation', 'Other'];

/** Days of a freeze of this length billed at the plan's per-day rate (the rest are free). */
export function chargeableFreezeDays(days: number, freeze: FreezeInfo): number {
  return freeze.charge_per_extra_day > 0 ? Math.max(0, days - freeze.free_days_remaining) : 0;
}

/** Give it a new `key` each time it opens so it starts fresh — the allowance may have changed since. */
export function FreezeMembershipModal({
  visible,
  freeze,
  isLoading,
  onClose,
  onConfirm,
}: FreezeMembershipModalProps) {
  const daysAvailable = freeze.allowed_days;
  const defaultDays = FREEZE_OPTIONS.find((d) => d <= daysAvailable) ?? daysAvailable;

  const [selectedDays, setSelectedDays] = useState(defaultDays);
  const [customDays, setCustomDays] = useState('');
  const [selectedReason, setSelectedReason] = useState(FREEZE_REASONS[0]);

  const handleClose = () => {
    if (!isLoading) onClose();
  };

  const handleFreeze = () => {
    onConfirm(selectedDays, selectedReason);
  };

  const isValidDuration = selectedDays >= 1 && selectedDays <= daysAvailable;
  const rate = freeze.charge_per_extra_day;
  const chargedDays = isValidDuration ? chargeableFreezeDays(selectedDays, freeze) : 0;
  const charge = chargedDays * rate;

  const occurrencesText = freeze.max_occurrences != null
    ? ` · ${freeze.remaining_occurrences ?? 0} of ${freeze.max_occurrences} freezes left`
    : '';

  const footer = (
    <View style={styles.footer}>
      {isValidDuration && rate > 0 && (
        chargedDays > 0 ? (
          <View style={styles.chargeBox}>
            <Feather name="info" size={16} color={BrandColors.trainerAmber} />
            <Text style={styles.chargeText}>
              {chargedDays} extra {chargedDays === 1 ? 'day' : 'days'} × <CurrencyValue amount={rate} options={MAX_2DP} /> ={' '}
              <CurrencyValue style={styles.chargeAmount} amount={charge} options={MAX_2DP} />
              {' '}will be added to your outstanding balance when the freeze ends. Unfreeze early and you only pay for the days actually frozen.
            </Text>
          </View>
        ) : (
          <Text style={styles.noChargeText}>No charge — within your free freeze days.</Text>
        )
      )}
      <Pressable
        style={[styles.confirmButton, (isLoading || !isValidDuration) && { opacity: 0.7 }]}
        onPress={handleFreeze}
        disabled={isLoading || !isValidDuration}
      >
        {isLoading ? (
          <Text style={styles.confirmButtonText}>Freezing...</Text>
        ) : (
          <Text style={styles.confirmButtonText}>
            {isValidDuration ? (
              <>
                Freeze for {selectedDays} Days
                {charge > 0 ? <> · <CurrencyValue amount={charge} options={MAX_2DP} /></> : null}
              </>
            ) : (
              `Choose 1–${daysAvailable} days`
            )}
          </Text>
        )}
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.7 }]}
        onPress={handleClose}
        disabled={isLoading}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </Pressable>
    </View>
  );

  return (
    <AppBottomSheet
      visible={visible}
      title="Freeze Subscription"
      subtitle={`${daysAvailable} of ${freeze.max_days} freeze days left${occurrencesText}`}
      onClose={handleClose}
      footer={footer}
    >
      <View style={styles.policyBox}>
        {rate > 0 && (
          <Text style={styles.policyText}>
            {freeze.free_days_remaining > 0 ? (
              <>{freeze.free_days_remaining} free freeze days left, then <CurrencyValue amount={rate} options={MAX_2DP} /> per extra day.</>
            ) : (
              <>No free freeze days left — each day costs <CurrencyValue amount={rate} options={MAX_2DP} />.</>
            )}
          </Text>
        )}
        <Text style={styles.policyText}>
          {freeze.auto_unfreeze
            ? 'Your subscription resumes automatically at the end of the freeze, and its end date moves forward by the days frozen.'
            : 'Unfreeze from this screen when you\'re back — your subscription end date moves forward by the days frozen.'}
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Select Duration</Text>
      <View style={styles.daysRow}>
        {FREEZE_OPTIONS.map((days) => {
          const isSelected = selectedDays === days && customDays === '';
          const isDisabled = days > daysAvailable;
          return (
            <Pressable
              key={days}
              style={[
                styles.dayCard, 
                isSelected && styles.dayCardSelected,
                isDisabled && { opacity: 0.4 }
              ]}
              onPress={() => {
                if (!isDisabled) {
                  setSelectedDays(days);
                  setCustomDays('');
                }
              }}
              disabled={isDisabled || isLoading}
            >
              <Text style={[styles.dayNum, isSelected && styles.textSelected]}>{days}</Text>
              <Text style={[styles.dayText, isSelected && styles.textSelected]}>Days</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.customDaysContainer}>
        <Text style={styles.customDaysLabel}>Or enter custom days:</Text>
        <TextInput
          style={styles.customDaysInput}
          keyboardType="numeric"
          value={customDays}
          onChangeText={(text) => {
            setCustomDays(text);
            const parsed = parseInt(text, 10);
            if (!isNaN(parsed)) {
              setSelectedDays(parsed);
            } else {
              setSelectedDays(0);
            }
          }}
          placeholder="e.g. 5"
          placeholderTextColor="#94A3B8"
          maxLength={3}
          editable={!isLoading}
        />
      </View>

      <Text style={[styles.sectionLabel, { marginTop: Spacing.four }]}>Reason</Text>
      <View style={styles.reasonsList}>
        {FREEZE_REASONS.map((reason) => {
          const isSelected = selectedReason === reason;
          return (
            <Pressable
              key={reason}
              style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
              onPress={() => setSelectedReason(reason)}
              disabled={isLoading}
            >
              <Feather
                name={isSelected ? 'check-circle' : 'circle'}
                size={18}
                color={isSelected ? BrandColors.trainerAmber : '#94A3B8'}
              />
              <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                {reason}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.two,
  },
  daysRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dayCard: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.screenBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  dayCardSelected: {
    backgroundColor: BrandColors.trainerAmber,
    borderColor: BrandColors.trainerAmber,
  },
  dayNum: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  dayText: {
    fontSize: 10,
    fontWeight: '600',
    color: BrandColors.textSecondary,
  },
  textSelected: {
    color: '#FFFFFF',
  },
  customDaysContainer: {
    marginTop: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BrandColors.screenBackground,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  customDaysLabel: {
    fontSize: TypographyScale.body,
    fontWeight: '500',
    color: BrandColors.textPrimary,
  },
  customDaysInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    width: 80,
    fontSize: TypographyScale.body,
    color: BrandColors.textPrimary,
    textAlign: 'center',
  },
  reasonsList: {
    gap: Spacing.two,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.screenBackground,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonOptionSelected: {
    backgroundColor: '#FFFBEB',
    borderColor: BrandColors.trainerAmber,
  },
  reasonText: {
    fontSize: TypographyScale.body,
    color: BrandColors.textPrimary,
    fontWeight: '500',
  },
  reasonTextSelected: {
    color: BrandColors.trainerAmber,
    fontWeight: '700',
  },
  policyBox: {
    gap: Spacing.one,
    backgroundColor: 'rgba(120,170,255,0.14)',
    borderRadius: Radius.md,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  policyText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#2451A6',
  },
  footer: {
    gap: Spacing.three,
  },
  chargeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: BrandColors.trainerAmber,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  chargeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: BrandColors.textPrimary,
  },
  chargeAmount: {
    fontWeight: '800',
  },
  noChargeText: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: BrandColors.trainerAmber,
    paddingVertical: Spacing.four,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    fontSize: TypographyScale.body,
    fontWeight: '700',
    color: BrandColors.textSecondary,
  },
});
