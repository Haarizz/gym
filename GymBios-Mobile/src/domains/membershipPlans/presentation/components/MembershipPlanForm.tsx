import { useCallback } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { Typography } from '@/shared/components/Typography';
import type { MembershipPlan } from '../../domain/MembershipPlan';
import {
  useMembershipPlanWizard,
  mapPlanToWizardData,
} from '../hooks/useMembershipPlanWizard';
import { StepIndicator } from './StepIndicator';
import { WizardNavigation } from './WizardNavigation';
import { BasicInformationStep } from './steps/BasicInformationStep';
import { DurationPricingStep } from './steps/DurationPricingStep';
import { SessionsCapacityStep } from './steps/SessionsCapacityStep';
import { FamilyOptionsStep } from './steps/FamilyOptionsStep';
import { FreezePolicyStep } from './steps/FreezePolicyStep';
import { AssignmentsStep } from './steps/AssignmentsStep';
import { useState } from 'react';

interface MembershipPlanFormProps {
  mode: 'create' | 'edit';
  initialData?: MembershipPlan;
  planId?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MembershipPlanForm({
  mode,
  initialData,
  planId,
  onSuccess,
  onCancel,
}: MembershipPlanFormProps) {
  const insets = useSafeAreaInsets();
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const handleError = useCallback((_error: Error) => {
    Alert.alert('Error', 'Something went wrong. Please try again.');
  }, []);

  const {
    step,
    totalSteps,
    steps,
    data,
    canGoNext,
    loading,
    updateField,
    next,
    previous,
    submit,
  } = useMembershipPlanWizard({
    mode,
    initialData,
    planId,
    onSuccess,
    onError: handleError,
  });

  const stepLabels = steps.map((s) => s.title);
  const isFamily = data.planType === 'FAMILY';

  // Determine which step index maps to which component.
  // Steps order: basic(1), duration(2), sessions(3), [family(4)?], freeze(4|5), assign(5|6)
  const renderStep = useCallback(() => {
    const noErrors = {};
    const stepId = steps[step - 1]?.id;

    switch (stepId) {
      case 'basic':
        return <BasicInformationStep values={data} errors={noErrors} onChange={updateField} />;
      case 'duration':
        return <DurationPricingStep values={data} errors={noErrors} onChange={updateField} />;
      case 'sessions':
        return <SessionsCapacityStep values={data} errors={noErrors} onChange={updateField} />;
      case 'family':
        return <FamilyOptionsStep values={data} errors={noErrors} onChange={updateField} />;
      case 'freeze':
        return <FreezePolicyStep values={data} errors={noErrors} onChange={updateField} />;
      case 'assignments':
        return <AssignmentsStep values={data} errors={noErrors} onChange={updateField} />;
      default:
        return null;
    }
  }, [step, steps, data, updateField]);

  const handleCancel = useCallback(() => {
    setShowDiscardDialog(true);
  }, []);

  const handleKeepEditing = useCallback(() => {
    setShowDiscardDialog(false);
  }, []);

  const handleDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    onCancel();
  }, [onCancel]);

  const currentStepTitle = steps[step - 1]?.title ?? '';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.wizardHeader}>
          <Typography variant="subtitle" color="text">
            {mode === 'create' ? 'New Plan' : 'Edit Plan'}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {currentStepTitle}
          </Typography>
        </View>

        {/* Progress */}
        <View style={styles.indicatorContainer}>
          <StepIndicator
            current={step}
            total={totalSteps}
            labels={stepLabels}
          />
        </View>

        {/* Step content */}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Sticky footer */}
        <View
          style={[
            styles.stickyFooter,
            { paddingBottom: Math.max(insets.bottom, Spacing.two) },
          ]}
        >
          <WizardNavigation
            isFirst={step === 1}
            isLast={step === totalSteps}
            loading={loading}
            canProceed={canGoNext}
            onCancel={handleCancel}
            onNext={next}
            onPrevious={previous}
            onSubmit={submit}
            mode={mode}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Discard confirmation dialog */}
      <Modal
        visible={showDiscardDialog}
        transparent
        animationType="fade"
        onRequestClose={handleKeepEditing}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Typography variant="subtitle" color="text">
              Discard changes?
            </Typography>
            <View style={styles.modalSpacer} />
            <Typography variant="body" color="textSecondary">
              All entered information will be lost.
            </Typography>
            <View style={styles.modalActions}>
              <View style={styles.modalButtonWrapper}>
                <Button
                  label="Keep Editing"
                  variant="secondary"
                  onPress={handleKeepEditing}
                  size="lg"
                  style={styles.modalButton}
                />
              </View>
              <View style={styles.modalButtonSpacer} />
              <View style={styles.modalButtonWrapper}>
                <Button
                  label="Discard"
                  variant="primary"
                  onPress={handleDiscard}
                  size="lg"
                  style={styles.modalButton}
                />
              </View>
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
    backgroundColor: '#f9fafe',
  },
  flex: {
    flex: 1,
  },
  wizardHeader: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  indicatorContainer: {
    paddingBottom: Spacing.one,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Spacing.one,
  },
  bottomSpacer: {
    height: Spacing.three,
  },
  stickyFooter: {
    backgroundColor: '#f9fafe',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.five,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalSpacer: {
    height: Spacing.two,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: Spacing.five,
    width: '100%',
  },
  modalButtonWrapper: {
    flex: 1,
  },
  modalButton: {
    width: '100%',
  },
  modalButtonSpacer: {
    width: Spacing.three,
  },
});
