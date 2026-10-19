import { useTranslation } from 'react-i18next';
import type { Member } from '../../../domain/Member';
import { formatMemberDate, titleCase } from '../../utils/memberDisplay';
import { DetailCard, DetailField, DetailGrid } from './DetailCard';

interface ContactSectionProps {
  member: Member;
}

export function ContactSection({ member }: ContactSectionProps) {
  const { t } = useTranslation();
  return (
    <DetailCard title={t('members.contactSection.title')} icon="user">
      <DetailGrid>
        <DetailField label={t('members.contactSection.phone')} value={member.phone} />
        <DetailField label={t('members.contactSection.gender')} value={titleCase(member.gender)} />
        <DetailField label={t('members.contactSection.email')} value={member.email} full />
        <DetailField
          label={t('members.contactSection.dateOfBirth')}
          value={member.dateOfBirth ? formatMemberDate(member.dateOfBirth) : undefined}
        />
        <DetailField
          label={t('members.contactSection.memberSince')}
          value={member.createdAt ? formatMemberDate(member.createdAt) : undefined}
        />
        <DetailField label={t('members.contactSection.address')} value={member.address} full />
      </DetailGrid>
    </DetailCard>
  );
}
