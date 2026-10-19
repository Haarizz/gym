import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  return (
    <FormSection title={t('hr.compensation.title')}>
      <Input
        label={t('hr.compensation.baseSalary')}
        value={salary}
        onChangeText={onChangeSalary}
        placeholder="0"
        keyboardType="numeric"
      />
      <Input
        label={t('hr.compensation.monthlyTarget')}
        value={monthlyTarget}
        onChangeText={onChangeMonthlyTarget}
        placeholder="0"
        keyboardType="numeric"
      />
    </FormSection>
  );
}