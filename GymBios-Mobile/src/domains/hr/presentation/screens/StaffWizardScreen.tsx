import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Radius, Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { Typography } from '@/shared/components/Typography';
import type { Staff } from '../../domain/Staff';
import { useStaffWizard } from '../hooks/useStaffWizard';
import { ProgressIndicator } from '../components/wizard/ProgressIndicator';
import { WizardHeader } from '../components/wizard/WizardHeader';
import { WizardNavigation } from '../components/wizard/WizardNavigation';
import { PersonalStep } from './steps/PersonalStep';
import { EmploymentStep } from './steps/EmploymentStep';
import { CompensationStep } from './steps/CompensationStep';
import { ScheduleStep } from './steps/ScheduleStep';
import { AppAccessStep } from './steps/AppAccessStep';

import { toast } from '@/shared/components/Toasts/toastStore';

interface StaffWizardScreenProps {
  mode: 'create' | 'edit';
  initialData?: Staff;
  staffId?: string;
  onSuccess: () => void;
}

const STEP_LABELS = [
  'Personal',
  'Employment',
  'Compensation',
  'Schedule',
  'Access',
];

export function StaffWizardScreen({
  mode,
  initialData,
  staffId,
  onSuccess,
}: StaffWizardScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const handleError = useCallback((_error: Error) => {
    toast.error('An error occurred. Please try again.', {
      title: 'Error'
    });
  }, []);

  const handleCancel = useCallback(() => {
    setShowDiscardDialog(true);
  }, []);

  const handleKeepEditing = useCallback(() => {
    setShowDiscardDialog(false);
  }, []);

  const handleDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/staff');
    }
  }, [router]);

  const wizard = useStaffWizard({
    mode,
    initialData,
    staffId,
    onSuccess,
    onError: handleError,
  });

  const {
    step,
    totalSteps,
    data,
    updateField,
    canGoNext,
    canGoPrevious,
    loading,
    next,
    previous,
    submit,
    addCertification,
    removeCertification,
    onChangeCert,
  } = wizard;

  const currentStepTitle = useMemo(() => {
    const titles: Record<number, string> = {
      1: 'Personal Information',
      2: 'Employment Details',
      3: 'Compensation',
      4: 'Schedule & Certifications',
      5: 'App Access & Review',
    };
    return titles[step] ?? '';
  }, [step]);

  const renderStep = useCallback(() => {
    switch (step) {
      case 1:
        return <PersonalStep data={data} updateField={updateField} />;
      case 2:
        return <EmploymentStep data={data} updateField={updateField} />;
      case 3:
        return <CompensationStep data={data} updateField={updateField} />;
      case 4:
        return (
          <ScheduleStep
            data={data}
            updateField={updateField}
            addCertification={addCertification}
            removeCertification={removeCertification}
            onChangeCert={onChangeCert}
          />
        );
      case 5:
        return <AppAccessStep data={data} updateField={updateField} />;
      default:
        return null;
    }
  }, [step, data, updateField, addCertification, removeCertification, onChangeCert]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <WizardHeader
          title={mode === 'create' ? 'New Staff' : 'Edit Staff'}
          subtitle={currentStepTitle}
        />

        <View style={styles.indicatorContainer}>
          <ProgressIndicator
            current={step}
            total={totalSteps}
            labels={STEP_LABELS}
          />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
          <View style={styles.bottomSpacer} />
        </ScrollView>

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
