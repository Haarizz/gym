import { useCallback, useRef } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { StaffForm, type StaffFormRef } from '../components/StaffForm';
import { useStaff } from '../hooks/useStaff';
import type { CreateStaffRequest } from '../../application/StaffRepository';

interface CreateStaffScreenProps {
  onSuccess: () => void;
}

export function CreateStaffScreen({ onSuccess }: CreateStaffScreenProps) {
  const formRef = useRef<StaffFormRef>(null);
  const { createStaff, submitting } = useStaff();

  const handleSubmit = useCallback(async () => {
    const formData = formRef.current?.getData();
    if (!formData) return;

    try {
      const request: CreateStaffRequest = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        photoUrl: formData.photoUrl || undefined,
        role: formData.role,
        department: formData.department,
        branch: formData.branch,
        joinDate: formData.joinDate,
        status: formData.status,
        baseSalary: Number(formData.salary) || 0,
        monthlyTarget: Number(formData.monthlyTarget) || 0,
        certifications: formData.certifications,
        schedule: formData.schedule,
        appUsername: formData.appAccessEnabled ? formData.username : undefined,
        appPassword: formData.appAccessEnabled ? formData.password : undefined,
      };

      await createStaff(request);
      onSuccess();
    } catch (err) {
      Alert.alert('Error', 'Failed to create staff member. Please try again.');
    }
  }, [createStaff, onSuccess]);

  return (
    <ScreenLayout>
      <StaffForm
        ref={formRef}
      >
        <View style={styles.footer}>
          <Button
            label="Create Staff"
            onPress={handleSubmit}
            loading={submitting}
            size="lg"
          />
        </View>
      </StaffForm>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  footer: {
    padding: Spacing.four,
    paddingTop: 0,
  },
});