import { useTranslation } from 'react-i18next';
import { Typography } from '@/shared/components/Typography';
import type { Member } from '../../../domain/Member';
import { DetailCard, DetailField, DetailGrid } from './DetailCard';

interface MedicalSectionProps {
  member: Member;
}

export function MedicalSection({ member }: MedicalSectionProps) {
  const { t } = useTranslation();
  const notes = [
    { label: t('members.medicalSection.conditions'), value: member.medicalConditions },
    { label: t('members.medicalSection.chronicIllnesses'), value: member.chronicIllnesses },
    { label: t('members.medicalSection.allergies'), value: member.allergies },
    { label: t('members.medicalSection.currentMedications'), value: member.currentMedications },
    { label: t('members.medicalSection.healthNotes'), value: member.healthNotes },
  ].filter((n) => n.value);

  const hasVitals = member.bloodGroup || member.height || member.weight;

  return (
    <DetailCard title={t('members.medicalSection.title')} icon="heart">
      {!hasVitals && notes.length === 0 ? (
        <Typography variant="bodySmall" color="textSecondary">
          {t('members.medicalSection.noInfo')}
        </Typography>
      ) : (
        <DetailGrid>
          <DetailField label={t('members.medicalSection.bloodGroup')} value={member.bloodGroup} />
          <DetailField label={t('members.medicalSection.height')} value={member.height} />
          <DetailField label={t('members.medicalSection.weight')} value={member.weight} />
          {notes.map((n) => (
            <DetailField key={n.label} label={n.label} value={n.value} full />
          ))}
        </DetailGrid>
      )}
    </DetailCard>
  );
}
