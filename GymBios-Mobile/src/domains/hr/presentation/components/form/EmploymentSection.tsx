import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';

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
  return (
    <FormSection title="Employment">
      <Input label="Role" value={role} onChangeText={onChangeRole} placeholder="e.g. Sales Manager" />
      <Input label="Department" value={department} onChangeText={onChangeDepartment} placeholder="e.g. Sales" />
      <Input label="Branch" value={branch} onChangeText={onChangeBranch} placeholder="e.g. Main Branch" />
      <Input label="Join Date" value={joinDate} onChangeText={onChangeJoinDate} placeholder="YYYY-MM-DD" />
      <Input label="Status" value={status} onChangeText={onChangeStatus} placeholder="e.g. ACTIVE" />
    </FormSection>
  );
}