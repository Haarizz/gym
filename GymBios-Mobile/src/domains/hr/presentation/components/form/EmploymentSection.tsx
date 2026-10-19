import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/components/Input';
import { Dropdown } from '@/shared/components/Dropdown';
import { FormSection } from '@/shared/components/FormSection';
import { useAllBranches } from '@/domains/branch';

interface EmploymentSectionProps {
  role: string;
  department: string;
  branch: string;
  joinDate: string;
  status: string;
  onChangeRole: (value: string) => void;
  onChangeDepartment: (value: string) => void;
  onChangeBranch: (value: string) => void;
  onChangeJoinDate: (value: string) => void;
  onChangeStatus: (value: string) => void;
}

export function EmploymentSection({
  role,
  department,
  branch,
  joinDate,
  status,
  onChangeRole,
  onChangeDepartment,
  onChangeBranch,
  onChangeJoinDate,
  onChangeStatus,
}: EmploymentSectionProps) {
  const { t } = useTranslation();
  const { data: branchData } = useAllBranches();
  const branchOptions = branchData ? branchData.map((b) => ({ label: b.branch_name, value: b.branch_name })) : [];

  return (
    <FormSection title={t('hr.step.jobTitle')}>
      <Input label={t('hr.employment.role')} value={role} onChangeText={onChangeRole} placeholder={t('hr.employment.selectRole')} />
      <Input label={t('hr.employment.department')} value={department} onChangeText={onChangeDepartment} placeholder={t('hr.employment.selectDepartment')} />
      <Dropdown
        label={t('hr.employment.branch')}
        value={branch}
        options={branchOptions}
        onChange={(v) => onChangeBranch(v)}
        placeholder={t('hr.employment.selectBranch')}
      />
      <Input label={t('hr.joinDate')} value={joinDate} onChangeText={onChangeJoinDate} placeholder={t('hr.datePlaceholder')} />
      <Input label={t('hr.employment.status')} value={status} onChangeText={onChangeStatus} placeholder={t('hr.employment.statusPlaceholder')} />
    </FormSection>
  );
}