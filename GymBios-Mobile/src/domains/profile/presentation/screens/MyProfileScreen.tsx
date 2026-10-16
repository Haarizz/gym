import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { format, parseISO } from 'date-fns';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AvatarPicker } from '@/shared/components/AvatarPicker';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import { GlassBlob, GlassHeader, GlassSurface, InfoRow, DatePicker, Dropdown } from '@/shared/components';

import { useProfile } from '../../hooks/useProfile';
import { useMobileProfile } from '../../hooks/useMobileProfile';
import { useProfileMutations } from '../../hooks/useProfileMutations';
import { useStaffProfile } from '../../hooks/useStaffProfile';
import { getMaxBirthDate, getMinBirthDate } from '../../domain/dateOfBirthRules';
import {
  BODY_METRIC_MAX_LENGTH,
  sanitizeBodyMetricInput,
  validateHeight,
  validateWeight,
} from '../../domain/bodyMetricsRules';
import { validateEmergencyPhone } from '../../domain/contactRules';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { CertificationsCard, EmploymentCard, ScheduleCard } from '../components/StaffProfileSections';

import { toast } from '@/shared/components/Toasts/toastStore';

interface MyProfileScreenProps {
  onBack: () => void;
}


// Values are what the API stores (English); only the labels are translated.
const GENDER_OPTIONS = [
  { key: 'male', value: 'Male' },
  { key: 'female', value: 'Female' },
  { key: 'other', value: 'Other' },
  { key: 'preferNotToSay', value: 'Prefer not to say' },
] as const;

const NATIONALITY_OPTIONS = [
  { key: 'indian', value: 'Indian' },
  { key: 'emirati', value: 'Emirati' },
  { key: 'british', value: 'British' },
  { key: 'american', value: 'American' },
  { key: 'pakistani', value: 'Pakistani' },
  { key: 'bangladeshi', value: 'Bangladeshi' },
  { key: 'filipino', value: 'Filipino' },
  { key: 'egyptian', value: 'Egyptian' },
  { key: 'other', value: 'Other' },
] as const;

const BLOOD_TYPE_OPTIONS = [
  { label: 'O+', value: 'O+' },
  { label: 'O-', value: 'O-' },
  { label: 'A+', value: 'A+' },
  { label: 'A-', value: 'A-' },
  { label: 'B+', value: 'B+' },
  { label: 'B-', value: 'B-' },
  { label: 'AB+', value: 'AB+' },
  { label: 'AB-', value: 'AB-' },
];

export function MyProfileScreen({ onBack }: MyProfileScreenProps) {
  const { t } = useTranslation();
  const genderOptions = GENDER_OPTIONS.map(({ key, value }) => ({
    label: t(`profileCompletion.genders.${key}`),
    value,
  }));
  const nationalityOptions = NATIONALITY_OPTIONS.map(({ key, value }) => ({
    label: t(`profileCompletion.nationalities.${key}`),
    value,
  }));
  const optionLabel = (options: { label: string; value: string }[], value?: string | null) =>
    options.find((o) => o.value === value)?.label ?? value;
  const { profile } = useProfile();
  const {
    updateProfile,
    isUpdatingProfile,
    updatePhoto,
    changePassword,
    isChangingPassword,
  } = useProfileMutations();

  const [isEditing, setIsEditing] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedAddress, setEditedAddress] = useState('');

  const { profile: mobileProfile, updateProfile: updateMemberProfile, isUpdating: isUpdatingMemberProfile } = useMobileProfile();
  
  const isMember = profile?.role === 'MEMBER';

  // Staff/trainers linked to an employee record: that record (managed on the web
  // Staffs & Trainers page) drives the profile, and only phone/address are editable.
  const { staffProfile, updateContact, isUpdatingContact } = useStaffProfile(!!profile && !isMember);
  const isLinkedStaff = !isMember && !!staffProfile;

  const [editedDOB, setEditedDOB] = useState<Date | null>(null);
  const [editedGender, setEditedGender] = useState('');
  const [editedNationality, setEditedNationality] = useState('');
  const [editedMedicalConditions, setEditedMedicalConditions] = useState('');
  const [editedBloodType, setEditedBloodType] = useState('');
  const [editedAllergies, setEditedAllergies] = useState('');
  const [editedCurrentMedications, setEditedCurrentMedications] = useState('');
  const [editedChronicIllnesses, setEditedChronicIllnesses] = useState('');
  const [editedHeight, setEditedHeight] = useState('');
  const [editedWeight, setEditedWeight] = useState('');
  const [editedEmergencyContact, setEditedEmergencyContact] = useState('');
  const [editedEmergencyPhone, setEditedEmergencyPhone] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

const handleStartEdit = () => {
    setEditedName(profile?.name || '');
    setEditedEmail(profile?.email || '');
    setEditedPhone(profile?.phone || '');
    setEditedAddress(profile?.address || '');
    if (isMember) {
      setEditedDOB(mobileProfile?.dateOfBirth ? parseISO(mobileProfile.dateOfBirth) : null);
      setEditedGender(mobileProfile?.gender || '');
      setEditedNationality(mobileProfile?.nationality || '');
      setEditedMedicalConditions(mobileProfile?.medicalConditions || '');
      setEditedBloodType(mobileProfile?.bloodType || '');
      setEditedAllergies(mobileProfile?.allergies || '');
      setEditedCurrentMedications(mobileProfile?.currentMedications || '');
      setEditedChronicIllnesses(mobileProfile?.chronicIllnesses || '');
      setEditedHeight(mobileProfile?.height || '');
      setEditedWeight(mobileProfile?.weight || '');
      setEditedEmergencyContact(mobileProfile?.emergencyContact || '');
      setEditedEmergencyPhone(mobileProfile?.emergencyPhone || '');
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

const handleSaveProfile = async () => {
    if (isLinkedStaff) {
      try {
        await updateContact({ phone: editedPhone, address: editedAddress });
        setIsEditing(false);
        toast.success(t('myProfile.updated'), {
          title: t('myProfile.successTitle')
        });
      } catch (err: any) {
        toast.error(err?.message || t('myProfile.updateFailed'), {
          title: t('myProfile.errorTitle')
        });
      }
      return;
    }

    if (!editedName.trim() || !editedEmail.trim()) {
      toast.error(t('myProfile.nameEmailRequired'), {
        title: t('myProfile.validationTitle')
      });
      return;
    }

    const memberFieldError = isMember
      ? validateHeight(editedHeight) ??
        validateWeight(editedWeight) ??
        validateEmergencyPhone(editedEmergencyPhone, editedPhone)
      : null;
    if (memberFieldError) {
      toast.error(memberFieldError, { title: t('myProfile.validationTitle') });
      return;
    }

    try {
      if (isMember) {
        await updateMemberProfile({
          fullName: editedName.trim(),
          phone: editedPhone.trim(),
          address: editedAddress.trim(),
          dateOfBirth: editedDOB ? format(editedDOB, 'yyyy-MM-dd') : undefined,
          gender: editedGender,
          nationality: editedNationality,
          medicalConditions: editedMedicalConditions,
          bloodType: editedBloodType,
          allergies: editedAllergies,
          currentMedications: editedCurrentMedications,
          chronicIllnesses: editedChronicIllnesses,
          height: editedHeight.trim(),
          weight: editedWeight.trim(),
          emergencyContact: editedEmergencyContact,
          emergencyPhone: editedEmergencyPhone,
        }, {
            onSuccess: () => {
               // success
            }
        });
        // We also need to update the basic profile so email is synced if possible,
        // but updateMemberProfile handles basic details via /mobile/profile/me except email. Wait, email isn't in UpdateProfileRequestApiModel!
        // We should also call updateProfile for email if changed.
        await updateProfile({
          name: editedName.trim(),
          email: editedEmail.trim(),
          phone: editedPhone.trim(),
          address: editedAddress.trim(),
        });
      } else {
        await updateProfile({
          name: editedName.trim(),
          email: editedEmail.trim(),
          phone: editedPhone.trim(),
          address: editedAddress.trim(),
        });
      }
      setIsEditing(false);
      toast.success(t('myProfile.updated'), {
        title: t('myProfile.successTitle')
      });
    } catch (err: any) {
      toast.error(err?.message || t('myProfile.updateFailed'), {
        title: t('myProfile.errorTitle')
      });
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error(t('myProfile.currentPasswordRequired'), {
        title: t('myProfile.validationTitle')
      });
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      toast.error(t('myProfile.passwordTooShort'), {
        title: t('myProfile.validationTitle')
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('myProfile.passwordMismatch'), {
        title: t('myProfile.validationTitle')
      });
      return;
    }

    try {
      await changePassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success(t('myProfile.passwordChanged'), {
        title: t('myProfile.successTitle')
      });
    } catch (err: any) {
      toast.error(err?.message || t('myProfile.passwordChangeFailed'), {
        title: t('myProfile.errorTitle')
      });
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <GlassBlob color={BrandColors.teal} size={320} opacity={0.34} top={-40} right={-70} />
      <GlassBlob color={BrandColors.memberGold} size={280} opacity={0.26} top={380} left={-80} />
      <GlassBlob color={BrandColors.tealDark} size={240} opacity={0.2} top={800} right={-70} />

      <GlassHeader
        title={t('myProfile.title')}
        subtitle={t('myProfile.subtitle')}
        onBack={onBack}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Section with AvatarPicker */}
          <GlassSurface radius={Radius.lg} style={styles.avatarSection}>
            <AvatarPicker
              variant="compact"
              name={profile?.name || t('myProfile.userFallback')}
              photoUri={photoUri}
              photoUrl={profile?.photoUrl}
              onChangePhoto={async (uri) => {
                console.log('[MyProfileScreen] onChangePhoto called with', uri);
                setPhotoUri(uri);
                if (!uri) return;
                try {
                  await updatePhoto(uri);
                  console.log('[MyProfileScreen] updatePhoto resolved');
                } catch (err: any) {
                  console.error('[MyProfileScreen] updatePhoto threw', err);
                  toast.error(err?.message || t('myProfile.photoUploadFailed'), {
                    title: t('myProfile.errorTitle'),
                  });
                }
              }}
            />
            <View style={styles.avatarText}>
              <Typography variant="title" style={styles.profileName} numberOfLines={1}>
                {profile?.name}
              </Typography>
              <Typography variant="caption" color="textSecondary" style={styles.profileRole} numberOfLines={1}>
                {profile?.role}{profile?.department && !isMember ? ` · ${profile?.department}` : ''}
              </Typography>
            </View>
          </GlassSurface>

          {/* Personal Information Card */}
          <GlassSurface radius={Radius.lg} style={styles.card}>
            <View style={styles.cardHeader}>
              <Typography variant="subtitle" style={styles.cardTitle}>
                {t('myProfile.personalInfo')}
              </Typography>
              <Pressable
                onPress={isEditing ? handleCancelEdit : handleStartEdit}
                style={styles.editPill}
                accessibilityRole="button"
                accessibilityLabel={t(isEditing ? 'myProfile.cancelEditingA11y' : 'myProfile.editA11y')}
              >
                <Feather
                  name={isEditing ? 'x' : 'edit-2'}
                  size={12}
                  color={BrandColors.tealDark}
                  style={styles.editPillIcon}
                />
                <Typography variant="caption" style={styles.editPillText}>
                  {t(isEditing ? 'myProfile.cancel' : 'myProfile.edit')}
                </Typography>
              </Pressable>
            </View>

            {isEditing ? (
              <View style={styles.form}>
                {isLinkedStaff ? (
                  <Typography variant="caption" color="textSecondary">
                    {t('myProfile.managedByAdmin')}
                  </Typography>
                ) : (
                  <>
                    <Input
                      variant="glass"
                      label={t('myProfile.fullName')}
                      value={editedName}
                      onChangeText={setEditedName}
                      placeholder={t('myProfile.enterFullName')}
                    />

                    <Input
                      variant="glass"
                      label={t('myProfile.email')}
                      value={editedEmail}
                      onChangeText={setEditedEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder={t('myProfile.enterEmail')}
                    />
                  </>
                )}

                <Input
                  variant="glass"
                  label={t('myProfile.phone')}
                  value={editedPhone}
                  onChangeText={setEditedPhone}
                  keyboardType="phone-pad"
                  placeholder={t('myProfile.enterPhone')}
                />

                <View style={{ zIndex: 10 }}>
                  <AddressAutocomplete
                    label={t('myProfile.address')}
                    value={editedAddress}
                    onChange={setEditedAddress}
                  />
                </View>

                {isMember && (
                  <>
                    <View style={styles.field}>
                      <DatePicker
                        label={t('myProfile.dateOfBirth')}
                        placeholder={t('myProfile.selectDate')}
                        value={editedDOB || undefined}
                        onChange={(date: Date | null) => setEditedDOB(date)}
                        initialView="year"
                        minimumDate={getMinBirthDate()}
                        maximumDate={getMaxBirthDate()}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', gap: Spacing.three, zIndex: 9 }}>
                      <View style={{ flex: 1 }}>
                        <Dropdown
                          label={t('myProfile.gender')}
                          placeholder={t('myProfile.selectGender')}
                          value={editedGender}
                          options={genderOptions}
                          onChange={setEditedGender}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Dropdown
                          label={t('myProfile.nationality')}
                          placeholder={t('myProfile.selectCountry')}
                          value={editedNationality}
                          options={nationalityOptions}
                          onChange={setEditedNationality}
                        />
                      </View>
                    </View>
                  </>
                )}

                <Button
                  title={t('myProfile.saveChanges')}
                  variant="primary"
                  loading={isUpdatingProfile || isUpdatingContact}
                  onPress={handleSaveProfile}
                  style={styles.saveButton}
                />
              </View>
            ) : (
              <View>
                <InfoRow icon="user" label={t('myProfile.fullName')} value={profile?.name} divider={false} />
                <InfoRow icon="mail" label={t('myProfile.email')} value={profile?.email} />
                <InfoRow icon="phone" label={t('myProfile.phone')} value={profile?.phone} />
                <InfoRow icon="map-pin" label={t('myProfile.address')} value={profile?.address} />
                {isMember && mobileProfile && (
                  <>
                    <InfoRow icon="calendar" label={t('myProfile.dateOfBirth')} value={mobileProfile.dateOfBirth} />
                    <InfoRow icon="users" label={t('myProfile.gender')} value={optionLabel(genderOptions, mobileProfile.gender)} />
                    <InfoRow icon="flag" label={t('myProfile.nationality')} value={optionLabel(nationalityOptions, mobileProfile.nationality)} />
                  </>
                )}

              </View>
            )}
          </GlassSurface>

          {isLinkedStaff && staffProfile && (
            <>
              <EmploymentCard staff={staffProfile} />
              <CertificationsCard certifications={staffProfile.certifications} />
              <ScheduleCard schedule={staffProfile.schedule} />
            </>
          )}

          {/* Health Information Card */}
          {isMember && (
            <GlassSurface radius={Radius.lg} style={styles.card}>
              <View style={styles.cardHeader}>
                <Typography variant="subtitle" style={styles.cardTitle}>
                  {t('myProfile.healthInfo')}
                </Typography>
              </View>
              {isEditing ? (
                <View style={[styles.form, { zIndex: 8 }]}>
                  <Input
                    variant="glass"
                    label={t('myProfile.medicalConditions')}
                    value={editedMedicalConditions}
                    onChangeText={setEditedMedicalConditions}
                    placeholder="e.g. Asthma, Diabetes"
                  />
                  <Input
                    variant="glass"
                    label={t('myProfile.allergies')}
                    value={editedAllergies}
                    onChangeText={setEditedAllergies}
                    placeholder="e.g. Peanuts, Penicillin, Dust"
                  />
                  <Input
                    variant="glass"
                    label={t('myProfile.currentMedications')}
                    value={editedCurrentMedications}
                    onChangeText={setEditedCurrentMedications}
                    placeholder="e.g. Metformin 500mg"
                  />
                  <Input
                    variant="glass"
                    label={t('myProfile.chronicIllnesses')}
                    value={editedChronicIllnesses}
                    onChangeText={setEditedChronicIllnesses}
                    placeholder="e.g. Arthritis, COPD"
                  />
                  <View style={{ zIndex: 7 }}>
                    <Dropdown
                      label={t('myProfile.bloodType')}
                      placeholder={t('myProfile.selectBloodType')}
                      value={editedBloodType}
                      options={BLOOD_TYPE_OPTIONS}
                      onChange={setEditedBloodType}
                    />
                  </View>
                  <View style={styles.healthRow}>
                    <Input
                      variant="glass"
                      label={t('myProfile.heightCm')}
                      value={editedHeight}
                      onChangeText={(text) => setEditedHeight(sanitizeBodyMetricInput(text))}
                      keyboardType="decimal-pad"
                      maxLength={BODY_METRIC_MAX_LENGTH}
                      error={validateHeight(editedHeight) ?? undefined}
                      placeholder="170"
                      containerStyle={styles.healthRowItem}
                    />
                    <Input
                      variant="glass"
                      label={t('myProfile.weightKg')}
                      value={editedWeight}
                      onChangeText={(text) => setEditedWeight(sanitizeBodyMetricInput(text))}
                      keyboardType="decimal-pad"
                      maxLength={BODY_METRIC_MAX_LENGTH}
                      error={validateWeight(editedWeight) ?? undefined}
                      placeholder="70"
                      containerStyle={styles.healthRowItem}
                    />
                  </View>
                </View>
              ) : (
                <View>
                  <InfoRow icon="heart" label={t('myProfile.medicalConditions')} value={mobileProfile?.medicalConditions || t('myProfile.noneReported')} valueLines={0} divider={false} />
                  <InfoRow icon="alert-circle" label={t('myProfile.allergies')} value={mobileProfile?.allergies || t('myProfile.noneReported')} valueLines={0} />
                  <InfoRow icon="package" label={t('myProfile.currentMedications')} value={mobileProfile?.currentMedications || t('myProfile.noneReported')} valueLines={0} />
                  <InfoRow icon="activity" label={t('myProfile.chronicIllnesses')} value={mobileProfile?.chronicIllnesses || t('myProfile.noneReported')} valueLines={0} />
                  <InfoRow icon="droplet" label={t('myProfile.bloodType')} value={mobileProfile?.bloodType || t('myProfile.notSpecified')} />
                  <InfoRow icon="arrow-up" label={t('myProfile.height')} value={mobileProfile?.height ? t('myProfile.cmValue', { value: mobileProfile.height }) : t('myProfile.notSpecified')} />
                  <InfoRow icon="bar-chart-2" label={t('myProfile.weight')} value={mobileProfile?.weight ? t('myProfile.kgValue', { value: mobileProfile.weight }) : t('myProfile.notSpecified')} />
                </View>
              )}
            </GlassSurface>
          )}

          {/* Emergency Contact Card */}
          {isMember && (
            <GlassSurface radius={Radius.lg} style={styles.card}>
              <View style={styles.cardHeader}>
                <Typography variant="subtitle" style={styles.cardTitle}>
                  {t('myProfile.emergencyContact')}
                </Typography>
              </View>
              {isEditing ? (
                <View style={styles.form}>
                  <Input
                    variant="glass"
                    label={t('myProfile.contactName')}
                    value={editedEmergencyContact}
                    onChangeText={setEditedEmergencyContact}
                    placeholder={t('myProfile.enterFullName')}
                  />
                  <Input
                    variant="glass"
                    label={t('myProfile.contactNumber')}
                    value={editedEmergencyPhone}
                    onChangeText={setEditedEmergencyPhone}
                    keyboardType="phone-pad"
                    placeholder={t('myProfile.enterPhone')}
                    error={validateEmergencyPhone(editedEmergencyPhone, editedPhone) ?? undefined}
                  />
                </View>
              ) : (
                <View>
                  <InfoRow icon="shield" label={t('myProfile.contactName')} value={mobileProfile?.emergencyContact || t('myProfile.notSpecified')} divider={false} />
                  <InfoRow icon="phone" label={t('myProfile.contactNumber')} value={mobileProfile?.emergencyPhone || t('myProfile.notSpecified')} />
                </View>
              )}
            </GlassSurface>
          )}

          {/* Change Password Card */}
          <GlassSurface radius={Radius.lg} style={styles.card}>
            <View style={styles.cardHeader}>
              <Typography variant="subtitle" style={styles.cardTitle}>
                {t('myProfile.changePassword')}
              </Typography>
            </View>

            <View style={styles.form}>
              <Input
                variant="glass"
                label={t('myProfile.currentPassword')}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder={t('myProfile.enterCurrentPassword')}
              />

              <Input
                variant="glass"
                label={t('myProfile.newPassword')}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder={t('myProfile.enterNewPassword')}
              />

              <Input
                variant="glass"
                label={t('myProfile.confirmPassword')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder={t('myProfile.confirmPasswordPlaceholder')}
              />

              <Button
                title={t('myProfile.updatePassword')}
                variant="primary"
                loading={isChangingPassword}
                disabled={!currentPassword || !newPassword || !confirmPassword}
                onPress={handleChangePassword}
                style={styles.saveButton}
              />
            </View>
          </GlassSurface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    padding: Spacing.four,
  },
  avatarText: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  profileRole: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    padding: Spacing.four,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  form: {
    gap: Spacing.three,
  },
  healthRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  healthRowItem: {
    flex: 1,
  },
  field: {
    zIndex: 1,
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  editPillIcon: {
    marginEnd: 4,
  },
  editPillText: {
    color: BrandColors.tealDark,
    fontWeight: '700',
  },
  saveButton: {
    marginTop: Spacing.two,
  },
});
