import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { useTheme } from '@/core/hooks';
import { FormSection } from '@/shared/components/FormSection';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import type { PlanWizardData } from '../../hooks/useMembershipPlanWizard';


interface FamilyOptionsStepProps {
  values: PlanWizardData;
  errors: Partial<Record<keyof PlanWizardData, string>>;
  onChange: <K extends keyof PlanWizardData>(field: K, value: PlanWizardData[K]) => void;
}

export function FamilyOptionsStep({ values, onChange }: FamilyOptionsStepProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isCouple = values.planType === 'Couple';
  const pricePerMember = parseFloat(values.pricePerMember) || 0;
  const planPrice = parseFloat(values.price) || 0;

  return (
    <View style={styles.container}>
      <FormSection
        title={
          isCouple
            ? t('membershipPlans.form.familyStep.coupleBillingTitle')
            : t('membershipPlans.form.familyStep.familyBillingTitle')
        }
      >
        {/* One billing model, same as the web plan form: the head pays for everyone. */}
        <View style={[styles.modeCard, { backgroundColor: theme.primary + '14', borderColor: theme.primary }]}>
          <Typography variant="bodySmallBold" style={{ color: theme.primary }}>
            {isCouple ? 'Couple head pays for both' : 'Family head pays for everyone'}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {isCouple
              ? 'The partner is added under the couple head and the whole plan is billed to the head on one invoice.'
              : 'Family members are added under the family head and the whole plan is billed to the head on one invoice.'}
          </Typography>
        </View>

        <Input
          label={t('membershipPlans.form.familyStep.pricePerMemberLabel')}
          value={values.pricePerMember}
          onChangeText={(v) => onChange('pricePerMember', v)}
          placeholder={t('membershipPlans.form.familyStep.pricePerMemberPlaceholder')}
          keyboardType="decimal-pad"
        />
        <Typography variant="caption" color="textSecondary">
          {isCouple
            ? 'With Auto Calculate on, the invoice is this price × 2; leave blank to charge the subscription price for the couple.'
            : 'With Auto Calculate on, the invoice is this price × members; leave blank to charge the subscription price for the whole family.'}
        </Typography>
      </FormSection>

      {!isCouple && (
        <FormSection title={t('membershipPlans.form.familyStep.familyMembersSection')}>
          <Input
            label={t('membershipPlans.form.familyStep.maxFamilyMembersLabel')}
            value={values.maxFamilyMembers}
            onChangeText={(v) => onChange('maxFamilyMembers', v)}
            placeholder={t('membershipPlans.form.familyStep.maxFamilyMembersPlaceholder')}
            keyboardType="numeric"
          />
          <Input
            label={t('membershipPlans.form.familyStep.maxAdultMembersLabel')}
            value={values.maxAdultMembers}
            onChangeText={(v) => onChange('maxAdultMembers', v)}
            placeholder={t('membershipPlans.form.familyStep.maxAdultMembersPlaceholder')}
            keyboardType="numeric"
          />
          <Input
            label={t('membershipPlans.form.familyStep.maxChildMembersLabel')}
            value={values.maxChildMembers}
            onChangeText={(v) => onChange('maxChildMembers', v)}
            placeholder={t('membershipPlans.form.familyStep.maxChildMembersPlaceholder')}
            keyboardType="numeric"
          />
          <Typography variant="caption" color="textSecondary">
            {t('membershipPlans.form.familyStep.familyLimitsNote')}
          </Typography>
        </FormSection>
      )}

      <FormSection
        title={
          isCouple
            ? t('membershipPlans.form.familyStep.invoiceSection')
            : t('membershipPlans.form.familyStep.additionalMembersSection')
        }
      >
        {!isCouple && (
          <>
            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <Typography variant="bodySmallBold">
                  {t('membershipPlans.form.familyStep.allowAdditionalMembers')}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {t('membershipPlans.form.familyStep.allowAdditionalMembersDesc')}
                </Typography>
              </View>
              <Switch
                value={values.allowAdditionalMembers}
                onValueChange={(v) => onChange('allowAdditionalMembers', v)}
                trackColor={{ false: theme.muted, true: theme.primary }}
                thumbColor={theme.backgroundElement}
              />
            </View>
            {values.allowAdditionalMembers && (
              <Input
                label={t('membershipPlans.form.familyStep.additionalMemberPriceLabel')}
                value={values.additionalMemberPrice}
                onChangeText={(v) => onChange('additionalMemberPrice', v)}
                placeholder={t('membershipPlans.form.familyStep.additionalMemberPricePlaceholder')}
                keyboardType="decimal-pad"
              />
            )}
          </>
        )}
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Typography variant="bodySmallBold">
              {t('membershipPlans.form.familyStep.autoCalculateTotal')}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {t('membershipPlans.form.familyStep.autoCalculateTotalDesc')}
            </Typography>
          </View>
          <Switch
            value={values.autoCalculateTotal}
            onValueChange={(v) => onChange('autoCalculateTotal', v)}
            trackColor={{ false: theme.muted, true: theme.primary }}
            thumbColor={theme.backgroundElement}
          />
        </View>

        {(
          <View style={[styles.preview, { borderColor: theme.primary }]}>
            <Typography variant="bodySmallBold">
              {isCouple
                ? t('membershipPlans.form.familyStep.coupleBillingPreview')
                : t('membershipPlans.form.familyStep.familyBillingPreview')}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {values.autoCalculateTotal && pricePerMember > 0
                ? `Example: ${pricePerMember} × ${isCouple ? 2 : 5} members = ${(pricePerMember * (isCouple ? 2 : 5)).toFixed(2)} on ONE invoice billed to the head.`
                : `The subscription price (${planPrice.toFixed(2)}) is the whole ${isCouple ? 'couple' : 'family'}'s ONE invoice, billed to the head.`}
            </Typography>
          </View>
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
  modeCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    gap: Spacing.three,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  preview: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
