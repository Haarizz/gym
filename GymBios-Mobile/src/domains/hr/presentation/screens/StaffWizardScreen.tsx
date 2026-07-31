import { useCallback, useMemo } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/core/theme';
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

  const handleError = useCallback((_error: Error) => {
    Alert.alert('Error', 'An error occurred. Please try again.');
  }, []);

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
            onNext={next}
            onPrevious={previous}
            onSubmit={submit}
            mode={mode}
          />
        </View>
      </KeyboardAvoidingView>
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
});