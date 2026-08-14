import React, { useCallback, useState } from 'react';
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

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { Typography } from '@/shared/components/Typography';
import {
  ProgressIndicator,
  WizardNavigation,
} from '@/shared/components/Wizard';
import type { PromotionCampaignResponse } from '../../domain/PromotionCampaign';
import { usePromotionWizard } from '../hooks/usePromotionWizard';
import { CoreInfoStep } from './steps/CoreInfoStep';
import { ScheduleStep } from './steps/ScheduleStep';
import { DiscountStep } from './steps/DiscountStep';
import { TargetingStep } from './steps/TargetingStep';
import { PolicyStep } from './steps/PolicyStep';

interface PromotionFormProps {
  mode: 'create' | 'edit';
  initialData?: PromotionCampaignResponse;
  promotionId?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PromotionForm({
  mode,
  initialData,
  promotionId,
  onSuccess,
  onCancel,
}: PromotionFormProps) {
  const insets = useSafeAreaInsets();
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const handleError = useCallback((_error: Error) => {
    Alert.alert('Error', 'Failed to save promotion. Please check input data and try again.');
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
  } = usePromotionWizard({
    mode,
    initialData,
    promotionId,
    onSuccess,
    onError: handleError,
  });

  const stepLabels = steps.map((s) => s.title);

  const renderStepContent = useCallback(() => {
    const stepId = steps[step - 1]?.id;

    switch (stepId) {
      case 'core':
        return <CoreInfoStep values={data} onChange={updateField} />;
      case 'schedule':
        return <ScheduleStep values={data} onChange={updateField} />;
      case 'discount':
        return <DiscountStep values={data} onChange={updateField} />;
      case 'targeting':
        return <TargetingStep values={data} onChange={updateField} />;
      case 'policy':
        return <PolicyStep values={data} onChange={updateField} />;
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
          <Typography variant="subtitle" style={styles.headerTitle}>
            {mode === 'create' ? 'New Promotion' : 'Edit Promotion'}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {currentStepTitle}
          </Typography>
        </View>

        {/* Progress */}
        <View style={styles.indicatorContainer}>
          <ProgressIndicator
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
          {renderStepContent()}
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
            submitLabelOverride={mode === 'edit' ? 'Save Changes' : 'Create Promotion'}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Discard confirmation modal */}
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
              All entered promotion information will be lost.
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
    backgroundColor: '#F9FAFE',
  },
  flex: {
    flex: 1,
  },
  wizardHeader: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  indicatorContainer: {
    paddingBottom: Spacing.two,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Spacing.two,
  },
  bottomSpacer: {
    height: Spacing.four,
  },
  stickyFooter: {
    backgroundColor: '#F9FAFE',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
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
