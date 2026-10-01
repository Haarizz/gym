import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useTheme } from '@/core/hooks';
import { ApiError } from '@/core/platform/api/types';
import { BrandColors, MaxContentWidth, Radius, Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { Typography } from '@/shared/components/Typography';
import { PaymentBottomSheet, type PaymentResult } from '@/shared/payment';
import type { Member } from '../../domain/Member';
import { useMemberWizard, type MemberPrefill } from '../../hooks/useMemberWizard';

import { PersonalStep } from '../components/form/PersonalStep';
import { MembershipStep } from '../components/form/MembershipStep';
import { MedicalStep } from '../components/form/MedicalStep';
import { FamilyStep } from '../components/form/FamilyStep';
import { AppAccessStep } from '../components/form/AppAccessStep';

import { toast } from '@/shared/components/Toasts/toastStore';

interface MemberFormScreenProps {
  mode: 'create' | 'edit';
  initialData?: Member;
  memberId?: number;
  prefill?: MemberPrefill;
  onSuccess: () => void;
}

const STEPS = [
  { label: 'Personal', title: 'Personal details' },
  { label: 'Plan', title: 'Membership' },
  { label: 'Health', title: 'Health information' },
  { label: 'Family', title: 'Family' },
  { label: 'Review', title: 'App access & review' },
];

const SCREEN_BACKGROUND = BrandColors.screenBackground;

export function MemberFormScreen({
  mode,
  initialData,
  memberId,
  prefill,
  onSuccess,
}: MemberFormScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  // Errors stay hidden until the user tries to move on, so a fresh form isn't all red.
  const [showErrors, setShowErrors] = useState(false);
  const [furthestStep, setFurthestStep] = useState(mode === 'edit' ? STEPS.length : 1);

  const handleError = useCallback((error: Error) => {
    // API failures are already toasted (with the server's reason) by apiClient.
    if (error instanceof ApiError) return;
    toast.error('An error occurred. Please try again.', { title: 'Error' });
  }, []);

  const wizard = useMemberWizard({
    mode,
    initialData,
    memberId,
    prefill,
    onSuccess,
    onError: handleError,
  });

  const {
    step,
    totalSteps,
    data,
    stepErrors,
    validateStep,
    canGoNext,
    loading,
    updateField,
    goToStep,
    submit,
    addFamilyMember,
    removeFamilyMember,
  } = wizard;

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  // Every step change goes through here so error display and the furthest
  // reachable step stay in sync with navigation.
  const navigateTo = useCallback(
    (target: number, withErrors = false) => {
      goToStep(target);
      setShowErrors(withErrors);
      setFurthestStep((prev) => Math.max(prev, target));
    },
    [goToStep],
  );

  const handleKeepEditing = useCallback(() => setShowDiscardDialog(false), []);

  const handleDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/members');
    }
  }, [router]);

  // Android back: step back through the wizard, then confirm before leaving.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showPaymentSheet) return false;
      if (step > 1) {
        navigateTo(step - 1);
      } else {
        setShowDiscardDialog(true);
      }
      return true;
    });
    return () => sub.remove();
  }, [step, navigateTo, showPaymentSheet]);

  const warnInvalid = useCallback(() => {
    toast.warning('Please fix the highlighted fields to continue.');
  }, []);

  /** Jumps to the first step (up to `upTo`, exclusive) with errors. Returns true if one was found. */
  const goToFirstInvalidStep = useCallback(
    (upTo: number) => {
      for (let s = 1; s < upTo; s++) {
        if (Object.keys(validateStep(s)).length > 0) {
          navigateTo(s, true);
          warnInvalid();
          return true;
        }
      }
      return false;
    },
    [validateStep, navigateTo, warnInvalid],
  );

  const handleNext = useCallback(() => {
    if (!canGoNext) {
      setShowErrors(true);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      warnInvalid();
      return;
    }
    navigateTo(step + 1);
  }, [canGoNext, navigateTo, step, warnInvalid]);

  const handleSubmit = useCallback(() => {
    if (goToFirstInvalidStep(totalSteps + 1)) return;
    if (mode === 'create') {
      setShowPaymentSheet(true);
    } else {
      submit();
    }
  }, [goToFirstInvalidStep, totalSteps, mode, submit]);

  const handleStepPress = useCallback(
    (target: number) => {
      if (target === step) return;
      if (target < step) {
        navigateTo(target);
        return;
      }
      if (target > furthestStep) return;
      // Moving forward: every step in between has to be valid first.
      if (!goToFirstInvalidStep(target)) navigateTo(target);
    },
    [step, furthestStep, navigateTo, goToFirstInvalidStep],
  );

  const handlePaymentComplete = useCallback(
    async (result: PaymentResult) => {
      setShowPaymentSheet(false);
      await submit(result);
    },
    [submit],
  );

  const errors = showErrors ? stepErrors : undefined;
  const isFirst = step === 1;
  const isLast = step === totalSteps;

  const renderStep = () => {
    switch (step) {
      case 1:
        return <PersonalStep data={data} updateField={updateField} errors={errors} />;
      case 2:
        return (
          <MembershipStep
            data={data}
            updateField={updateField}
            errors={errors}
            showProcessedBy={mode === 'create'}
            allowPastDates={mode === 'edit'}
          />
        );
      case 3:
        return <MedicalStep data={data} updateField={updateField} errors={errors} />;
      case 4:
        return (
          <FamilyStep
            data={data}
            updateField={updateField}
            addFamilyMember={addFamilyMember}
            removeFamilyMember={removeFamilyMember}
          />
        );
      case 5:
        return (
          <AppAccessStep
            data={data}
            updateField={updateField}
            errors={errors}
            mode={mode}
            hasExistingLogin={mode === 'edit' && !!initialData?.appUsername}
            goToStep={navigateTo}
            validateStep={validateStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* iOS and Android (edge-to-edge, so no adjustResize) both need padding to lift the footer and last fields above the keyboard. */}
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Pressable
              onPress={() => setShowDiscardDialog(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close form"
              style={({ pressed }) => [
                styles.iconButton,
                { borderColor: theme.border },
                pressed && styles.pressed,
              ]}
            >
              <Feather name="x" size={20} color={theme.text} />
            </Pressable>

            <View style={styles.headerText}>
              <Typography variant="body" style={styles.headerTitle} numberOfLines={1}>
                {mode === 'create' ? 'New member' : 'Edit member'}
              </Typography>
              <Typography variant="caption" color="textSecondary" numberOfLines={1}>
                Step {step} of {totalSteps} · {STEPS[step - 1]?.title}
              </Typography>
            </View>

            {mode === 'edit' ? (
              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Save changes"
                style={({ pressed }) => [styles.saveLink, (pressed || loading) && styles.pressed]}
              >
                <Typography variant="bodySmallBold" style={{ color: theme.primary }}>
                  Save
                </Typography>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.stepper}>
            {STEPS.map((s, index) => {
              const n = index + 1;
              const active = n === step;
              const done = n < step;
              const reachable = n <= furthestStep;
              return (
                <Pressable
                  key={s.label}
                  onPress={() => handleStepPress(n)}
                  disabled={!reachable || active}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active, disabled: !reachable }}
                  accessibilityLabel={`Step ${n}: ${s.title}`}
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
                    {s.label}
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
              label={isFirst ? 'Cancel' : 'Back'}
              variant="outline"
              size="lg"
              onPress={isFirst ? () => setShowDiscardDialog(true) : () => navigateTo(step - 1)}
              style={styles.secondaryAction}
            />
            <Button
              label={
                isLast
                  ? mode === 'edit'
                    ? 'Save changes'
                    : 'Continue to payment'
                  : 'Next'
              }
              size="lg"
              loading={loading}
              onPress={isLast ? handleSubmit : handleNext}
              style={styles.primaryAction}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      <PaymentBottomSheet
        visible={showPaymentSheet}
        amount={parseFloat(data.membershipFee || '0')}
        title={data.membershipType || 'Membership Registration'}
        subtitle={data.name ? `Member: ${data.name}` : undefined}
        onClose={() => setShowPaymentSheet(false)}
        onComplete={handlePaymentComplete}
      />

      <Modal
        visible={showDiscardDialog}
        transparent
        animationType="fade"
        onRequestClose={handleKeepEditing}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIcon, { backgroundColor: 'rgba(212,24,61,0.10)' }]}>
              <Feather name="alert-triangle" size={22} color={theme.error} />
            </View>
            <Typography variant="body" style={styles.modalTitle}>
              Discard {mode === 'edit' ? 'changes' : 'this member'}?
            </Typography>
            <Typography variant="bodySmall" color="textSecondary" style={styles.modalText}>
              Everything you&apos;ve entered on this form will be lost.
            </Typography>

            <View style={styles.modalActions}>
              <Button
                label="Keep editing"
                variant="outline"
                onPress={handleKeepEditing}
                size="lg"
                style={styles.modalButton}
              />
              <Button
                label="Discard"
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
    backgroundColor: SCREEN_BACKGROUND,
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
