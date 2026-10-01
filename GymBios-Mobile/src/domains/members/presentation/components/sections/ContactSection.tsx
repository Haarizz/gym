import type { Member } from '../../../domain/Member';
import { formatMemberDate, titleCase } from '../../utils/memberDisplay';
import { DetailCard, DetailField, DetailGrid } from './DetailCard';

interface ContactSectionProps {
  member: Member;
}

export function ContactSection({ member }: ContactSectionProps) {
  return (
    <DetailCard title="Contact information" icon="user">
      <DetailGrid>
        <DetailField label="Phone" value={member.phone} />
        <DetailField label="Gender" value={titleCase(member.gender)} />
        <DetailField label="Email" value={member.email} full />
        <DetailField
          label="Date of birth"
          value={member.dateOfBirth ? formatMemberDate(member.dateOfBirth) : undefined}
        />
        <DetailField
          label="Member since"
          value={member.createdAt ? formatMemberDate(member.createdAt) : undefined}
        />
        <DetailField label="Address" value={member.address} full />
      </DetailGrid>
    </DetailCard>
  );
}
