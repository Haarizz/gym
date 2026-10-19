import { format, isValid, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { useTheme } from '@/core/hooks';
import { CurrencyValue, useCurrency } from '@/core/providers';
import { DatePicker } from '@/shared/components/DatePicker';
import { FormSection } from '@/shared/components/FormSection';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import { offerError, type PlanWizardData } from '../../hooks/useMembershipPlanWizard';

const DURATION_TYPES = ['Day', 'Week', 'Month', 'Year'];

const OFFER_TYPES: { label: string; value: PlanWizardData['offerType'] }[] = [
  { label: 'No offer', value: 'none' },
  { label: 'Percentage', value: 'percentage' },
  { label: 'Flat amount', value: 'fixed' },
];

/** The form keeps offer dates as the API's yyyy-MM-dd; the DatePicker works in Date. */
function toDate(value: string): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

function toFormDate(date: Date | null): string {
  return date ? format(date, 'yyyy-MM-dd') : '';
}

/** Same maths as the backend's PlanOfferPricing, for the live preview only. */
function offerPreview(values: PlanWizardData): { discount: number; pays: number } | null {
  const price = Number(values.price);
  const value = Number(values.offerValue);
  if (values.offerType === 'none' || !(price > 0) || !(value > 0)) return null;
  const raw = values.offerType === 'percentage' ? (price * Math.min(value, 100)) / 100 : value;
  const discount = Math.round(Math.min(raw, price) * 100) / 100;
  return { discount, pays: Math.round((price - discount) * 100) / 100 };
}

interface OptionRowProps {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}

function OptionRow({ options, selected, onSelect }: OptionRowProps) {
  const theme = useTheme();
  return (
    <View style={styles.optionRow}>
      {options.map((opt) => {
        const isActive = opt === selected;
        return (
          <View
            key={opt}
            style={[
              styles.optionChip,
              {
                backgroundColor: isActive ? theme.primary : theme.backgroundElement,
                borderColor: isActive ? theme.primary : theme.border,
              },
            ]}
            onTouchEnd={() => onSelect(opt)}
          >
            <Typography
              variant="caption"
              style={[
                styles.optionText,
                { color: isActive ? '#ffffff' : theme.textSecondary },
              ]}
            >
              {opt}
            </Typography>
          </View>
        );
      })}
    </View>
  );
}

interface DurationPricingStepProps {
  values: PlanWizardData;
  errors: Partial<Record<keyof PlanWizardData, string>>;
  onChange: <K extends keyof PlanWizardData>(field: K, value: PlanWizardData[K]) => void;
}

export function DurationPricingStep({ values, errors, onChange }: DurationPricingStepProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();

  const offerTypeOptions: { label: string; value: PlanWizardData['offerType'] }[] = [
    { label: t('membershipPlans.form.pricingStep.noOffer'), value: 'none' },
    { label: t('membershipPlans.form.pricingStep.percentage'), value: 'percentage' },
    { label: t('membershipPlans.form.pricingStep.flatAmount'), value: 'fixed' },
  ];

  return (
    <View style={styles.container}>
      <FormSection title={t('membershipPlans.form.pricingStep.durationSection')}>
        <Typography variant="bodySmallBold">
          {t('membershipPlans.form.pricingStep.durationTypeLabel')}
        </Typography>
        <OptionRow
          options={DURATION_TYPES}
          selected={values.durationType}
          onSelect={(v) => onChange('durationType', v)}
        />
        <Input
          label={t('membershipPlans.form.pricingStep.durationValueLabel')}
          value={values.durationValue}
          onChangeText={(v) => onChange('durationValue', v)}
          placeholder={t('membershipPlans.form.pricingStep.durationValuePlaceholder')}
          keyboardType="numeric"
          error={errors.durationValue}
        />
      </FormSection>

      <FormSection title={t('membershipPlans.form.pricingStep.pricingSection')}>
        <Input
          label={t('membershipPlans.form.pricingStep.priceLabel')}
          value={values.price}
          onChangeText={(v) => onChange('price', v)}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={errors.price}
        />
      </FormSection>

      <FormSection title={t('membershipPlans.form.pricingStep.offerSection')}>
        <Typography variant="caption" color="textSecondary">
          {t('membershipPlans.form.pricingStep.offerDescription')}
        </Typography>
        <OptionRow
          options={offerTypeOptions.map((o) => o.label)}
          selected={
            offerTypeOptions.find((o) => o.value === values.offerType)?.label ??
            t('membershipPlans.form.pricingStep.noOffer')
          }
          onSelect={(label) =>
            onChange(
              'offerType',
              offerTypeOptions.find((o) => o.label === label)?.value ?? 'none',
            )
          }
        />
        {values.offerType !== 'none' && (
          <>
            <Input
              label={
                values.offerType === 'percentage'
                  ? t('membershipPlans.form.pricingStep.offerPercentageLabel')
                  : t('membershipPlans.form.pricingStep.offerAmountLabel')
              }
              value={values.offerValue}
              onChangeText={(v) => onChange('offerValue', v)}
              placeholder={
                values.offerType === 'percentage'
                  ? t('membershipPlans.form.pricingStep.offerPercentagePlaceholder')
                  : t('membershipPlans.form.pricingStep.offerValuePlaceholder')
              }
              keyboardType="decimal-pad"
              error={offerError(values) ?? undefined}
            />
            <Input
              label={t('membershipPlans.form.pricingStep.offerLabelText')}
              value={values.offerLabel}
              onChangeText={(v) => onChange('offerLabel', v)}
              placeholder={t('membershipPlans.form.pricingStep.offerLabelPlaceholder')}
              maxLength={100}
            />
            <View style={styles.dateRow}>
              <View style={styles.dateCol}>
                <DatePicker
                  label={t('membershipPlans.form.pricingStep.startsLabel')}
                  placeholder={t('membershipPlans.form.pricingStep.startsPlaceholder')}
                  value={toDate(values.offerStartDate)}
                  onChange={(d) => onChange('offerStartDate', toFormDate(d))}
                />
              </View>
              <View style={styles.dateCol}>
                <DatePicker
                  label={t('membershipPlans.form.pricingStep.endsLabel')}
                  placeholder={t('membershipPlans.form.pricingStep.endsPlaceholder')}
                  value={toDate(values.offerEndDate)}
                  minimumDate={toDate(values.offerStartDate) ?? undefined}
                  onChange={(d) => onChange('offerEndDate', toFormDate(d))}
                />
              </View>
            </View>
            {(() => {
              const preview = offerPreview(values);
              return preview ? (
                <Typography variant="bodySmall">
                  {t('membershipPlans.form.pricingStep.membersPayPreview', {
                    pays: formatCurrency(preview.pays),
                    discount: formatCurrency(preview.discount),
                  })}
                </Typography>
              ) : null;
            })()}
          </>
        )}
      </FormSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dateCol: {
    flex: 1,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  optionChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionText: {
    fontWeight: '600',
    fontSize: 12,
  },
});
