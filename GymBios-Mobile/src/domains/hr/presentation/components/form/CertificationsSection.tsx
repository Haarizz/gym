import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';
import { Typography } from '@/shared/components/Typography';
import type { StaffCertification } from '@/domains/hr/domain/Staff';

interface CertificationsSectionProps {
  certifications: StaffCertification[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChangeCert: (index: number, field: keyof StaffCertification, value: string) => void;
}

export function CertificationsSection({
  certifications,
  onAdd,
  onRemove,
  onChangeCert,
}: CertificationsSectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <FormSection title={t('hr.certifications')}>
      {certifications.map((cert, index) => (
        <View key={index} style={[styles.certCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.certHeader}>
            <Typography variant="bodySmallBold">{t('hr.scheduleStep.certNumber', { number: index + 1 })}</Typography>
            <Pressable
              hitSlop={8}
              onPress={() => onRemove(index)}
              style={styles.removeButton}
            >
              <Feather name="x" size={16} color={theme.error} />
            </Pressable>
          </View>
          <Input
            label={t('hr.scheduleStep.certName')}
            value={cert.certName}
            onChangeText={(value) => onChangeCert(index, 'certName', value)}
            placeholder={t('hr.scheduleStep.certNamePlaceholder')}
          />
          <Input
            label={t('hr.scheduleStep.issuer')}
            value={cert.issuer}
            onChangeText={(value) => onChangeCert(index, 'issuer', value)}
            placeholder={t('hr.scheduleStep.issuerPlaceholder')}
          />
          <Input
            label={t('hr.scheduleStep.issued')}
            value={cert.issueDate}
            onChangeText={(value) => onChangeCert(index, 'issueDate', value)}
            placeholder={t('hr.datePlaceholder')}
          />
          <Input
            label={t('hr.scheduleStep.expires')}
            value={cert.expiryDate}
            onChangeText={(value) => onChangeCert(index, 'expiryDate', value)}
            placeholder={t('hr.datePlaceholder')}
          />
          <Input
            label={t('hr.scheduleStep.documentUrl')}
            value={cert.documentUrl}
            onChangeText={(value) => onChangeCert(index, 'documentUrl', value)}
            placeholder={t('hr.scheduleStep.documentUrlPlaceholder')}
            autoCapitalize="none"
          />
        </View>
      ))}
      <Button
        label={t('hr.scheduleStep.addCertification')}
        variant="secondary"
        onPress={onAdd}
      />
    </FormSection>
  );
}

const styles = StyleSheet.create({
  certCard: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  certHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  removeButton: {
    padding: Spacing.half,
  },
});