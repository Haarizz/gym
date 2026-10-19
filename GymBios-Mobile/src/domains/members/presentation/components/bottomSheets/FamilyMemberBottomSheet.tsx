import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

import { Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Button } from '@/shared/components/Button';
import { DatePicker } from '@/shared/components/DatePicker';
import { Input } from '@/shared/components/Input';
import { getMaxBirthDate, getMinBirthDate } from '@/domains/profile/domain/dateOfBirthRules';
import type { AddFamilyMemberRequest } from '../../../application/family/MemberFamilyRepository';

interface FamilyMemberBottomSheetProps {
  visible: boolean;
  headId: number;
  onClose: () => void;
  onAdd: (headId: number, request: AddFamilyMemberRequest) => Promise<void>;
}

export function FamilyMemberBottomSheet({
  visible,
  headId,
  onClose,
  onAdd,
}: FamilyMemberBottomSheetProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [gender, setGender] = useState('');
  const [familyRole, setFamilyRole] = useState('ADULT');
  const [membershipType, setMembershipType] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [startDate, setStartDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const request: AddFamilyMemberRequest = {
      name,
      email,
      phone,
      dateOfBirth: dateOfBirth ? format(dateOfBirth, 'yyyy-MM-dd') : undefined,
      gender: gender || undefined,
      familyRole,
      membershipType,
      status,
      startDate,
    };

    try {
      setSubmitting(true);
      await onAdd(headId, request);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }, [
    name,
    email,
    phone,
    dateOfBirth,
    gender,
    familyRole,
    membershipType,
    status,
    startDate,
    headId,
    onAdd,
    onClose,
  ]);

  return (
    <AppBottomSheet
      visible={visible}
      title={t('members.familySheet.addTitle')}
      subtitle={t('members.familySheet.addSubtitle')}
      onClose={onClose}
    >
      <View style={styles.container}>
        <Input label={t('members.familySheet.fullNameLabel')} value={name} onChangeText={setName} placeholder={t('members.familySheet.fullNamePlaceholder')} />
        <Input label={t('members.familySheet.emailLabel')} value={email} onChangeText={setEmail} placeholder={t('members.familySheet.emailPlaceholder')} keyboardType="email-address" autoCapitalize="none" />
        <Input label={t('members.familySheet.phoneLabel')} value={phone} onChangeText={setPhone} placeholder={t('members.familySheet.phonePlaceholder')} keyboardType="phone-pad" />
        <DatePicker
          label={t('members.familySheet.dobLabel')}
          placeholder={t('members.familySheet.dobPlaceholder')}
          value={dateOfBirth}
          onChange={setDateOfBirth}
          initialView="year"
          minimumDate={getMinBirthDate()}
          maximumDate={getMaxBirthDate()}
        />
        <Input label={t('members.familySheet.genderLabel')} value={gender} onChangeText={setGender} placeholder={t('members.familySheet.genderPlaceholder')} />
        <Input label={t('members.familySheet.familyRoleLabel')} value={familyRole} onChangeText={setFamilyRole} placeholder={t('members.familySheet.familyRolePlaceholder')} />
        <Input label={t('members.familySheet.membershipTypeLabel')} value={membershipType} onChangeText={setMembershipType} placeholder={t('members.familySheet.membershipTypePlaceholder')} />
        <Input label={t('members.familySheet.statusLabel')} value={status} onChangeText={setStatus} placeholder={t('members.familySheet.statusPlaceholder')} />
        <Input label={t('members.familySheet.startDateLabel')} value={startDate} onChangeText={setStartDate} placeholder={t('members.familySheet.startDatePlaceholder')} />
        <Button
          label={t('members.familySheet.addBtn')}
          onPress={handleSubmit}
          loading={submitting}
          size="lg"
        />
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
});