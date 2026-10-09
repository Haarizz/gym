import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { format } from 'date-fns';

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
      title="Add Family Member"
      subtitle="Add an adult or minor to this family"
      onClose={onClose}
    >
      <View style={styles.container}>
        <Input label="Full Name" value={name} onChangeText={setName} placeholder="Enter full name" />
        <Input label="Email" value={email} onChangeText={setEmail} placeholder="Enter email" keyboardType="email-address" autoCapitalize="none" />
        <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="Enter phone" keyboardType="phone-pad" />
        <DatePicker
          label="Date of Birth"
          placeholder="Select date of birth"
          value={dateOfBirth}
          onChange={setDateOfBirth}
          initialView="year"
          minimumDate={getMinBirthDate()}
          maximumDate={getMaxBirthDate()}
        />
        <Input label="Gender" value={gender} onChangeText={setGender} placeholder="e.g. Male, Female" />
        <Input label="Family Role" value={familyRole} onChangeText={setFamilyRole} placeholder="ADULT or MINOR" />
        <Input label="Membership Type" value={membershipType} onChangeText={setMembershipType} placeholder="e.g. FAMILY" />
        <Input label="Status" value={status} onChangeText={setStatus} placeholder="e.g. ACTIVE" />
        <Input label="Start Date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
        <Button
          label="Add Family Member"
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