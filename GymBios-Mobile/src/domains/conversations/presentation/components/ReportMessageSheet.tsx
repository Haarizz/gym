import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Feather from '@expo/vector-icons/Feather';
import { Text, TextInput } from '@/shared/components/AppText';
import { AppBottomSheet, Button } from '@/shared/components';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';
import { REPORT_DETAILS_MAX_LENGTH, REPORT_REASONS, type ReportReason } from '../../domain/types';

interface ReportMessageSheetProps {
  visible: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, details: string) => void;
}

export function ReportMessageSheet({ visible, submitting, onClose, onSubmit }: ReportMessageSheetProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');

  // Each time the sheet opens, start a fresh report.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setReason(null);
      setDetails('');
    }
  }

  const submit = () => {
    if (!reason) return;
    onSubmit(reason, details);
  };

  return (
    <AppBottomSheet
      visible={visible}
      title={t('conversations.report.title')}
      subtitle={t('conversations.report.subtitle')}
      onClose={onClose}
      footer={
        <Button
          title={t('conversations.report.submit')}
          onPress={submit}
          disabled={!reason || submitting}
          loading={submitting}
        />
      }
    >
      <Text style={styles.label}>{t('conversations.report.reasonLabel')}</Text>
      <View style={styles.reasons}>
        {REPORT_REASONS.map((r) => {
          const selected = r === reason;
          return (
            <Pressable
              key={r}
              onPress={() => setReason(r)}
              style={[styles.reason, selected && styles.reasonSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <Feather name="check" size={12} color="#FFFFFF" />}
              </View>
              <Text style={styles.reasonText}>{t(`conversations.report.reasons.${r}`)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.label}>{t('conversations.report.detailsLabel')}</Text>
      <TextInput
        value={details}
        onChangeText={setDetails}
        placeholder={t('conversations.report.detailsPlaceholder')}
        placeholderTextColor={BrandColors.textSecondary}
        style={styles.details}
        multiline
        maxLength={REPORT_DETAILS_MAX_LENGTH}
      />
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    marginBottom: Spacing.two,
    marginTop: Spacing.two,
  },
  reasons: {
    gap: Spacing.two,
  },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(30,41,59,0.1)',
    backgroundColor: '#FFFFFF',
  },
  reasonSelected: {
    borderColor: BrandColors.danger,
    backgroundColor: '#FEF2F2',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(30,41,59,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: BrandColors.danger,
    backgroundColor: BrandColors.danger,
  },
  reasonText: {
    flex: 1,
    fontSize: TypographyScale.body,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  details: {
    minHeight: 80,
    textAlignVertical: 'top',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(30,41,59,0.1)',
    padding: 12,
    fontSize: TypographyScale.body,
    color: BrandColors.textPrimary,
    backgroundColor: '#FFFFFF',
  },
});
