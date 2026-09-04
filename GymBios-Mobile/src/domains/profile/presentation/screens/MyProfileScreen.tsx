import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { AvatarPicker } from '@/shared/components/AvatarPicker';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';

import { useProfile } from '../../hooks/useProfile';
import { useProfileMutations } from '../../hooks/useProfileMutations';
import { AddressAutocomplete } from '../components/AddressAutocomplete';

import { toast } from '@/shared/components/Toasts/toastStore';

interface MyProfileScreenProps {
  onBack: () => void;
}

export function MyProfileScreen({ onBack }: MyProfileScreenProps) {
  const { profile } = useProfile();
  const {
    updateProfile,
    isUpdatingProfile,
    updatePhoto,
    changePassword,
    isChangingPassword,
  } = useProfileMutations();

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedAddress, setEditedAddress] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const displayName = isEditing ? editedName : (profile?.name || '');
  const displayEmail = isEditing ? editedEmail : (profile?.email || '');
  const displayPhone = isEditing ? editedPhone : (profile?.phone || '');
  const displayAddress = isEditing ? editedAddress : (profile?.address || '');

  const handleStartEdit = () => {
    setEditedName(profile?.name || '');
    setEditedEmail(profile?.email || '');
    setEditedPhone(profile?.phone || '');
    setEditedAddress(profile?.address || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!editedName.trim() || !editedEmail.trim()) {
      toast.error('Name and email are required.', {
        title: 'Validation Error'
      });
      return;
    }

    try {
      await updateProfile({
        name: editedName.trim(),
        email: editedEmail.trim(),
        phone: editedPhone.trim(),
        address: editedAddress.trim(),
      });
      setIsEditing(false);
      toast.success('Profile updated successfully.', {
        title: 'Success'
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile.', {
        title: 'Error'
      });
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('Please enter your current password.', {
        title: 'Validation Error'
      });
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.', {
        title: 'Validation Error'
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match.', {
        title: 'Validation Error'
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
      toast.success('Password changed successfully.', {
        title: 'Success'
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to change password.', {
        title: 'Error'
      });
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <AppHeader
        title="My Profile"
        subtitle="Manage your personal details & credentials"
        colors={[BrandColors.teal, BrandColors.tealDark]}
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
          <View style={styles.avatarSection}>
            <AvatarPicker
              name={displayName || 'User'}
              photoUrl={profile?.photoUrl}
              onChangePhoto={async (uri) => {
                if (uri) {
                  await updatePhoto(uri);
                }
              }}
            />
            <Typography variant="title" style={styles.profileName}>
              {profile?.name}
            </Typography>
            <Typography variant="bodySmall" color="textSecondary">
              {profile?.role} · {profile?.department}
            </Typography>
          </View>

          {/* Personal Information Card */}
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Typography variant="subtitle" style={styles.cardTitle}>
                Personal Information
              </Typography>
              <Button
                size="md"
                variant={isEditing ? 'outline' : 'secondary'}
                title={isEditing ? 'Cancel' : 'Edit'}
                onPress={() => {
                  if (isEditing) {
                    handleCancelEdit();
                  } else {
                    handleStartEdit();
                  }
                }}
              />
            </View>

            <View style={styles.form}>
              <Input
                label="Full Name"
                value={displayName}
                onChangeText={setEditedName}
                editable={isEditing}
                placeholder="Enter full name"
              />

              <Input
                label="Email Address"
                value={displayEmail}
                onChangeText={setEditedEmail}
                editable={isEditing}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Enter email address"
              />

              <Input
                label="Phone Number"
                value={displayPhone}
                onChangeText={setEditedPhone}
                editable={isEditing}
                keyboardType="phone-pad"
                placeholder="Enter phone number"
              />

              {isEditing ? (
                <View style={{ zIndex: 10 }}>
                  <AddressAutocomplete
                    label="Address"
                    value={editedAddress}
                    onChange={setEditedAddress}
                  />
                </View>
              ) : (
                <Input
                  label="Address"
                  value={displayAddress}
                  editable={false}
                  placeholder="Enter address"
                />
              )}

              {profile?.staffId && (
                <View style={styles.readOnlyRow}>
                  <View style={styles.readOnlyItem}>
                    <Typography variant="caption" color="textSecondary">
                      Employee ID
                    </Typography>
                    <Typography variant="body" style={styles.readOnlyValue}>
                      {profile.staffId}
                    </Typography>
                  </View>
                  <View style={styles.readOnlyItem}>
                    <Typography variant="caption" color="textSecondary">
                      Join Date
                    </Typography>
                    <Typography variant="body" style={styles.readOnlyValue}>
                      {profile.joinDate || '—'}
                    </Typography>
                  </View>
                </View>
              )}

              {isEditing && (
                <Button
                  title="Save Changes"
                  variant="primary"
                  loading={isUpdatingProfile}
                  onPress={handleSaveProfile}
                  style={styles.saveButton}
                />
              )}
            </View>
          </Card>

          {/* Change Password Card */}
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Typography variant="subtitle" style={styles.cardTitle}>
                Change Password
              </Typography>
            </View>

            <View style={styles.form}>
              <Input
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Enter current password"
              />

              <Input
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Enter new password (min. 8 chars)"
              />

              <Input
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Confirm new password"
              />

              <Button
                title="Update Password"
                variant="primary"
                loading={isChangingPassword}
                disabled={!currentPassword || !newPassword || !confirmPassword}
                onPress={handleChangePassword}
                style={styles.saveButton}
              />
            </View>
          </Card>
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
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginTop: Spacing.two,
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
  readOnlyRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  readOnlyItem: {
    flex: 1,
  },
  readOnlyValue: {
    fontWeight: '600',
    marginTop: 2,
  },
  saveButton: {
    marginTop: Spacing.two,
  },
});
