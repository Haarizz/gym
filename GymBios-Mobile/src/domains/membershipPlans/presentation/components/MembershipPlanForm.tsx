import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/hooks';
import { ApiError } from '@/core/platform/api/types';
import { BrandColors, MaxContentWidth, Radius, Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { Typography } from '@/shared/components/Typography';
import { toast } from '@/shared/components/Toasts/toastStore';
import type { MembershipPlan } from '../../domain/MembershipPlan';
import { type PlanWizardData, useMembershipPlanWizard } from '../hooks/useMembershipPlanWizard';
import { AssignmentsStep } from './steps/AssignmentsStep';
import { BasicInformationStep } from './steps/BasicInformationStep';
import { DurationPricingStep } from './steps/DurationPricingStep';
import { FamilyOptionsStep } from './steps/FamilyOptionsStep';
import { FreezePolicyStep } from './steps/FreezePolicyStep';
import { SessionsCapacityStep } from './steps/SessionsCapacityStep';

interface MembershipPlanFormProps {
  mode: 'create' | 'edit';
  initialData?: MembershipPlan;
  planId?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

type StepErrors = Partial<Record<keyof PlanWizardData, string>>;

/** Required-field errors per step; the wizard's own validate() decides whether Next is allowed. */
function requiredErrors(stepId: string | undefined, d: PlanWizardData, message: string): StepErrors {
  const errors: StepErrors = {};
  if (stepId === 'basic') {
    if (!d.name.trim()) errors.name = message;
    if (!d.planType.trim()) errors.planType = message;
  }
  if (stepId === 'duration') {
    if (!d.durationType.trim()) errors.durationType = message;
    if (!d.price.trim()) errors.price = message;
  }
  return errors;
}

// Same shell as the member form (MemberFormScreen): close button + title, tappable step
// bar, scrolling cards and a pinned Back / Next footer padded past the navigation bar.
export function MembershipPlanForm({ mode, initialData, planId, onSuccess, onCancel }: MembershipPlanFormProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  // Errors stay hidden until the user tries to move on, so a fresh form isn't all red.
  const [showErrors, setShowErrors] = useState(false);

  const handleError = useCallback(
    (error: Error) => {
      // API failures are already toasted (with the server's reason) by apiClient.
      if (error instanceof ApiError) return;
      toast.error(t('common.tryAgainError'), { title: t('common.error') });
    },
    [t],
  );

  const { step, totalSteps, steps, data, canGoNext, loading, updateField, goToStep, submit } =
    useMembershipPlanWizard({ mode, initialData, planId, onSuccess, onError: handleError });

  const [furthestStep, setFurthestStep] = useState(mode === 'edit' ? totalSteps : 1);

  const stepLabels = useMemo(
    () => steps.map(s => t(`membershipPlans.misc2.wizardSteps.${s.id}`, { defaultValue: s.title })),
    [steps, t],
  );
  const stepId = steps[step - 1]?.id;
  const isFirst = step === 1;
  const isLast = step === totalSteps;

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  const navigateTo = useCallback(
    (target: number) => {
      goToStep(target);
      setShowErrors(false);
      setFurthestStep(prev => Math.max(prev, target));
    },
    [goToStep],
  );

  const blockInvalid = useCallback(() => {
    setShowErrors(true);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    toast.warning(t('common.fixHighlighted'));
  }, [t]);

  const handleNext = useCallback(() => {
    if (!canGoNext) return blockInvalid();
    navigateTo(step + 1);
  }, [canGoNext, blockInvalid, navigateTo, step]);

  const handleSubmit = useCallback(() => {
    if (!canGoNext) return blockInvalid();
    submit();
  }, [canGoNext, blockInvalid, submit]);

  const handleStepPress = useCallback(
    (target: number) => {
      if (target === step) return;
      // Going back is always fine; going forward needs the current step to be valid.
      if (target > step && !canGoNext) return blockInvalid();
      navigateTo(target);
    },
    [step, canGoNext, blockInvalid, navigateTo],
  );

  const handleDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    onCancel();
  }, [onCancel]);

  // Android back: step back through the wizard, then confirm before leaving.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 1) navigateTo(step - 1);
      else setShowDiscardDialog(true);
      return true;
    });
    return () => sub.remove();
  }, [step, navigateTo]);

  const errors = showErrors ? requiredErrors(stepId, data, t('membershipPlans.form.required')) : {};

  const renderStep = () => {
    switch (stepId) {
      case 'basic':
        return <BasicInformationStep values={data} errors={errors} onChange={updateField} />;
      case 'duration':
        return <DurationPricingStep values={data} errors={errors} onChange={updateField} />;
      case 'sessions':
        return <SessionsCapacityStep values={data} errors={errors} onChange={updateField} />;
      case 'family':
        return <FamilyOptionsStep values={data} errors={errors} onChange={updateField} />;
      case 'freeze':
        return <FreezePolicyStep values={data} errors={errors} onChange={updateField} />;
      case 'assignments':
        return <AssignmentsStep values={data} errors={errors} onChange={updateField} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* iOS and Android (edge-to-edge, so no adjustResize) both need padding to lift the footer above the keyboard. */}
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Pressable
              onPress={() => setShowDiscardDialog(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('shared.closeForm')}
              style={({ pressed }) => [styles.iconButton, { borderColor: theme.border }, pressed && styles.pressed]}
            >
              <Feather name="x" size={20} color={theme.text} />
            </Pressable>

            <View style={styles.headerText}>
              <Typography variant="body" style={styles.headerTitle} numberOfLines={1}>
                {mode === 'create' ? t('membershipPlans.form.newPlan') : t('membershipPlans.form.editPlan')}
              </Typography>
              <Typography variant="caption" color="textSecondary" numberOfLines={1}>
                {t('membershipPlans.form.stepIndicator', { current: step, total: totalSteps })} ·{' '}
                {stepLabels[step - 1]}
              </Typography>
            </View>

            {mode === 'edit' ? (
              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('membershipPlans.form.saveChanges')}
                style={({ pressed }) => [styles.saveLink, (pressed || loading) && styles.pressed]}
              >
                <Typography variant="bodySmallBold" style={{ color: theme.primary }}>
                  {t('membershipPlans.form.save')}
                </Typography>
              </Pressable>
            ) : null}
          </View>

          {/* Step bar — tap a completed step to jump back to it. */}
          <View style={styles.stepper}>
            {stepLabels.map((label, index) => {
              const n = index + 1;
              const active = n === step;
              const done = n < step;
              const reachable = n <= furthestStep;
              return (
                <Pressable
                  key={steps[index].id}
                  onPress={() => handleStepPress(n)}
                  disabled={!reachable || active}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active, disabled: !reachable }}
                  accessibilityLabel={label}
                  style={styles.stepItem}
                >
                  <View
                    style={[
                      styles.stepBar,
                      { backgroundColor: active || done ? theme.primary : theme.muted },
                      done && styles.stepBarDone,
                    ]}
                  />
                  <Typography
                    variant="caption"
                    numberOfLines={1}
                    style={[
                      styles.stepLabel,
                      {
                        color: active ? theme.primary : done ? theme.text : theme.textSecondary,
                        fontWeight: active ? '700' : '500',
                      },
                    ]}
                  >
                    {label}
                  </Typography>
                </Pressable>
              );
            })}
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {renderStep()}
          </ScrollView>

          <View
            style={[
              styles.footer,
              { borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, Spacing.md) },
            ]}
          >
            <Button
              label={isFirst ? t('membershipPlans.form.cancel') : t('membershipPlans.form.back')}
              variant="outline"
              size="lg"
              onPress={isFirst ? () => setShowDiscardDialog(true) : () => navigateTo(step - 1)}
              style={styles.secondaryAction}
            />
            <Button
              label={
                isLast
                  ? mode === 'edit'
                    ? t('membershipPlans.form.saveChanges')
                    : t('membershipPlans.form.createPlan')
                  : t('membershipPlans.form.next')
              }
              size="lg"
              loading={loading}
              onPress={isLast ? handleSubmit : handleNext}
              style={styles.primaryAction}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showDiscardDialog}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowDiscardDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIcon, { backgroundColor: 'rgba(212,24,61,0.10)' }]}>
              <Feather name="alert-triangle" size={22} color={theme.error} />
            </View>
            <Typography variant="body" style={styles.modalTitle}>
              {t('membershipPlans.form.discardTitle')}
            </Typography>
            <Typography variant="bodySmall" color="textSecondary" style={styles.modalText}>
              {t('membershipPlans.form.discardMsg')}
            </Typography>

            <View style={styles.modalActions}>
              <Button
                label={t('membershipPlans.form.keepEditing')}
                variant="outline"
                onPress={() => setShowDiscardDialog(false)}
                size="lg"
                style={styles.modalButton}
              />
              <Button
                label={t('membershipPlans.form.discard')}
                onPress={handleDiscard}
                size="lg"
                style={[styles.modalButton, { backgroundColor: theme.error }]}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: BrandColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveLink: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
  stepper: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.md,
  },
  stepItem: {
    flex: 1,
    gap: 6,
  },
  stepBar: {
    height: 4,
    borderRadius: 2,
  },
  stepBarDone: {
    opacity: 0.45,
  },
  stepLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  scrollContent: {
    paddingTop: Spacing.one,
    paddingBottom: Spacing.four,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.md,
    backgroundColor: BrandColors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  secondaryAction: {
    flex: 1,
  },
  primaryAction: {
    flex: 1.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    backgroundColor: BrandColors.white,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalText: {
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.four,
    width: '100%',
  },
  modalButton: {
    flex: 1,
  },
});
