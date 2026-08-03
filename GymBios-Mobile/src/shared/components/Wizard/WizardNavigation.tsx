import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';

export interface WizardNavigationProps {
  isFirst: boolean;
  isLast: boolean;
  loading: boolean;
  canProceed: boolean;
  onCancel: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
  mode: 'create' | 'edit';
  submitLabelOverride?: string;
}

export function WizardNavigation({
  isFirst,
  isLast,
  loading,
  canProceed,
  onCancel,
  onNext,
  onPrevious,
  onSubmit,
  mode,
  submitLabelOverride,
}: WizardNavigationProps) {
  const submitLabel =
    submitLabelOverride ??
    (mode === 'edit' ? 'Save Changes' : 'Create Staff');

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.buttonWrapper}>
          {isFirst ? (
            <Button
              label="Cancel"
              variant="secondary"
              onPress={onCancel}
              size="lg"
              style={styles.button}
            />
          ) : (
            <Button
              label="Back"
              variant="secondary"
              onPress={onPrevious}
              size="lg"
              style={styles.button}
            />
          )}
        </View>

        <View style={styles.spacer} />

        <View style={styles.buttonWrapper}>
          {isLast ? (
            <Button
              label={submitLabel}
              onPress={onSubmit}
              loading={loading}
              disabled={!canProceed}
              size="lg"
              style={styles.button}
            />
          ) : (
            <Button
              label="Next"
              onPress={onNext}
              disabled={!canProceed}
              size="lg"
              style={styles.button}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonWrapper: {
    flex: 1,
  },
  button: {
    width: '100%',
  },
  spacer: {
    width: Spacing.three,
  },
});
