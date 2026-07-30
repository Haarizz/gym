import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';

interface CompensationSectionProps {
  salary: string;
  monthlyTarget: string;
  onChangeSalary: (value: string) => void;
  onChangeMonthlyTarget: (value: string) => void;
}

export function CompensationSection({
  salary,
  monthlyTarget,
  onChangeSalary,
  onChangeMonthlyTarget,
}: CompensationSectionProps) {
  return (
    <FormSection title="Compensation">
      <Input
        label="Base Salary"
        value={salary}
        onChangeText={onChangeSalary}
        placeholder="0"
        keyboardType="numeric"
      />
      <Input
        label="Monthly Target"
        value={monthlyTarget}
        onChangeText={onChangeMonthlyTarget}
        placeholder="0"
        keyboardType="numeric"
      />
    </FormSection>
  );
}