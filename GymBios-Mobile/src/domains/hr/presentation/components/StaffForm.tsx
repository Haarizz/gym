import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { AppAccessSection } from './form/AppAccessSection';
import { CertificationsSection } from './form/CertificationsSection';
import { CompensationSection } from './form/CompensationSection';
import { EmploymentSection } from './form/EmploymentSection';
import { PersonalInfoSection } from './form/PersonalInfoSection';
import { ScheduleSection } from './form/ScheduleSection';
import type { Staff, StaffCertification, WeeklySchedule } from '../../domain/Staff';

export interface StaffFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  photoUrl: string;
  role: string;
  department: string;
  branch: string;
  joinDate: string;
  status: string;
  salary: string;
  monthlyTarget: string;
  certifications: StaffCertification[];
  schedule: WeeklySchedule;
  username: string;
  password: string;
  appAccessEnabled: boolean;
}

export interface StaffFormRef {
  getData: () => StaffFormData;
}

interface StaffFormProps {
  initialData?: Staff;
  children?: React.ReactNode;
}

function mapStaffToFormData(staff?: Staff): StaffFormData {
  return {
    name: staff?.name ?? '',
    email: staff?.email ?? '',
    phone: staff?.phone ?? '',
    address: staff?.address ?? '',
    photoUrl: staff?.photoUrl ?? '',
    role: staff?.role ?? '',
    department: staff?.department ?? '',
    branch: staff?.branch ?? '',
    joinDate: staff?.joinDate ?? '',
    status: staff?.status ?? '',
    salary: staff?.baseSalary ? String(staff.baseSalary) : '',
    monthlyTarget: staff?.monthlyTarget ? String(staff.monthlyTarget) : '',
    certifications: staff?.certifications ?? [],
    schedule: staff?.schedule ?? {},
    username: staff?.appUsername ?? '',
    password: '',
    appAccessEnabled: staff?.appAccessEnabled ?? false,
  };
}

export const StaffForm = forwardRef<StaffFormRef, StaffFormProps>(
  function StaffForm({ initialData, children }, ref) {
    const [formData, setFormData] = useState<StaffFormData>(() =>
      mapStaffToFormData(initialData),
    );

    useImperativeHandle(ref, () => ({
      getData: () => formData,
    }));

    const updateField = useCallback(
      <K extends keyof StaffFormData>(field: K, value: StaffFormData[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
      },
      [],
    );

    const addCertification = useCallback(() => {
      const newCert: StaffCertification = {
        certName: '',
        issuer: '',
        issueDate: '',
        expiryDate: '',
        documentUrl: '',
      };
      updateField('certifications', [...formData.certifications, newCert]);
    }, [formData.certifications, updateField]);

    const removeCertification = useCallback(
      (index: number) => {
        const updated = formData.certifications.filter((_, i) => i !== index);
        updateField('certifications', updated);
      },
      [formData.certifications, updateField],
    );

    const onChangeCert = useCallback(
      (index: number, field: keyof StaffCertification, value: string) => {
        const updated = formData.certifications.map((cert, i) =>
          i === index ? { ...cert, [field]: value } : cert,
        );
        updateField('certifications', updated);
      },
      [formData.certifications, updateField],
    );

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <PersonalInfoSection
            name={formData.name}
            email={formData.email}
            phone={formData.phone}
            address={formData.address}
            photoUrl={formData.photoUrl}
            onChangeName={(v) => updateField('name', v)}
            onChangeEmail={(v) => updateField('email', v)}
            onChangePhone={(v) => updateField('phone', v)}
            onChangeAddress={(v) => updateField('address', v)}
            onChangePhotoUrl={(v) => updateField('photoUrl', v)}
          />

          <EmploymentSection
            role={formData.role}
            department={formData.department}
            branch={formData.branch}
            joinDate={formData.joinDate}
            status={formData.status}
            onChangeRole={(v) => updateField('role', v)}
            onChangeDepartment={(v) => updateField('department', v)}
            onChangeBranch={(v) => updateField('branch', v)}
            onChangeJoinDate={(v) => updateField('joinDate', v)}
            onChangeStatus={(v) => updateField('status', v)}
          />

          <CompensationSection
            salary={formData.salary}
            monthlyTarget={formData.monthlyTarget}
            onChangeSalary={(v) => updateField('salary', v)}
            onChangeMonthlyTarget={(v) => updateField('monthlyTarget', v)}
          />

          <CertificationsSection
            certifications={formData.certifications}
            onAdd={addCertification}
            onRemove={removeCertification}
            onChangeCert={onChangeCert}
          />

          <ScheduleSection
            schedule={formData.schedule}
            onChange={(v) => updateField('schedule', v)}
          />

          <AppAccessSection
            username={formData.username}
            password={formData.password}
            appAccessEnabled={formData.appAccessEnabled}
            onChangeUsername={(v) => updateField('username', v)}
            onChangePassword={(v) => updateField('password', v)}
            onChangeAppAccess={(v) => updateField('appAccessEnabled', v)}
          />

          {children}
        </View>
      </ScrollView>
    );
  },
);

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
});