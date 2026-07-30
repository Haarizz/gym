import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';

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
  const theme = useTheme();

  return (
    <FormSection title="Certifications">
      {certifications.map((cert, index) => (
        <View key={index} style={[styles.certCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.certHeader}>
            <Typography variant="bodySmallBold">Certification {index + 1}</Typography>
            <Pressable
              hitSlop={8}
              onPress={() => onRemove(index)}
              style={styles.removeButton}
            >
              <Feather name="x" size={16} color={theme.error} />
            </Pressable>
          </View>
          <Input
            label="Certification Name"
            value={cert.certName}
            onChangeText={(value) => onChangeCert(index, 'certName', value)}
            placeholder="e.g. CPT"
          />
          <Input
            label="Issuer"
            value={cert.issuer}
            onChangeText={(value) => onChangeCert(index, 'issuer', value)}
            placeholder="e.g. ACE"
          />
          <Input
            label="Issue Date"
            value={cert.issueDate}
            onChangeText={(value) => onChangeCert(index, 'issueDate', value)}
            placeholder="YYYY-MM-DD"
          />
          <Input
            label="Expiry Date"
            value={cert.expiryDate}
            onChangeText={(value) => onChangeCert(index, 'expiryDate', value)}
            placeholder="YYYY-MM-DD"
          />
          <Input
            label="Document URL"
            value={cert.documentUrl}
            onChangeText={(value) => onChangeCert(index, 'documentUrl', value)}
            placeholder="URL to certificate"
            autoCapitalize="none"
          />
        </View>
      ))}
      <Button
        label="+ Add Certification"
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