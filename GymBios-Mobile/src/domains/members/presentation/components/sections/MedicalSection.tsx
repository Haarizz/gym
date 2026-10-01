import { Typography } from '@/shared/components/Typography';
import type { Member } from '../../../domain/Member';
import { DetailCard, DetailField, DetailGrid } from './DetailCard';

interface MedicalSectionProps {
  member: Member;
}

export function MedicalSection({ member }: MedicalSectionProps) {
  const notes = [
    { label: 'Medical conditions', value: member.medicalConditions },
    { label: 'Chronic illnesses', value: member.chronicIllnesses },
    { label: 'Allergies', value: member.allergies },
    { label: 'Current medications', value: member.currentMedications },
    { label: 'Health notes', value: member.healthNotes },
  ].filter((n) => n.value);

  const hasVitals = member.bloodGroup || member.height || member.weight;

  return (
    <DetailCard title="Medical information" icon="heart">
      {!hasVitals && notes.length === 0 ? (
        <Typography variant="bodySmall" color="textSecondary">
          No medical information on file.
        </Typography>
      ) : (
        <DetailGrid>
          <DetailField label="Blood group" value={member.bloodGroup} />
          <DetailField label="Height" value={member.height} />
          <DetailField label="Weight" value={member.weight} />
          {notes.map((n) => (
            <DetailField key={n.label} label={n.label} value={n.value} full />
          ))}
        </DetailGrid>
      )}
    </DetailCard>
  );
}
